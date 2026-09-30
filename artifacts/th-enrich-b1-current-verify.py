"""Verify the versioned September 30 B1 Investor release candidate offline."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts/th-enrich-b1-current"
read = lambda name: list(csv.DictReader((ART / name).open(encoding="utf-8")))
registrations = read("iapd_approved_state_advisers.csv")
firms = read("iapd_state_new_firm_candidates.csv")
bridges = read("iapd_state_existing_firm_bridges.csv")
new_crds = {row["firm_crd"] for row in firms}
existing_crds = {row["firm_crd"] for row in bridges}
keys = {(row["registration_state"], row["firm_crd"]) for row in registrations}
assert len(registrations) == len(keys) == 6602
assert len(firms) == len(new_crds) == 5491
assert len(bridges) == len(existing_crds) == 451
assert not new_crds & existing_crds
assert {row["firm_crd"] for row in registrations} == new_crds | existing_crds
assert all(row["registration_status"] == "APPROVED" for row in registrations)
assert sum(row["firm_crd"] in new_crds for row in registrations) == 5993
assert sum(row["firm_crd"] in existing_crds for row in registrations) == 609
qa = json.loads((ART / "iapd_approved_state_advisers_qa.json").read_text(encoding="utf-8"))
assert qa["duplicate_state_crd_keys"] == 0
assert qa["source_sha256"] == "23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c"
print("B1 September Investor candidate verified: 5,491 firms, 6,602 registrations, 0 collisions")
