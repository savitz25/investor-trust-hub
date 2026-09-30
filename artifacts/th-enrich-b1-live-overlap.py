"""Read-only exact CRD overlap for B1 state slices against the Investor firm spine."""
from __future__ import annotations

import csv
import argparse
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

load_local_env(Path.home() / "investor-trust-hub")
dsn = os.environ.get("INGESTION_DATABASE_URL") or os.environ.get("DATABASE_URL")
if not dsn:
    raise SystemExit("No Investor database URL")
parser = argparse.ArgumentParser()
parser.add_argument("--source", type=Path, default=ROOT / "data/reports/th-enrich-b1/iapd_approved_state_advisers.csv")
parser.add_argument("--out", type=Path, default=ROOT / "data/reports/th-enrich-b1")
parser.add_argument("--report", type=Path, default=ROOT / "docs/TH-ENRICH-2026-09-30-B1-live-overlap.json")
args = parser.parse_args()
source = args.source
rows = list(csv.DictReader(source.open(encoding="utf-8")))
slice_crds = {row["firm_crd"] for row in rows}
with psycopg.connect(dsn, connect_timeout=15) as conn:
    conn.execute("SET default_transaction_read_only = on")
    identifiers = conn.execute(
        "SELECT identifier_value, array_agg(DISTINCT firm_id::text) FROM firm_identifiers "
        "WHERE identifier_type='crd' GROUP BY identifier_value"
    ).fetchall()
    owned = dict(identifiers)
    registration_counts = conn.execute(
        "SELECT jurisdiction,registration_type,count(*) FROM jurisdiction_registrations "
        "WHERE jurisdiction IN ('CA','TX','AZ','WA') GROUP BY jurisdiction,registration_type "
        "ORDER BY jurisdiction,registration_type"
    ).fetchall()
    registration_type_checks = conn.execute(
        "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint "
        "WHERE conrelid='jurisdiction_registrations'::regclass "
        "AND contype='c' AND pg_get_constraintdef(oid) LIKE '%registration_type%'"
    ).fetchall()
    firms_before = conn.execute("SELECT count(*) FROM firms WHERE is_synthetic=false").fetchone()[0]
    conn.rollback()
overlap = defaultdict(Counter)
unlinked = defaultdict(list)
collisions = defaultdict(list)
for row in rows:
    state, crd = row["registration_state"], row["firm_crd"]
    existing_ids = owned.get(crd, [])
    count = len(existing_ids)
    overlap[state]["source_approved"] += 1
    if count == 1:
        overlap[state]["exact_existing_crd"] += 1
    elif count > 1:
        overlap[state]["ambiguous_crd"] += 1
        collisions[state].append(crd)
    else:
        overlap[state]["not_in_firm_spine"] += 1
        unlinked[state].append(crd)
result = {
    "retrieved_at": datetime.now(timezone.utc).isoformat(),
    "firms_before": firms_before,
    "overlap": {state: dict(values) for state, values in sorted(overlap.items())},
    "existing_registrations": registration_counts,
    "registration_type_checks": registration_type_checks,
    "distinct_approved_crds": len({r["firm_crd"] for r in rows}),
    "distinct_new_firm_crds": len({r["firm_crd"] for r in rows if not owned.get(r["firm_crd"])}),
    "distinct_existing_firm_crds": len({r["firm_crd"] for r in rows if len(owned.get(r["firm_crd"], [])) == 1}),
    "unlinked_crds": dict(unlinked),
    "ambiguous_crds": dict(collisions),
    "production_changed": False,
}
out = args.out
out.mkdir(parents=True, exist_ok=True)
new_firms = {}
for row in rows:
    crd = row["firm_crd"]
    if not owned.get(crd):
        previous = new_firms.setdefault(crd, row)
        if (previous["legal_name"], previous["business_name"]) != (row["legal_name"], row["business_name"]):
            raise RuntimeError(f"IAPD feed has conflicting names for CRD {crd}")
with (out / "iapd_state_new_firm_candidates.csv").open("w", newline="", encoding="utf-8") as fh:
    writer = csv.DictWriter(fh, fieldnames=["firm_crd", "business_name", "legal_name"])
    writer.writeheader()
    writer.writerows({k: row[k] for k in writer.fieldnames} for _, row in sorted(new_firms.items(), key=lambda x: int(x[0])))
with (out / "iapd_state_existing_firm_bridges.csv").open("w", newline="", encoding="utf-8") as fh:
    writer = csv.DictWriter(fh, fieldnames=["firm_crd", "existing_firm_id"])
    writer.writeheader()
    writer.writerows({"firm_crd": crd, "existing_firm_id": ids[0]} for crd, ids in sorted(owned.items())
                     if len(ids) == 1 and crd in slice_crds)
path = args.report
path.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps({k: v for k, v in result.items() if k not in {"unlinked_crds", "ambiguous_crds"}}, indent=2))
