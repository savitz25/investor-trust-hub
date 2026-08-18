"""Post-publish integrity queries against the configured database."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402

QUERIES = {
    "official_sec_firms": """
        SELECT count(*) FROM firms f
        JOIN firm_identifiers i ON i.firm_id = f.id AND i.identifier_type = 'crd'
        WHERE f.is_synthetic = false
    """,
    "synthetic_firms": "SELECT count(*) FROM firms WHERE is_synthetic = true",
    "ria_firms": """
        SELECT count(*) FROM registrations
        WHERE registration_type = 'registered_investment_adviser' AND is_synthetic = false
    """,
    "era_firms": """
        SELECT count(*) FROM registrations
        WHERE registration_type = 'exempt_reporting_adviser' AND is_synthetic = false
    """,
    "era_normalized_as_ria": """
        SELECT count(*)
        FROM registrations r
        JOIN form_adv_firm_facts f ON f.firm_id = r.firm_id
        WHERE f.dataset_kind = 'era'
          AND r.registration_type = 'registered_investment_adviser'
    """,
    "firm_identifiers": "SELECT count(*) FROM firm_identifiers",
    "crd_identifiers": "SELECT count(*) FROM firm_identifiers WHERE identifier_type = 'crd'",
    "sec_file_identifiers": "SELECT count(*) FROM firm_identifiers WHERE identifier_type = 'sec_file_number'",
    "registrations": "SELECT count(*) FROM registrations WHERE is_synthetic = false",
    "principal_locations": "SELECT count(*) FROM branches WHERE is_main_office = true AND is_synthetic = false",
    "adv_facts": "SELECT count(*) FROM form_adv_firm_facts WHERE is_synthetic = false",
    "evidence_records": "SELECT count(*) FROM evidence_records WHERE is_synthetic = false",
    "source_snapshots": "SELECT count(*) FROM source_snapshots",
    "search_documents": "SELECT count(*) FROM search_documents WHERE entity_kind = 'firm' AND is_synthetic = false",
    "indexable_official_search": """
        SELECT count(*) FROM search_documents
        WHERE entity_kind = 'firm' AND is_synthetic = false AND indexable = true
    """,
    "quarantined_rows": "SELECT count(*) FROM ingestion_quarantine",
    "duplicate_crds": """
        SELECT count(*) FROM (
            SELECT identifier_value FROM firm_identifiers
            WHERE identifier_type = 'crd'
            GROUP BY identifier_value HAVING count(*) > 1
        ) d
    """,
    "null_crds": """
        SELECT count(*) FROM firms f
        WHERE f.is_synthetic = false
          AND NOT EXISTS (
            SELECT 1 FROM firm_identifiers i
            WHERE i.firm_id = f.id AND i.identifier_type = 'crd'
          )
    """,
    "malformed_crds": """
        SELECT count(*) FROM firm_identifiers
        WHERE identifier_type = 'crd' AND identifier_value !~ '^[0-9]+$'
    """,
    "duplicate_sec_file_numbers": """
        SELECT count(*) FROM (
            SELECT identifier_value FROM firm_identifiers
            WHERE identifier_type = 'sec_file_number'
            GROUP BY identifier_value HAVING count(*) > 1
        ) d
    """,
    "orphan_evidence": """
        SELECT count(*) FROM evidence_records e
        WHERE e.subject_kind = 'firm'
          AND e.subject_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM firms f WHERE f.id = e.subject_id)
    """,
    "evidence_without_release": """
        SELECT count(*) FROM evidence_records
        WHERE is_synthetic = false AND source_release_id IS NULL
    """,
    "evidence_without_authority": """
        SELECT count(*) FROM evidence_records
        WHERE is_synthetic = false
          AND (source_authority_id IS NULL OR source_system_id IS NULL)
    """,
    "facts_without_evidence": """
        SELECT count(*) FROM form_adv_firm_facts f
        WHERE f.is_synthetic = false
          AND NOT EXISTS (
            SELECT 1 FROM evidence_records e
            WHERE e.subject_id = f.firm_id AND e.subject_kind = 'firm'
          )
    """,
    "missing_state": """
        SELECT count(*) FROM branches
        WHERE is_main_office AND is_synthetic = false
          AND (region IS NULL OR btrim(region) = '')
    """,
    "missing_sec_file_number": """
        SELECT count(*) FROM firms f
        WHERE f.is_synthetic = false
          AND NOT EXISTS (
            SELECT 1 FROM firm_identifiers i
            WHERE i.firm_id = f.id AND i.identifier_type = 'sec_file_number'
          )
    """,
    "missing_principal_office": """
        SELECT count(*) FROM firms f
        WHERE f.is_synthetic = false
          AND NOT EXISTS (
            SELECT 1 FROM branches b WHERE b.firm_id = f.id AND b.is_main_office
          )
    """,
    "missing_raum_ria": """
        SELECT count(*) FROM form_adv_firm_facts
        WHERE dataset_kind = 'ria' AND is_synthetic = false AND raum_amount IS NULL
    """,
    "synthetic_sharing_official_crd": """
        SELECT count(*) FROM firm_identifiers s
        JOIN firms sf ON sf.id = s.firm_id AND sf.is_synthetic = true
        JOIN firm_identifiers o ON o.identifier_type = s.identifier_type
          AND o.identifier_value = s.identifier_value
        JOIN firms ofirm ON ofirm.id = o.firm_id AND ofirm.is_synthetic = false
        WHERE s.identifier_type = 'crd'
    """,
    "official_marked_synthetic": """
        SELECT count(*) FROM firms f
        JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
        WHERE f.is_synthetic = true AND adv.is_synthetic = false
    """,
}


def main() -> int:
    load_local_env(ROOT)
    import os

    import psycopg

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("INGESTION_DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1
    report: dict[str, object] = {}
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        for name, sql in QUERIES.items():
            report[name] = int(conn.execute(sql).fetchone()[0])
        report["top_states"] = [
            {"state": row[0] or "UNKNOWN", "count": int(row[1])}
            for row in conn.execute(
                """
                SELECT coalesce(nullif(btrim(region), ''), 'UNKNOWN') AS state, count(*)
                FROM branches
                WHERE is_main_office AND is_synthetic = false
                GROUP BY 1
                ORDER BY count(*) DESC, state
                LIMIT 15
                """
            ).fetchall()
        ]
        report["registration_distribution"] = [
            {"registration_type": row[0], "status": row[1], "count": int(row[2])}
            for row in conn.execute(
                """
                SELECT registration_type, status, count(*)
                FROM registrations
                WHERE is_synthetic = false
                GROUP BY 1, 2
                ORDER BY 1, 2
                """
            ).fetchall()
        ]
        report["ingestion_runs"] = [
            {
                "idempotency_key": row[0],
                "status": row[1],
                "started_at": str(row[2]),
                "finished_at": str(row[3]),
            }
            for row in conn.execute(
                """
                SELECT idempotency_key, status, started_at, finished_at
                FROM ingestion_runs
                ORDER BY started_at DESC
                LIMIT 10
                """
            ).fetchall()
        ]

    critical = {
        "duplicate_crds": report["duplicate_crds"],
        "malformed_crds": report["malformed_crds"],
        "orphan_evidence": report["orphan_evidence"],
        "evidence_without_release": report["evidence_without_release"],
        "evidence_without_authority": report["evidence_without_authority"],
        "era_normalized_as_ria": report["era_normalized_as_ria"],
        "indexable_official_search": report["indexable_official_search"],
        "synthetic_sharing_official_crd": report["synthetic_sharing_official_crd"],
        "official_marked_synthetic": report["official_marked_synthetic"],
    }
    report["critical_errors"] = critical
    report["critical_error_total"] = int(sum(int(value) for value in critical.values()))
    out = ROOT / "data" / "reports" / "task-002-1-integrity.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["critical_error_total"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
