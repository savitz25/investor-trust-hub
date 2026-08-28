"""INV-NAT-002B post-write reconciliation. Read-only production queries."""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from load_env import find_repo_root, load_local_env


def q(conn, sql: str, args=None):
    cur = conn.execute(sql, args) if args is not None else conn.execute(sql)
    return cur.fetchall()


def q1(conn, sql: str, args=None):
    row = q(conn, sql, args)
    return row[0][0] if row else None


def counts_by(conn, sql: str) -> dict:
    return {str(k): int(v) for k, v in q(conn, sql)}


def main() -> int:
    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    import psycopg

    conn = psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=30)
    conn.execute("SET default_transaction_read_only = on")
    conn.execute("SET statement_timeout = 0")

    report: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "transform": "inv-nat-002b-relational-v1",
    }

    report["schema"] = [r[0] for r in q(conn, "SELECT filename FROM schema_migrations ORDER BY 1")]
    run = q(
        conn,
        "SELECT id::text, status, started_at::text, finished_at::text FROM ingestion_runs ORDER BY created_at DESC LIMIT 3",
    )
    report["ingestion_runs"] = [
        {"id": r[0], "status": r[1], "started_at": r[2], "finished_at": r[3]} for r in run
    ]

    report["baseline"] = {
        "firms": int(q1(conn, "SELECT count(*) FROM firms WHERE is_synthetic=false")),
        "ria": int(
            q1(
                conn,
                "SELECT count(*) FROM registrations WHERE registration_type='registered_investment_adviser' AND is_synthetic=false",
            )
        ),
        "era": int(
            q1(
                conn,
                "SELECT count(*) FROM registrations WHERE registration_type='exempt_reporting_adviser' AND is_synthetic=false",
            )
        ),
        "attributes": int(q1(conn, "SELECT count(*) FROM form_adv_reported_attributes")),
        "indexable": int(
            q1(
                conn,
                "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true",
            )
        ),
        "people": int(q1(conn, "SELECT count(*) FROM people")),
        "products": int(q1(conn, "SELECT count(*) FROM products")),
        "disclosure_events": int(q1(conn, "SELECT count(*) FROM disclosure_events")),
        "search_non_firm": int(
            q1(
                conn,
                "SELECT count(*) FROM search_documents WHERE entity_kind <> 'firm'",
            )
        ),
        "indexable_non_firm": int(
            q1(
                conn,
                "SELECT count(*) FROM search_documents WHERE entity_kind <> 'firm' AND indexable=true",
            )
        ),
    }

    report["filings"] = {
        "total": int(q1(conn, "SELECT count(*) FROM form_adv_filings")),
        "ria": int(q1(conn, "SELECT count(*) FROM form_adv_filings WHERE dataset_kind='ria'")),
        "era": int(q1(conn, "SELECT count(*) FROM form_adv_filings WHERE dataset_kind='era'")),
        "current": int(q1(conn, "SELECT count(*) FROM form_adv_filings WHERE is_current")),
        "historical": int(q1(conn, "SELECT count(*) FROM form_adv_filings WHERE NOT is_current")),
        "ia_era_filing_id_overlaps": int(
            q1(
                conn,
                """
                SELECT count(*) FROM (
                    SELECT filing_id FROM form_adv_filings
                    WHERE dataset_kind IN ('ria','era')
                    GROUP BY filing_id HAVING count(DISTINCT dataset_kind) > 1
                ) x
                """,
            )
        ),
        "crd_looks_like_sec_file": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_filings WHERE crd LIKE '801-%' OR crd LIKE '802-%'",
            )
        ),
    }

    report["historical_firms"] = {
        "candidates": int(q1(conn, "SELECT count(*) FROM form_adv_historical_firm_candidates")),
        "by_status": counts_by(
            conn, "SELECT status, count(*) FROM form_adv_historical_firm_candidates GROUP BY 1"
        ),
        "with_advw": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE advw_filing_id IS NOT NULL",
            )
        ),
        "without_advw": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE advw_filing_id IS NULL",
            )
        ),
        "publication_allowed_true": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE publication_allowed",
            )
        ),
        "on_current_roster_true": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE on_current_roster",
            )
        ),
    }

    report["schedule_a"] = {
        "rows": int(q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A'")),
        "people_rows": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' AND owner_kind='PERSON'",
            )
        ),
        "organization_rows": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' AND owner_kind='ORGANIZATION'",
            )
        ),
        "direct_owner_edges": int(
            q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A'")
        ),
        "executive_control_edges": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_schedule_ab_rows
                WHERE schedule='A' AND (
                    upper(coalesce(control_person,'')) IN ('Y','YES')
                    OR title_or_status IS NOT NULL AND title_or_status <> ''
                )
                """,
            )
        ),
        "linked_owner_entities": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' AND owner_entity_id IS NOT NULL",
            )
        ),
        "linked_people": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' AND person_id IS NOT NULL",
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' GROUP BY 1",
        ),
        "is_current": counts_by(
            conn,
            "SELECT is_current, count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A' GROUP BY 1",
        ),
    }

    report["schedule_b"] = {
        "rows": int(q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B'")),
        "people_rows": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' AND owner_kind='PERSON'",
            )
        ),
        "organization_rows": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' AND owner_kind='ORGANIZATION'",
            )
        ),
        "indirect_owner_edges": int(
            q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B'")
        ),
        "executive_control_edges": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_schedule_ab_rows
                WHERE schedule='B' AND (
                    upper(coalesce(control_person,'')) IN ('Y','YES')
                    OR title_or_status IS NOT NULL AND title_or_status <> ''
                )
                """,
            )
        ),
        "linked_owner_entities": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' AND owner_entity_id IS NOT NULL",
            )
        ),
        "linked_people": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' AND person_id IS NOT NULL",
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' GROUP BY 1",
        ),
        "is_current": counts_by(
            conn,
            "SELECT is_current, count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B' GROUP BY 1",
        ),
    }

    report["owner_entities"] = {
        "total": int(q1(conn, "SELECT count(*) FROM form_adv_owner_entities")),
        "by_kind": counts_by(
            conn, "SELECT owner_kind, count(*) FROM form_adv_owner_entities GROUP BY 1"
        ),
        "canonical_people": int(
            q1(conn, "SELECT count(*) FROM people WHERE slug LIKE 'iard-owner-person-%'")
        ),
        "publication_allowed_true": int(
            q1(conn, "SELECT count(*) FROM form_adv_owner_entities WHERE publication_allowed")
        ),
        "ownerid_name_collisions_person": int(
            q1(
                conn,
                """
                SELECT count(*) FROM (
                    SELECT owner_id FROM form_adv_schedule_ab_rows
                    WHERE owner_id IS NOT NULL AND owner_id <> ''
                      AND owner_kind='PERSON' AND full_legal_name IS NOT NULL AND full_legal_name <> ''
                    GROUP BY owner_id HAVING count(DISTINCT lower(btrim(full_legal_name))) > 1
                ) x
                """,
            )
        ),
        "ownerid_name_collisions_organization": int(
            q1(
                conn,
                """
                SELECT count(*) FROM (
                    SELECT owner_id FROM form_adv_schedule_ab_rows
                    WHERE owner_id IS NOT NULL AND owner_id <> ''
                      AND owner_kind='ORGANIZATION' AND full_legal_name IS NOT NULL AND full_legal_name <> ''
                    GROUP BY owner_id HAVING count(DISTINCT lower(btrim(full_legal_name))) > 1
                ) x
                """,
            )
        ),
        "name_only_ab_rows": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_schedule_ab_rows
                WHERE (owner_id IS NULL OR owner_id = '')
                  AND full_legal_name IS NOT NULL AND full_legal_name <> ''
                """,
            )
        ),
    }

    report["related_persons"] = {
        "rows": int(q1(conn, "SELECT count(*) FROM form_adv_related_person_rows")),
        "crd_linked": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_related_person_rows WHERE related_crd IS NOT NULL AND related_crd <> ''",
            )
        ),
        "entity_linked": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_related_person_rows WHERE related_firm_id IS NOT NULL",
            )
        ),
        "name_only_holds": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_related_person_rows
                WHERE (related_crd IS NULL OR related_crd = '')
                  AND (related_sec_number IS NULL OR related_sec_number = '')
                  AND legal_name IS NOT NULL AND legal_name <> ''
                """,
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_related_person_rows GROUP BY 1",
        ),
        "is_current": counts_by(
            conn, "SELECT is_current, count(*) FROM form_adv_related_person_rows GROUP BY 1"
        ),
    }

    report["private_funds"] = {
        "source_rows": int(q1(conn, "SELECT count(*) FROM form_adv_private_fund_rows")),
        "canonical_funds": int(
            q1(conn, "SELECT count(*) FROM products WHERE product_kind='private_fund'")
        ),
        "rows_with_product_id": int(
            q1(conn, "SELECT count(*) FROM form_adv_private_fund_rows WHERE product_id IS NOT NULL")
        ),
        "confirmed_805": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_private_fund_rows WHERE fund_id ~* '^805-[0-9]+$'",
            )
        ),
        "name_only_holds": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_private_fund_rows
                WHERE (fund_id IS NULL OR fund_id = '' OR fund_id !~* '^805-[0-9]+$')
                  AND fund_name IS NOT NULL AND fund_name <> ''
                """,
            )
        ),
        "named_funds_without_fund_id": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_private_fund_rows
                WHERE (fund_id IS NULL OR fund_id = '')
                  AND fund_name IS NOT NULL AND fund_name <> ''
                """,
            )
        ),
        "fund_id_name_collisions": int(
            q1(
                conn,
                """
                SELECT count(*) FROM (
                    SELECT fund_id FROM form_adv_private_fund_rows
                    WHERE fund_id ~* '^805-[0-9]+$' AND fund_name IS NOT NULL AND fund_name <> ''
                    GROUP BY fund_id HAVING count(DISTINCT lower(btrim(fund_name))) > 1
                ) x
                """,
            )
        ),
        "adviser_fund_edges": int(
            q1(
                conn,
                """
                SELECT count(*) FROM form_adv_private_fund_rows r
                JOIN form_adv_filings f ON f.id = r.filing_uuid
                WHERE r.product_id IS NOT NULL AND f.firm_id IS NOT NULL
                """,
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_private_fund_rows GROUP BY 1",
        ),
        "is_current": counts_by(
            conn, "SELECT is_current, count(*) FROM form_adv_private_fund_rows GROUP BY 1"
        ),
    }

    report["fund_service_providers"] = {}
    for role in (
        "auditor",
        "prime_broker",
        "custodian",
        "administrator",
        "marketer",
        "general_partner_or_manager",
    ):
        report["fund_service_providers"][role] = {
            "source_rows": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s",
                    (role,),
                )
            ),
            "distinct_named_providers": int(
                q1(
                    conn,
                    """
                    SELECT count(*) FROM (
                        SELECT DISTINCT lower(btrim(provider_name)), provider_crd
                        FROM form_adv_fund_service_provider_rows
                        WHERE provider_role=%s AND provider_name IS NOT NULL AND provider_name <> ''
                    ) x
                    """,
                    (role,),
                )
            ),
            "confirmed": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s AND identity_confidence='CONFIRMED'",
                    (role,),
                )
            ),
            "high_confidence": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s AND identity_confidence='HIGH_CONFIDENCE'",
                    (role,),
                )
            ),
            "review_required": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s AND identity_confidence='REVIEW_REQUIRED'",
                    (role,),
                )
            ),
            "unresolved": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s AND identity_confidence='UNRESOLVED'",
                    (role,),
                )
            ),
            "crd_linked_firm": int(
                q1(
                    conn,
                    "SELECT count(*) FROM form_adv_fund_service_provider_rows WHERE provider_role=%s AND related_firm_id IS NOT NULL",
                    (role,),
                )
            ),
            "name_only_holds": int(
                q1(
                    conn,
                    """
                    SELECT count(*) FROM form_adv_fund_service_provider_rows
                    WHERE provider_role=%s
                      AND (provider_crd IS NULL OR provider_crd = '')
                      AND (provider_sec_number IS NULL OR provider_sec_number = '')
                      AND (provider_lei IS NULL OR provider_lei = '')
                      AND provider_name IS NOT NULL AND provider_name <> ''
                    """,
                    (role,),
                )
            ),
            "is_current": counts_by(
                conn,
                "SELECT is_current, count(*) FROM form_adv_fund_service_provider_rows "
                f"WHERE provider_role='{role}' GROUP BY 1",
            ),
        }

    report["other_offices"] = {
        "source_rows": int(q1(conn, "SELECT count(*) FROM form_adv_other_office_rows")),
        "distinct_office_keys": int(
            q1(conn, "SELECT count(DISTINCT source_office_key) FROM form_adv_other_office_rows")
        ),
        "branch_number": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_other_office_rows WHERE branch_number IS NOT NULL AND branch_number <> ''",
            )
        ),
        "address_only": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_other_office_rows WHERE branch_number IS NULL OR branch_number = ''",
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_other_office_rows GROUP BY 1",
        ),
        "is_current": counts_by(
            conn, "SELECT is_current, count(*) FROM form_adv_other_office_rows GROUP BY 1"
        ),
    }

    report["relying_advisers"] = {
        "rows": int(q1(conn, "SELECT count(*) FROM form_adv_relying_adviser_rows")),
        "distinct_crds": int(
            q1(
                conn,
                "SELECT count(DISTINCT relying_crd) FROM form_adv_relying_adviser_rows WHERE relying_crd IS NOT NULL AND relying_crd <> ''",
            )
        ),
        "relationships_crd_linked": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_relying_adviser_rows WHERE relying_firm_id IS NOT NULL",
            )
        ),
        "name_only_holds": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_relying_adviser_rows WHERE relying_crd IS NULL OR relying_crd = ''",
            )
        ),
        "identity_confidence": counts_by(
            conn,
            "SELECT identity_confidence, count(*) FROM form_adv_relying_adviser_rows GROUP BY 1",
        ),
        "is_current": counts_by(
            conn, "SELECT is_current, count(*) FROM form_adv_relying_adviser_rows GROUP BY 1"
        ),
    }

    report["advw"] = {
        "filings": int(q1(conn, "SELECT count(*) FROM form_adv_withdrawals")),
        "by_filing_type": counts_by(
            conn,
            "SELECT upper(coalesce(filing_type,'UNKNOWN')), count(*) FROM form_adv_withdrawals GROUP BY 1",
        ),
        "current_roster_overlap": int(
            q1(
                conn,
                "SELECT count(DISTINCT crd) FROM form_adv_withdrawals WHERE firm_id IS NOT NULL",
            )
        ),
        "historical_only_crds": int(
            q1(
                conn,
                "SELECT count(DISTINCT crd) FROM form_adv_withdrawals WHERE firm_id IS NULL AND crd IS NOT NULL",
            )
        ),
    }

    report["crs"] = {
        "mappings": int(
            q1(conn, "SELECT count(*) FROM form_adv_documents WHERE document_kind='form_crs'")
        ),
        "distinct_crs_ids": int(
            q1(
                conn,
                "SELECT count(DISTINCT official_document_id) FROM form_adv_documents WHERE document_kind='form_crs' AND official_document_id IS NOT NULL",
            )
        ),
        "mapped_firms": int(
            q1(
                conn,
                "SELECT count(DISTINCT firm_id) FROM form_adv_documents WHERE document_kind='form_crs' AND firm_id IS NOT NULL",
            )
        ),
        "mapped_true": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_documents WHERE document_kind='form_crs' AND mapped",
            )
        ),
    }

    report["part2a"] = {
        "catalog_rows": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_documents WHERE document_kind='part2a_brochure'",
            )
        ),
        "mapped_firms": int(
            q1(
                conn,
                "SELECT count(DISTINCT firm_id) FROM form_adv_documents WHERE document_kind='part2a_brochure' AND firm_id IS NOT NULL",
            )
        ),
        "pdfs_ingested": int(
            q1(
                conn,
                "SELECT count(*) FROM form_adv_documents WHERE document_kind='part2a_brochure' AND sha256 IS NOT NULL",
            )
        ),
    }

    families = {
        "filings": "form_adv_filings",
        "schedule_ab": "form_adv_schedule_ab_rows",
        "related_persons": "form_adv_related_person_rows",
        "private_funds": "form_adv_private_fund_rows",
        "service_providers": "form_adv_fund_service_provider_rows",
        "offices": "form_adv_other_office_rows",
        "relying_advisers": "form_adv_relying_adviser_rows",
        "advw": "form_adv_withdrawals",
        "documents": "form_adv_documents",
    }
    report["currentness"] = {}
    for name, table in families.items():
        report["currentness"][name] = counts_by(
            conn, f"SELECT is_current, count(*) FROM {table} GROUP BY 1"
        )

    report["identity_confidence"] = {}
    conf_tables = {
        "filings": "form_adv_filings",
        "schedule_ab": "form_adv_schedule_ab_rows",
        "related_persons": "form_adv_related_person_rows",
        "private_funds": "form_adv_private_fund_rows",
        "service_providers": "form_adv_fund_service_provider_rows",
        "offices": "form_adv_other_office_rows",
        "relying_advisers": "form_adv_relying_adviser_rows",
        "advw": "form_adv_withdrawals",
        "documents": "form_adv_documents",
        "owner_entities": "form_adv_owner_entities",
    }
    totals = {"CONFIRMED": 0, "HIGH_CONFIDENCE": 0, "REVIEW_REQUIRED": 0, "UNRESOLVED": 0}
    for name, table in conf_tables.items():
        by = counts_by(conn, f"SELECT identity_confidence, count(*) FROM {table} GROUP BY 1")
        report["identity_confidence"][name] = by
        for k, v in by.items():
            if k in totals:
                totals[k] += v
    report["identity_confidence"]["totals"] = totals

    report["collisions"] = {
        "ia_era_filing_id_overlaps": {
            "count": report["filings"]["ia_era_filing_id_overlaps"],
            "handling": "HOLD separate rows via UNIQUE (source_dataset_id, dataset_kind, filing_id). Do not collapse IA/ERA.",
        },
        "ownerid_name_collisions": {
            "person": report["owner_entities"]["ownerid_name_collisions_person"],
            "organization": report["owner_entities"]["ownerid_name_collisions_organization"],
            "count": report["owner_entities"]["ownerid_name_collisions_person"]
            + report["owner_entities"]["ownerid_name_collisions_organization"],
            "handling": "HOLD. Same OwnerID keeps multiple historical names on schedule_ab_rows (distinct source_row_digest). Canonical owner_entities display_name is min(name); rows are not overwritten.",
        },
        "fund_id_name_collisions": {
            "count": report["private_funds"]["fund_id_name_collisions"],
            "handling": "HOLD. One canonical product per official 805- Fund ID. Name history stays on private_fund_rows.",
        },
        "named_funds_without_fund_id": {
            "count": report["private_funds"]["named_funds_without_fund_id"],
            "non_official_fund_id_also_held": report["private_funds"]["name_only_holds"]
            - report["private_funds"]["named_funds_without_fund_id"],
            "handling": "HOLD REVIEW_REQUIRED. Not materialized into products. Official 805- Fund ID is the only canonical key.",
        },
        "name_only_ab_rows": {
            "count": report["owner_entities"]["name_only_ab_rows"],
            "handling": "HOLD REVIEW_REQUIRED. Not merged into people. No global name key.",
        },
        "name_only_service_providers": {
            "by_role": {
                role: report["fund_service_providers"][role]["name_only_holds"]
                for role in report["fund_service_providers"]
            },
            "handling": "HOLD REVIEW_REQUIRED unless CRD/SEC/LEI present. No name-global provider entity.",
        },
    }

    report["publication"] = {
        "indexable": report["baseline"]["indexable"],
        "public_people_search": report["baseline"]["indexable_non_firm"],
        "historical_publication_allowed": report["historical_firms"]["publication_allowed_true"],
        "owner_publication_allowed": report["owner_entities"]["publication_allowed_true"],
        "disclosure_events": report["baseline"]["disclosure_events"],
    }

    out = root / "data" / "reports" / "inv-nat-002b-reconcile.json"
    out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(json.dumps(report, indent=2, default=str))
    print("wrote", out)
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
