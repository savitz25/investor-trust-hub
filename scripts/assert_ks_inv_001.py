import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
page = (ROOT / "apps/web/src/app/kansas/page.tsx").read_text(encoding="utf-8")
data = json.loads(
    (ROOT / "data/kansas/ks-inv-001/iapd-ks-census.json").read_text(encoding="utf-8")
)
paths = (ROOT / "apps/web/src/lib/published-state-path.ts").read_text(encoding="utf-8")

assert "'kansas'" in paths
assert 'path: "/kansas"' in page
assert data["state"]["ks_state_ia_approved_distinct_crd"] == 224
assert data["sec"]["ks_notice_filed_distinct_crd"] == 1514
assert data["state"]["ks_state_era_active_distinct_crd"] == 16
assert data["iar"]["registration_observations"] == 7442
assert data["iar"]["distinct_iar_person_ids"] == 7353
assert data["overlaps"]["approved_state_ia_and_sec_notice_filed"] == 1
assert data["overlaps"]["approved_state_ia_and_active_era"] == 0
assert data["overlaps"]["active_era_and_sec_notice_filed"] == 0
assert data["newCanonicalFirms"] == 0
assert data["evidenceAttachments"] == 0
assert data["graphWrites"] == 0
assert "regulator code KS" in page
assert "Principal-office" in page or "principal-office" in page
assert "registration is not a firm license" in page
assert "not a disposition or" in page
assert "not attached to" in page
assert "AggregateRating" not in page
assert "Trust Score" not in page

print("KS-INV-001 publication assertions passed")
