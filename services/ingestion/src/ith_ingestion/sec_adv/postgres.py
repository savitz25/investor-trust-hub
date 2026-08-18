from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from ith_ingestion.errors import PublishError
from ith_ingestion.sec_adv import SOURCE_AUTHORITY_ID, SOURCE_SYSTEM_ID, TRANSFORM_VERSION
from ith_ingestion.sec_adv.identifiers import firm_slug_for_crd
from ith_ingestion.sec_adv.models import NormalizedFirm, QuarantineItem
from ith_ingestion.sec_adv.store import PublishCounts

DATASET_IDS = {"ria": "sec_ia_ria", "era": "sec_ia_era"}


def _country_code(value: str | None) -> str:
    if not value:
        return "US"
    text = value.strip()
    if len(text) == 2:
        return text.upper()
    lowered = text.lower()
    if lowered in {"united states", "usa", "u.s.", "u.s.a.", "united states of america"}:
        return "US"
    return "ZZ"


def _connect(dsn: str):
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover
        raise PublishError("psycopg is required for --publish against PostgreSQL") from exc
    return psycopg.connect(dsn, connect_timeout=20)


class PostgresCanonicalStore:
    def __init__(self, dsn: str | None = None) -> None:
        self.dsn = dsn or os.environ.get("DATABASE_URL") or os.environ.get("INGESTION_DATABASE_URL")
        if not self.dsn:
            raise PublishError("DATABASE_URL / INGESTION_DATABASE_URL is not set")
        self._run_id: str | None = None

    def already_published(self, idempotency_key: str) -> bool:
        with _connect(self.dsn) as conn:
            row = conn.execute(
                "SELECT 1 FROM ingestion_runs WHERE idempotency_key = %s AND status = 'published'",
                (idempotency_key,),
            ).fetchone()
            return row is not None

    def mark_published(self, idempotency_key: str) -> None:
        del idempotency_key

    def rollback(self, idempotency_key: str) -> None:
        with _connect(self.dsn) as conn:
            conn.execute(
                "UPDATE ingestion_runs SET status = 'rolled_back', finished_at = now() WHERE idempotency_key = %s",
                (idempotency_key,),
            )
            conn.commit()

    def firm_count(self) -> int:
        with _connect(self.dsn) as conn:
            return int(conn.execute("SELECT count(*) FROM firms WHERE is_synthetic = false").fetchone()[0])

    def identifier_count(self) -> int:
        with _connect(self.dsn) as conn:
            return int(conn.execute("SELECT count(*) FROM firm_identifiers").fetchone()[0])

    def snapshot_count(self) -> int:
        with _connect(self.dsn) as conn:
            return int(conn.execute("SELECT count(*) FROM source_snapshots").fetchone()[0])

    def publish(
        self,
        *,
        release_label: str,
        firms: list[NormalizedFirm],
        quarantine: list[QuarantineItem],
        synthetic: bool,
    ) -> PublishCounts:
        counts = PublishCounts(quarantined=len(quarantine))
        run_id = str(uuid4())
        self._run_id = run_id
        now = datetime.now(UTC)
        with _connect(self.dsn) as conn:
            try:
                with conn.transaction():
                    self._ensure_run(conn, run_id, release_label)
                    release_ids = self._ensure_releases(conn, release_label, firms, now)
                    existing = {
                        row[0]: row[1]
                        for row in conn.execute(
                            "SELECT fi.identifier_value, fi.firm_id FROM firm_identifiers fi WHERE fi.identifier_type = 'crd'"
                        )
                    }
                    previous = set(existing)
                    observed: set[str] = set()
                    for firm in firms:
                        observed.add(firm.crd)
                        firm_id, inserted = self._upsert_firm(conn, firm, existing, synthetic, now)
                        if inserted:
                            counts.firms_inserted += 1
                        else:
                            counts.firms_updated += 1
                        counts.identifiers_created += self._upsert_identifiers(conn, firm_id, firm)
                        counts.registrations_upserted += self._upsert_registration(conn, firm_id, firm)
                        counts.locations_upserted += self._upsert_location(conn, firm_id, firm)
                        counts.facts_upserted += self._upsert_facts(
                            conn, firm_id, firm, release_ids[firm.dataset_kind], synthetic
                        )
                        created_ev = self._upsert_evidence(
                            conn, run_id, firm_id, firm, release_ids[firm.dataset_kind], now
                        )
                        counts.evidence_created += created_ev
                        counts.snapshots_created += self._upsert_snapshot(
                            conn, firm_id, firm, release_ids[firm.dataset_kind], now
                        )
                        counts.observations_created += self._observe(
                            conn, firm_id, firm, release_ids[firm.dataset_kind], True
                        )
                        counts.search_documents_upserted += self._upsert_search(conn, firm_id, firm, synthetic)
                    missing_release = next(iter(release_ids.values()))
                    for crd in previous - observed:
                        firm_id = existing.get(crd)
                        if not firm_id:
                            continue
                        counts.not_observed += 1
                        counts.observations_created += self._observe_missing(
                            conn, firm_id, missing_release
                        )
                    self._write_quarantine(conn, run_id, quarantine)
                    conn.execute(
                        "UPDATE ingestion_runs SET status = 'published', finished_at = now(), metrics = %s WHERE id = %s",
                        (json.dumps(counts.as_dict()), run_id),
                    )
            except Exception as exc:
                raise PublishError(str(exc)) from exc
        return counts

    def _ensure_run(self, conn: Any, run_id: str, release_label: str) -> None:
        conn.execute(
            """
            INSERT INTO ingestion_runs (
                id, pipeline_name, pipeline_version, transform_version, status, idempotency_key, started_at
            ) VALUES (%s, 'sec-adv', '0.2.0', %s, 'publishing', %s, now())
            ON CONFLICT (idempotency_key) DO UPDATE SET status = 'publishing', started_at = now()
            """,
            (run_id, TRANSFORM_VERSION, f"sec-adv:{release_label}:{TRANSFORM_VERSION}"),
        )

    def _ensure_releases(self, conn: Any, release_label: str, firms: list[NormalizedFirm], now: datetime) -> dict[str, str]:
        ids: dict[str, str] = {}
        for kind in {firm.dataset_kind for firm in firms} or {"ria", "era"}:
            row = conn.execute(
                """
                INSERT INTO source_releases (source_dataset_id, release_label, retrieved_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (source_dataset_id, release_label)
                DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at
                RETURNING id
                """,
                (DATASET_IDS[kind], release_label, now),
            ).fetchone()
            ids[kind] = str(row[0])
        return ids

    def _upsert_firm(
        self,
        conn: Any,
        firm: NormalizedFirm,
        existing: dict[str, Any],
        synthetic: bool,
        now: datetime,
    ) -> tuple[str, bool]:
        if firm.crd in existing:
            firm_id = str(existing[firm.crd])
            conn.execute(
                """
                UPDATE firms
                SET legal_name = %s,
                    display_name = %s,
                    firm_kinds = (
                        SELECT ARRAY(SELECT DISTINCT unnest(firm_kinds || %s::text[]))
                    ),
                    current_as_of = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (firm.legal_name, firm.display_name, [firm.registration_type], now, firm_id),
            )
            return firm_id, False
        firm_id = str(uuid4())
        conn.execute(
            """
            INSERT INTO firms (id, slug, legal_name, display_name, firm_kinds, is_synthetic, current_as_of)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                firm_id,
                firm_slug_for_crd(firm.crd),
                firm.legal_name,
                firm.display_name,
                [firm.registration_type],
                synthetic,
                now,
            ),
        )
        existing[firm.crd] = firm_id
        return firm_id, True

    def _upsert_identifiers(self, conn: Any, firm_id: str, firm: NormalizedFirm) -> int:
        created = 0
        for ident_type, value in (("crd", firm.crd), ("sec_file_number", firm.sec_file_number)):
            if not value:
                continue
            row = conn.execute(
                """
                INSERT INTO firm_identifiers (firm_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
                VALUES (%s, %s, %s, 'sec', %s)
                ON CONFLICT (identifier_type, identifier_value) DO NOTHING
                RETURNING id
                """,
                (firm_id, ident_type, value, ident_type == "crd"),
            ).fetchone()
            if row:
                created += 1
        return created

    def _upsert_registration(self, conn: Any, firm_id: str, firm: NormalizedFirm) -> int:
        row = conn.execute(
            """
            INSERT INTO registrations (
                subject_kind, firm_id, regulator_authority_id, registration_type, status,
                commenced_on, is_current, is_synthetic, source_status_text
            ) VALUES ('firm', %s, 'sec', %s, %s, %s, TRUE, FALSE, %s)
            ON CONFLICT (firm_id, registration_type, regulator_authority_id)
            WHERE subject_kind = 'firm'
            DO UPDATE SET
                status = EXCLUDED.status,
                source_status_text = EXCLUDED.source_status_text,
                updated_at = now()
            RETURNING xmax = 0
            """,
            (
                firm_id,
                firm.registration_type,
                firm.registration_status,
                firm.sec_status_effective_date,
                firm.sec_current_status_text,
            ),
        ).fetchone()
        return 1 if row else 0

    def _upsert_location(self, conn: Any, firm_id: str, firm: NormalizedFirm) -> int:
        office = firm.main_office
        row = conn.execute(
            """
            INSERT INTO branches (
                firm_id, source_location_key, name, address_line_1, address_line_2,
                city, region, postal_code, country, is_main_office, is_synthetic
            ) VALUES (%s, 'sec-adv-main-office', 'Principal office (as reported)', %s, %s, %s, %s, %s, %s, TRUE, FALSE)
            ON CONFLICT (firm_id, source_location_key) WHERE source_location_key IS NOT NULL
            DO UPDATE SET
                address_line_1 = EXCLUDED.address_line_1,
                address_line_2 = EXCLUDED.address_line_2,
                city = EXCLUDED.city,
                region = EXCLUDED.region,
                postal_code = EXCLUDED.postal_code,
                country = EXCLUDED.country,
                updated_at = now()
            RETURNING xmax = 0
            """,
            (
                firm_id,
                office.get("line1"),
                office.get("line2"),
                office.get("city"),
                office.get("region"),
                office.get("postal_code"),
                _country_code(office.get("country")),
            ),
        ).fetchone()
        return 1 if row else 0

    def _upsert_facts(self, conn: Any, firm_id: str, firm: NormalizedFirm, release_id: str, synthetic: bool) -> int:
        conn.execute(
            """
            INSERT INTO form_adv_firm_facts (
                firm_id, source_dataset_id, source_release_id, dataset_kind,
                organization_form, fiscal_year_end, sec_current_status_text,
                sec_status_effective_date, latest_adv_filing_date, form_version, website,
                raum_amount, raum_discretionary_amount, raum_nondiscretionary_amount,
                raum_source_field, disclosure_indicator, facts, is_synthetic
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (firm_id, source_release_id, dataset_kind) DO UPDATE SET
                organization_form = EXCLUDED.organization_form,
                sec_current_status_text = EXCLUDED.sec_current_status_text,
                raum_amount = EXCLUDED.raum_amount,
                facts = EXCLUDED.facts,
                updated_at = now()
            """,
            (
                firm_id,
                DATASET_IDS[firm.dataset_kind],
                release_id,
                firm.dataset_kind,
                firm.organization_form,
                firm.fiscal_year_end,
                firm.sec_current_status_text,
                firm.sec_status_effective_date,
                firm.latest_adv_filing_date,
                firm.form_version,
                firm.website,
                firm.raum_amount,
                firm.raum_discretionary_amount,
                firm.raum_nondiscretionary_amount,
                "5F(2)(c)" if firm.dataset_kind == "ria" else None,
                firm.disclosure_indicator,
                json.dumps({"cik": firm.cik, "firm_type_source": firm.firm_type_source}),
                synthetic,
            ),
        )
        return 1

    def _upsert_evidence(
        self,
        conn: Any,
        run_id: str,
        firm_id: str,
        firm: NormalizedFirm,
        release_id: str,
        now: datetime,
    ) -> int:
        created = 0
        fields = {
            "identity": {"crd": firm.crd, "legal_name": firm.legal_name},
            "legal_name": firm.legal_name,
            "crd": firm.crd,
            "sec_file_number": firm.sec_file_number,
            "classification": firm.registration_type,
            "registration_status": {
                "normalized": firm.registration_status,
                "source_text": firm.sec_current_status_text,
            },
            "main_office": firm.main_office,
        }
        for field_name, value in fields.items():
            raw = firm.raw.get(
                {
                    "legal_name": "Legal Name",
                    "crd": "Organization CRD#",
                    "sec_file_number": "SEC#",
                    "classification": "Firm Type",
                    "registration_status": "SEC Current Status",
                    "main_office": "Main Office Street Address 1",
                    "identity": "Organization CRD#",
                }[field_name]
            )
            row = conn.execute(
                """
                INSERT INTO evidence_records (
                    ingestion_run_id, source_authority_id, source_system_id, source_dataset_id,
                    source_release_id, source_document_name, source_record_identifier,
                    retrieved_at, raw_value, normalized_value, transform_version,
                    subject_kind, subject_id, field_name, evidence_status, is_current, is_synthetic
                ) VALUES (
                    %s, %s, %s, %s, %s, 'SEC IARD firm roster', %s, %s, %s, %s, %s,
                    'firm', %s, %s, 'reported_by_source', TRUE, FALSE
                )
                ON CONFLICT DO NOTHING
                RETURNING id
                """,
                (
                    run_id,
                    SOURCE_AUTHORITY_ID,
                    SOURCE_SYSTEM_ID,
                    DATASET_IDS[firm.dataset_kind],
                    release_id,
                    firm.crd,
                    now,
                    json.dumps(raw),
                    json.dumps(value),
                    TRANSFORM_VERSION,
                    firm_id,
                    field_name,
                ),
            ).fetchone()
            if row:
                created += 1
        return created

    def _upsert_snapshot(self, conn: Any, firm_id: str, firm: NormalizedFirm, release_id: str, now: datetime) -> int:
        row = conn.execute(
            """
            INSERT INTO source_snapshots (subject_kind, subject_id, source_system_id, source_release_id, snapshot_at, payload)
            VALUES ('firm', %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            (firm_id, SOURCE_SYSTEM_ID, release_id, now, json.dumps(firm.raw)),
        ).fetchone()
        return 1 if row else 0

    def _observe(self, conn: Any, firm_id: str, firm: NormalizedFirm, release_id: str, observed: bool) -> int:
        row = conn.execute(
            """
            INSERT INTO firm_source_observations (firm_id, source_dataset_id, source_release_id, observed, note)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (firm_id, source_dataset_id, source_release_id) DO NOTHING
            RETURNING id
            """,
            (
                firm_id,
                DATASET_IDS[firm.dataset_kind],
                release_id,
                observed,
                "observed in official SEC roster" if observed else "not observed in this release",
            ),
        ).fetchone()
        return 1 if row else 0

    def _observe_missing(self, conn: Any, firm_id: str, release_id: str) -> int:
        row = conn.execute(
            """
            INSERT INTO firm_source_observations (firm_id, source_dataset_id, source_release_id, observed, note)
            VALUES (%s, 'sec_ia_ria', %s, FALSE, 'Not observed in this release. Absence is not a finding of termination.')
            ON CONFLICT (firm_id, source_dataset_id, source_release_id) DO NOTHING
            RETURNING id
            """,
            (firm_id, release_id),
        ).fetchone()
        return 1 if row else 0

    def _upsert_search(self, conn: Any, firm_id: str, firm: NormalizedFirm, synthetic: bool) -> int:
        identifiers = [firm.crd]
        if firm.sec_file_number:
            identifiers.append(firm.sec_file_number)
        conn.execute(
            """
            INSERT INTO search_documents (
                entity_kind, entity_id, slug, display_name, identifiers, city, region, postal_code,
                registration_types, is_synthetic, indexable
            ) VALUES (
                'firm', %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE
            )
            ON CONFLICT (entity_kind, entity_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                identifiers = EXCLUDED.identifiers,
                city = EXCLUDED.city,
                region = EXCLUDED.region,
                postal_code = EXCLUDED.postal_code,
                is_synthetic = EXCLUDED.is_synthetic,
                indexable = FALSE
            """,
            (
                firm_id,
                firm_slug_for_crd(firm.crd),
                firm.display_name,
                identifiers,
                firm.main_office.get("city"),
                firm.main_office.get("region"),
                firm.main_office.get("postal_code"),
                [firm.registration_type],
                synthetic,
            ),
        )
        return 1

    def _write_quarantine(self, conn: Any, run_id: str, quarantine: list[QuarantineItem]) -> None:
        for item in quarantine:
            conn.execute(
                """
                INSERT INTO ingestion_quarantine (
                    ingestion_run_id, source_dataset_id, source_record_identifier, reason_code, detail, raw_payload
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    run_id,
                    DATASET_IDS[item.dataset_kind],
                    item.source_record_identifier,
                    item.reason_code,
                    item.detail,
                    json.dumps(item.raw),
                ),
            )
