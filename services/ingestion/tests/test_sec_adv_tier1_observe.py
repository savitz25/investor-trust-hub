from ith_ingestion.sec_adv.tier1_catalog import FIELDS
from ith_ingestion.sec_adv.tier1_observe import observe_field, observe_payload, successor_resolution
from ith_ingestion.sec_adv.tier1_catalog import FieldSpec


def spec(name: str) -> FieldSpec:
    return next(f for f in FIELDS if f.field_name == name)


def test_field_names_unique():
    names = [f.field_name for f in FIELDS]
    assert len(names) == len(set(names))


def test_era_item5_not_filed():
    obs = observe_field(spec("5E(1)"), {}, "era")
    assert obs["presence_status"] == "NOT_FILED_BY_FORM_TYPE"
    assert obs["reported_yn"] is None


def test_reported_zero_not_missing():
    obs = observe_field(spec("5C(1)"), {"5C(1)": " 0"}, "ria")
    assert obs["presence_status"] == "REPORTED_ZERO"
    assert obs["numeric_value"] == 0


def test_yes_no():
    assert observe_field(spec("5E(1)"), {"5E(1)": "Y"}, "ria")["presence_status"] == "REPORTED_YES"
    assert observe_field(spec("5E(1)"), {"5E(1)": "N"}, "ria")["presence_status"] == "REPORTED_NO"


def test_no_fee_only_label():
    rows = observe_payload({"5E(1)": "Y"}, "ria")
    assert all("fee_only" not in r["regulator_label"] for r in rows)


def test_successor_same_crd_review():
    s = successor_resolution({"4A": "Y", "Organization CRD#": "10", "Acquired Firm CRD#": "10"}, "ria")
    assert s["resolution_status"] == "REVIEW_REQUIRED"


def test_successor_distinct_confirmed():
    s = successor_resolution({"4A": "Y", "Organization CRD#": "10", "Acquired Firm CRD#": "99"}, "ria")
    assert s["resolution_status"] == "CONFIRMED"
    assert s["predecessor_crd"] == "99"
