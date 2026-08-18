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
    conn = psycopg.connect(
        dsn,
        connect_timeout=30,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )
    conn.execute("SET statement_timeout = 0")
    conn.execute("SET idle_in_transaction_session_timeout = 0")
    return conn


def _executemany(conn: Any, sql: str, rows: list[tuple[Any, ...]], chunk_size: int = 500) -> None:
    if not rows:
        return
    total = len(rows)
    with conn.cursor() as cur:
        for start in range(0, total, chunk_size):
            batch = rows[start : start + chunk_size]
            cur.executemany(sql, batch)
            done = min(start + chunk_size, total)
            if done == total or done % 5000 == 0:
                print(f"  wrote {done}/{total}", flush=True)


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
                        row[0]: str(row[1])
                        for row in conn.execute(
                            "SELECT fi.identifier_value, fi.firm_id FROM firm_identifiers fi WHERE fi.identifier_type = 'crd'"
                        )
                    }
                    existing_idents = {
                        (row[0], row[1])
                        for row in conn.execute(
                            "SELECT identifier_type, identifier_value FROM firm_identifiers"
                        )
                    }
                    previous = set(existing)
                    new_firms: list[tuple[Any, ...]] = []
                    update_firms: list[tuple[Any, ...]] = []
                    identifiers: list[tuple[Any, ...]] = []
                    registrations: list[tuple[Any, ...]] = []
                    locations: list[tuple[Any, ...]] = []
                    facts: list[tuple[Any, ...]] = []
                    evidence: list[tuple[Any, ...]] = []
                    snapshots: list[tuple[Any, ...]] = []
                    observations: list[tuple[Any, ...]] = []
                    search_rows: list[tuple[Any, ...]] = []
                    observed: set[str] = set()
                    for firm in firms:
                        observed.add(firm.crd)
                        release_id = release_ids[firm.dataset_kind]
                        if firm.crd in existing:
                            firm_id = existing[firm.crd]
                            update_firms.append(
                                (
                                    firm.legal_name,
                                    firm.display_name,
                                    [firm.registration_type],
                                    now,
                                    firm_id,
                                )
                            )
                            counts.firms_updated += 1
                        else:
                            firm_id = str(uuid4())
                            existing[firm.crd] = firm_id
                            new_firms.append(
                                (
                                    firm_id,
                                    firm_slug_for_crd(firm.crd),
                                    firm.legal_name,
                                    firm.display_name,
                                    [firm.registration_type],
                                    synthetic,
                                    now,
                                )
                            )
                            counts.firms_inserted += 1
                        for ident_type, value in (("crd", firm.crd), ("sec_file_number", firm.sec_file_number)):
                            if not value:
                                continue
                            identifiers.append((firm_id, ident_type, value, ident_type == "crd"))
                            if (ident_type, value) not in existing_idents:
                                counts.identifiers_created += 1
                                existing_idents.add((ident_type, value))
                        registrations.append(
                            (
                                firm_id,
                                firm.registration_type,
                                firm.registration_status,
                                firm.sec_status_effective_date,
                                firm.sec_current_status_text,
                            )
                        )
                        counts.registrations_upserted += 1
                        office = firm.main_office
                        locations.append(
                            (
                                firm_id,
                                office.get("line1"),
                                office.get("line2"),
                                office.get("city"),
                                office.get("region"),
                                office.get("postal_code"),
                                _country_code(office.get("country")),
                            )
                        )
                        counts.locations_upserted += 1
                        facts.append(
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
                            )
                        )
                        counts.facts_upserted += 1
                        evidence.extend(self._evidence_rows(run_id, firm_id, firm, release_id, now))
                        counts.evidence_created += 7
                        snapshots.append(
                            (firm_id, SOURCE_SYSTEM_ID, release_id, now, json.dumps(firm.raw))
                        )
                        counts.snapshots_created += 1
                        observations.append(
                            (
                                firm_id,
                                DATASET_IDS[firm.dataset_kind],
                                release_id,
                                True,
                                "observed in official SEC roster",
                            )
                        )
                        counts.observations_created += 1
                        search_ids = [firm.crd]
                        if firm.sec_file_number:
                            search_ids.append(firm.sec_file_number)
                        search_rows.append(
                            (
                                firm_id,
                                firm_slug_for_crd(firm.crd),
                                firm.display_name,
                                search_ids,
                                firm.main_office.get("city"),
                                firm.main_office.get("region"),
                                firm.main_office.get("postal_code"),
                                [firm.registration_type],
                                synthetic,
                            )
                        )
                        counts.search_documents_upserted += 1
                    missing_release = next(iter(release_ids.values()))
                    for crd in previous - observed:
                        firm_id = existing.get(crd)
                        if not firm_id:
                            continue
                        counts.not_observed += 1
                        observations.append(
                            (
                                firm_id,
                                "sec_ia_ria",
                                missing_release,
                                False,
                                "Not observed in this release. Absence is not a finding of termination.",
                            )
                        )
                        counts.observations_created += 1
                    print(f"publish_batch firms_new={len(new_firms)} firms_update={len(update_firms)}", flush=True)
                    _executemany(
                        conn,
                        """
                        INSERT INTO firms (id, slug, legal_name, display_name, firm_kinds, is_synthetic, current_as_of)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        new_firms,
                    )
                    _executemany(
                        conn,
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
                        update_firms,
                    )
                    _executemany(
                        conn,
                        """
                        INSERT INTO firm_identifiers (firm_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
                        VALUES (%s, %s, %s, 'sec', %s)
                        ON CONFLICT (identifier_type, identifier_value) DO NOTHING
                        """,
                        identifiers,
                    )
                    _executemany(
                        conn,
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
                        """,
                        registrations,
                    )
                    _executemany(
                        conn,
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
                        """,
                        locations,
                    )
                    _executemany(
                        conn,
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
                        facts,
                    )
                    print(f"publish_batch evidence={len(evidence)}", flush=True)
                    _executemany(
                        conn,
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
                        """,
                        evidence,
                    )
                    _executemany(
                        conn,
                        """
                        INSERT INTO source_snapshots (subject_kind, subject_id, source_system_id, source_release_id, snapshot_at, payload)
                        VALUES ('firm', %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        snapshots,
                    )
                    _executemany(
                        conn,
                        """
                        INSERT INTO firm_source_observations (firm_id, source_dataset_id, source_release_id, observed, note)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (firm_id, source_dataset_id, source_release_id) DO NOTHING
                        """,
                        observations,
                    )
                    _executemany(
                        conn,
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
                        search_rows,
                    )
                    self._write_quarantine(conn, run_id, quarantine)
                    conn.execute(
                        "UPDATE ingestion_runs SET status = 'published', finished_at = clock_timestamp(), metrics = %s WHERE id = %s",
                        (json.dumps(counts.as_dict()), run_id),
                    )
                    print("publish_batch committed", flush=True)
            except Exception as exc:
                raise PublishError(str(exc)) from exc
        return counts

    def _evidence_rows(
        self,
        run_id: str,
        firm_id: str,
        firm: NormalizedFirm,
        release_id: str,
        now: datetime,
    ) -> list[tuple[Any, ...]]:
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
        raw_keys = {
            "legal_name": "Legal Name",
            "crd": "Organization CRD#",
            "sec_file_number": "SEC#",
            "classification": "Firm Type",
            "registration_status": "SEC Current Status",
            "main_office": "Main Office Street Address 1",
            "identity": "Organization CRD#",
        }
        rows: list[tuple[Any, ...]] = []
        for field_name, value in fields.items():
            rows.append(
                (
                    run_id,
                    SOURCE_AUTHORITY_ID,
                    SOURCE_SYSTEM_ID,
                    DATASET_IDS[firm.dataset_kind],
                    release_id,
                    firm.crd,
                    now,
                    json.dumps(firm.raw.get(raw_keys[field_name])),
                    json.dumps(value),
                    TRANSFORM_VERSION,
                    firm_id,
                    field_name,
                )
            )
        return rows

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
        rows = [
            (
                run_id,
                DATASET_IDS[item.dataset_kind],
                item.source_record_identifier,
                item.reason_code,
                item.detail,
                json.dumps(item.raw),
            )
            for item in quarantine
        ]
        _executemany(
            conn,
            """
            INSERT INTO ingestion_quarantine (
                ingestion_run_id, source_dataset_id, source_record_identifier, reason_code, detail, raw_payload
            ) VALUES (%s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
