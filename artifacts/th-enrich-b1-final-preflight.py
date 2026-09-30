"""Read-only live ownership and schema audit for the pinned September B1 candidate."""
from __future__ import annotations

import csv
import hashlib
import json
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/ingestion/scripts"))
from load_env import load_local_env  # noqa: E402

SOURCE = ROOT / "artifacts/th-enrich-b1-current/iapd_approved_state_advisers.csv"
FIRMS = ROOT / "artifacts/th-enrich-b1-current/iapd_state_new_firm_candidates.csv"
REPORT = ROOT / "docs/TH-ENRICH-2026-09-30-B1-final-preflight.json"
EXPECTED_SOURCE_SHA = "23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c"
EXPECTED_TYPES = {
    "FL_NOTICE_FILED_SEC_RIA", "FL_STATE_REGISTERED_IA", "FL_STATE_ERA_REPORTING",
    "investment_adviser_representative", "FL_CURRENT_IAR", "FL_APP_PEND_IARCE",
}


def main() -> dict:
    rows = list(csv.DictReader(SOURCE.open(encoding="utf-8")))
    candidates = list(csv.DictReader(FIRMS.open(encoding="utf-8")))
    pairs = Counter((r["firm_crd"], r["registration_state"]) for r in rows)
    crds = {r["firm_crd"] for r in rows}
    by_pair = defaultdict(set)
    for r in rows:
        by_pair[(r["firm_crd"], r["registration_state"])].add(
            (r["registration_status"], r["registration_date"], r["business_name"], r["legal_name"])
        )
    assert len(rows) == 6602 and len(crds) == 5942
    assert all(r["registration_status"] == "APPROVED" for r in rows)
    assert set(r["registration_state"] for r in rows) == {"CA", "TX", "AZ", "WA"}
    assert len(candidates) == len({r["firm_crd"] for r in candidates}) == 5491
    assert len({(r["firm_crd"], r["legal_name"], r["business_name"]) for r in candidates}) == 5491
    assert all(r["legal_name"].strip() and r["business_name"].strip() for r in candidates)
    load_local_env(Path.home() / "investor-trust-hub")
    dsn = os.environ.get("INGESTION_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("Investor read-only database URL unavailable")
    with psycopg.connect(dsn, connect_timeout=15) as conn:
        conn.execute("SET default_transaction_read_only = on")
        conn.execute("SET statement_timeout = '60s'")
        columns = conn.execute(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name='jurisdiction_registrations' "
            "ORDER BY ordinal_position"
        ).fetchall()
        constraints = dict(conn.execute(
            "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint "
            "WHERE conrelid='public.jurisdiction_registrations'::regclass"
        ).fetchall())
        indexes = dict(conn.execute(
            "SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' "
            "AND tablename='jurisdiction_registrations'"
        ).fetchall())
        migration_applied = bool(conn.execute(
            "SELECT 1 FROM schema_migrations WHERE filename=%s",
            ("0016_b1_state_adviser_registration_type.sql",)
        ).fetchone())
        dataset = bool(conn.execute("SELECT 1 FROM source_datasets WHERE id='iapd_state_compilation'").fetchone())
        authority = bool(conn.execute("SELECT 1 FROM source_authorities WHERE id='state_securities'").fetchone())
        owned_rows = conn.execute(
            "SELECT fi.identifier_value, fi.firm_id::text, f.is_synthetic "
            "FROM firm_identifiers fi JOIN firms f ON f.id=fi.firm_id "
            "WHERE fi.identifier_type='crd' AND fi.identifier_value=ANY(%s)",
            (list(crds),)
        ).fetchall()
        owned = defaultdict(set)
        synthetic = set()
        for crd, firm_id, is_synthetic in owned_rows:
            owned[crd].add(firm_id)
            if is_synthetic:
                synthetic.add(crd)
        slug_rows = conn.execute(
            "SELECT slug::text FROM firms WHERE slug::text=ANY(%s)",
            ([f"sec-crd-{crd}" for crd in crds],)
        ).fetchall()
        existing_registrations = conn.execute(
            "SELECT count(*) FROM jurisdiction_registrations "
            "WHERE jurisdiction IN ('CA','TX','AZ','WA') AND source_dataset_id='iapd_state_compilation'"
        ).fetchone()[0]
        other_state_regs = conn.execute(
            "SELECT count(*) FROM jurisdiction_registrations WHERE jurisdiction IN ('CA','TX','AZ','WA')"
        ).fetchone()[0]
        principal_overlays = conn.execute(
            "SELECT count(*) FROM search_documents WHERE entity_kind='firm' AND region IN ('CA','TX','AZ','WA')"
        ).fetchone()[0]
        conn.rollback()
    existing = {crd for crd, ids in owned.items() if len(ids) == 1}
    absent = crds - set(owned)
    slug_conflicts = [slug for (slug,) in slug_rows if slug.removeprefix("sec-crd-") in absent]
    ambiguous = {crd: len(ids) for crd, ids in owned.items() if len(ids) > 1}
    candidate_set = {r["firm_crd"] for r in candidates}
    new_registrations = sum(r["firm_crd"] in absent for r in rows)
    existing_firm_registrations = sum(r["firm_crd"] in existing for r in rows)
    expected_columns = {"firm_id", "person_id", "subject_kind", "jurisdiction", "registration_type",
                        "regulator_authority", "regulator_authority_id", "status", "status_raw",
                        "effective_date", "source_dataset_id", "source_record_id", "source_release_id",
                        "identity_confidence", "match_basis", "is_current", "publication_allowed", "raw"}
    actual_columns = {c[0] for c in columns}
    check = constraints.get("jurisdiction_registrations_registration_type_check", "")
    compatible = (expected_columns <= actual_columns and all(f"'{t}'::text" in check for t in EXPECTED_TYPES)
                  and "'STATE_REGISTERED_IA'::text" not in check and dataset and authority and not migration_applied)
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "production_access": "read-only transaction; rolled back",
        "official_iapd_feed_sha256": EXPECTED_SOURCE_SHA,
        "staged_csv_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "live_schema_compatible": compatible,
        "live_registration_columns": [c[0] for c in columns],
        "live_registration_type_check": check,
        "live_subject_check": constraints.get("jurisdiction_registrations_subject_chk"),
        "live_firm_unique_index": indexes.get("jurisdiction_registrations_firm_uniq"),
        "source_dataset_present": dataset,
        "state_authority_present": authority,
        "migration_0016_already_applied": migration_applied,
        "approved_registration_rows": len(rows),
        "distinct_crds": len(crds),
        "current_already_present": len(existing),
        "current_insert_candidates": len(absent),
        "new_firm_registrations": new_registrations,
        "existing_firm_registrations": existing_firm_registrations,
        "duplicate_crd_candidates": len(candidates) - len(candidate_set),
        "duplicate_crd_state_keys": sum(n - 1 for n in pairs.values() if n > 1),
        "conflicting_registration_keys": sum(len(values) > 1 for values in by_pair.values()),
        "ambiguous_crd_bridges": ambiguous,
        "synthetic_crd_bridges": sorted(synthetic),
        "candidate_file_matches_live_absent": candidate_set == absent,
        "candidate_slug_conflicts": len(slug_conflicts),
        "existing_crd_slug_matches": len(slug_rows) - len(slug_conflicts),
        "existing_iapd_state_registrations": existing_registrations,
        "existing_state_registrations_any_source": other_state_regs,
        "principal_office_overlay_rows_observed_read_only": principal_overlays,
        "production_mutations": False,
    }
    assert compatible
    assert "UNIQUE INDEX" in report["live_firm_unique_index"]
    assert len(existing) == 451 and len(absent) == 5491
    assert new_registrations == 5993 and existing_firm_registrations == 609
    assert report["duplicate_crd_candidates"] == report["duplicate_crd_state_keys"] == report["conflicting_registration_keys"] == 0
    assert not ambiguous and not synthetic and candidate_set == absent
    assert not slug_conflicts and existing_registrations == other_state_regs == 0, (
        f"candidate slug conflicts={len(slug_conflicts)}, IAPD registrations={existing_registrations}, other state registrations={other_state_regs}"
    )
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {"live_registration_columns", "live_registration_type_check", "live_subject_check"}}, indent=2))
    return report


if __name__ == "__main__":
    main()
