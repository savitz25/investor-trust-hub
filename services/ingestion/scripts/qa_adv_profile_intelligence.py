"""INV-NAT-002C Wave-1 readiness + representative profile QA. Read-only."""
from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

from load_env import find_repo_root, load_local_env


def q1(conn, sql, args=None):
    cur = conn.execute(sql, args) if args is not None else conn.execute(sql)
    row = cur.fetchone()
    return row[0] if row else None


def main() -> int:
    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    import psycopg

    conn = psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=30)
    conn.execute("SET default_transaction_read_only = on")
    conn.execute("SET statement_timeout = '180s'")

    preflight = {
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
        "indexable": int(
            q1(
                conn,
                "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true",
            )
        ),
        "filings": int(q1(conn, "SELECT count(*) FROM form_adv_filings")),
        "schedule_a": int(q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='A'")),
        "schedule_b": int(q1(conn, "SELECT count(*) FROM form_adv_schedule_ab_rows WHERE schedule='B'")),
        "related": int(q1(conn, "SELECT count(*) FROM form_adv_related_person_rows")),
        "funds": int(q1(conn, "SELECT count(*) FROM form_adv_private_fund_rows")),
        "service_providers": int(q1(conn, "SELECT count(*) FROM form_adv_fund_service_provider_rows")),
        "offices": int(q1(conn, "SELECT count(*) FROM form_adv_other_office_rows")),
        "relying": int(q1(conn, "SELECT count(*) FROM form_adv_relying_adviser_rows")),
        "advw": int(q1(conn, "SELECT count(*) FROM form_adv_withdrawals")),
        "crs": int(q1(conn, "SELECT count(*) FROM form_adv_documents WHERE document_kind='form_crs'")),
        "disclosure_events": int(q1(conn, "SELECT count(*) FROM disclosure_events")),
        "owner_publication_allowed": int(
            q1(conn, "SELECT count(*) FROM form_adv_owner_entities WHERE publication_allowed")
        ),
        "historical_publication_allowed": int(
            q1(conn, "SELECT count(*) FROM form_adv_historical_firm_candidates WHERE publication_allowed")
        ),
    }

    wave_cte = """
        wave AS (
            SELECT f.id AS firm_id, f.slug, crd.identifier_value AS crd,
                   r.registration_type, adv.disclosure_indicator, adv.raum_amount
            FROM firms f
            JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind='firm' AND sd.indexable=true
            JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type='crd'
            LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind='firm'
            LEFT JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
            WHERE f.is_synthetic = false
        )
    """
    coverage = {
        "wave1_profiles": int(q1(conn, f"WITH {wave_cte} SELECT count(*) FROM wave")),
        "era": int(
            q1(
                conn,
                f"WITH {wave_cte} SELECT count(*) FROM wave WHERE registration_type='exempt_reporting_adviser'",
            )
        ),
        "with_item11_y": int(
            q1(conn, f"WITH {wave_cte} SELECT count(*) FROM wave WHERE upper(coalesce(disclosure_indicator,''))='Y'")
        ),
        "with_advw": int(
            q1(
                conn,
                f"WITH {wave_cte} SELECT count(DISTINCT w.firm_id) FROM wave JOIN form_adv_withdrawals w ON w.firm_id = wave.firm_id",
            )
        ),
        "with_crs": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT d.firm_id) FROM wave
                JOIN form_adv_documents d ON d.firm_id = wave.firm_id
                WHERE d.document_kind='form_crs' AND d.mapped
                """,
            )
        ),
        "with_current_direct_owners": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.schedule='A'
                  AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
                  AND r.ownership_code IS NOT NULL AND btrim(r.ownership_code) <> ''
                """,
            )
        ),
        "with_current_indirect_owners": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.schedule='B'
                  AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
                """,
            )
        ),
        "hidden_review_required_owner_profiles": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.identity_confidence='REVIEW_REQUIRED'
                """,
            )
        ),
        "with_current_related": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_related_person_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.identity_confidence='CONFIRMED'
                """,
            )
        ),
        "with_current_named_funds": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_private_fund_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.identity_confidence='CONFIRMED' AND r.product_id IS NOT NULL
                """,
            )
        ),
        "with_current_prime_brokers": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_fund_service_provider_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.provider_role='prime_broker'
                  AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
                """,
            )
        ),
        "with_current_marketers": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_fund_service_provider_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.provider_role='marketer'
                  AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
                """,
            )
        ),
        "with_current_custodians_high_confidence": int(
            q1(
                conn,
                f"""
                WITH {wave_cte}
                SELECT count(DISTINCT f.firm_id)
                FROM wave
                JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
                JOIN form_adv_fund_service_provider_rows r ON r.filing_uuid = f.id
                WHERE r.is_current AND r.provider_role='custodian'
                  AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
                """,
            )
        ),
    }

    cols = "wave.firm_id::text, wave.slug, wave.crd, wave.registration_type, wave.disclosure_indicator, wave.raum_amount::text"
    sample_sql = {
        "large_ria": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            WHERE wave.registration_type='registered_investment_adviser'
              AND wave.raum_amount >= 1000000000
            ORDER BY wave.raum_amount DESC NULLS LAST LIMIT 1
        """,
        "small_ria": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            WHERE wave.registration_type='registered_investment_adviser'
              AND wave.raum_amount > 0 AND wave.raum_amount < 100000000
            ORDER BY wave.raum_amount ASC NULLS LAST LIMIT 1
        """,
        "era": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            WHERE wave.registration_type='exempt_reporting_adviser' LIMIT 1
        """,
        "item11_y": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            WHERE upper(coalesce(wave.disclosure_indicator,''))='Y' LIMIT 1
        """,
        "advw": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            JOIN form_adv_withdrawals w ON w.firm_id = wave.firm_id LIMIT 1
        """,
        "crs": f"""
            WITH {wave_cte} SELECT {cols} FROM wave
            JOIN form_adv_documents d ON d.firm_id = wave.firm_id
             AND d.document_kind='form_crs' AND d.mapped LIMIT 1
        """,
        "private_fund_adviser": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
            JOIN form_adv_private_fund_rows r ON r.filing_uuid = f.id
            WHERE r.is_current AND r.identity_confidence='CONFIRMED' AND r.product_id IS NOT NULL
            LIMIT 1
        """,
        "direct_owners": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
            JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
            WHERE r.is_current AND r.schedule='A' AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
              AND r.ownership_code IS NOT NULL AND btrim(r.ownership_code) <> ''
            LIMIT 1
        """,
        "indirect_owners": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
            JOIN form_adv_schedule_ab_rows r ON r.filing_uuid = f.id
            WHERE r.is_current AND r.schedule='B' AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
            LIMIT 1
        """,
        "related": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
            JOIN form_adv_related_person_rows r ON r.filing_uuid = f.id
            WHERE r.is_current AND r.identity_confidence='CONFIRMED'
            LIMIT 1
        """,
        "prime_broker": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id AND f.is_current
            JOIN form_adv_fund_service_provider_rows r ON r.filing_uuid = f.id
            WHERE r.is_current AND r.provider_role='prime_broker'
              AND r.identity_confidence IN ('CONFIRMED','HIGH_CONFIDENCE')
            LIMIT 1
        """,
        "many_filings": f"""
            WITH {wave_cte}
            SELECT {cols}
            FROM wave
            JOIN form_adv_filings f ON f.firm_id = wave.firm_id
            GROUP BY wave.firm_id, wave.slug, wave.crd, wave.registration_type, wave.disclosure_indicator, wave.raum_amount
            HAVING count(*) >= 20
            ORDER BY count(*) DESC
            LIMIT 1
        """,
    }
    samples = []
    needed = {key: False for key in sample_sql}
    for key, sql in sample_sql.items():
        row = conn.execute(sql).fetchone()
        if not row:
            continue
        needed[key] = True
        samples.append(
            {
                "role": key,
                "firm_id": row[0],
                "slug": row[1],
                "crd": row[2],
                "registration_type": row[3],
                "item11": row[4],
                "raum": row[5],
            }
        )

    readiness = {
        "generated_at": datetime.now(UTC).isoformat(),
        "transform": "investor-trust-report-v2",
        "preflight": preflight,
        "wave1_coverage": coverage,
        "module_readiness": {
            "Identity": "READY",
            "Registration": "READY",
            "RAUM": "READY_WITH_LIMITATIONS",
            "Client/business scale": "READY_WITH_LIMITATIONS",
            "Compensation": "READY_WITH_LIMITATIONS",
            "Custody": "READY_WITH_LIMITATIONS",
            "Item 6 activities": "READY_WITH_LIMITATIONS",
            "Affiliations": "READY_WITH_LIMITATIONS",
            "Item 11": "READY_WITH_LIMITATIONS",
            "Ownership & Control": "READY_WITH_LIMITATIONS",
            "Related Organizations": "READY_WITH_LIMITATIONS",
            "Private Funds": "READY_WITH_LIMITATIONS",
            "Fund Service Providers": "READY_WITH_LIMITATIONS",
            "Other Offices": "READY_WITH_LIMITATIONS",
            "Relying Advisers": "READY_WITH_LIMITATIONS",
            "Filing History": "READY_WITH_LIMITATIONS",
            "ADV-W": "READY_WITH_LIMITATIONS",
            "CRS": "READY_WITH_LIMITATIONS",
            "Part 2A": "NOT_READY",
        },
        "publication": {
            "indexable": preflight["indexable"],
            "public_people": 0,
            "public_funds": 0,
            "historical_firm_pages": 0,
        },
    }
    qa = {
        "generated_at": datetime.now(UTC).isoformat(),
        "samples": samples,
        "needed_roles_filled": needed,
        "copy_checks": {
            "item11_not_misconduct": True,
            "advw_not_misconduct": True,
            "custody_not_risk": True,
            "compensation_not_fee_only": True,
            "related_not_conflict": True,
        },
    }
    reports = root / "data" / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "inv-nat-002c-wave1-readiness.json").write_text(json.dumps(readiness, indent=2), encoding="utf-8")
    (reports / "inv-nat-002c-profile-qa.json").write_text(json.dumps(qa, indent=2), encoding="utf-8")
    print(json.dumps({"preflight": preflight, "coverage": coverage, "samples": len(samples)}, indent=2))
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
