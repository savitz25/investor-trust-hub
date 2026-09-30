"""Publication packet integrity checks; no database writes."""
from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts/th-enrich-b1"
state = list(csv.DictReader((ART / "iapd_approved_state_advisers.csv").open(encoding="utf-8")))
new = list(csv.DictReader((ART / "iapd_state_new_firm_candidates.csv").open(encoding="utf-8")))
bridges = list(csv.DictReader((ART / "iapd_state_existing_firm_bridges.csv").open(encoding="utf-8")))
pa = [json.loads(line) for line in (ART / "pa_registered_securities.jsonl").read_text(encoding="utf-8").splitlines()]
qa = json.loads((ROOT / "docs/TH-ENRICH-2026-09-30-B1-live-overlap.json").read_text(encoding="utf-8"))

assert len(state) == 6599
assert len({(r["registration_state"], r["firm_crd"]) for r in state}) == len(state)
assert all(r["registration_status"] == "APPROVED" for r in state)
assert Counter(r["registration_state"] for r in state) == {"CA": 3341, "TX": 1985, "AZ": 673, "WA": 600}
assert len(new) == qa["distinct_new_firm_crds"] == 5483
assert len(bridges) == qa["distinct_existing_firm_crds"] == 456
assert {r["firm_crd"] for r in new}.isdisjoint({r["firm_crd"] for r in bridges})
assert {r["firm_crd"] for r in state} == {r["firm_crd"] for r in new} | {r["firm_crd"] for r in bridges}
assert len(pa) == len({r["record_key"] for r in pa}) == 73
assert all(r["source_dataset"] == "registered_securities" for r in pa)
print("PASS: 6,599 approved registrations, 5,483 new CRD candidates, 456 exact bridges, 73 issuer evidence rows")
