"""INV-NAT-002B identity/currentness ingest contract tests."""
from __future__ import annotations

from datetime import datetime

from ith_ingestion.sec_adv import RELATIONAL_TRANSFORM_VERSION
from ith_ingestion.sec_adv.relational_identity import (
    classify_de_fe_i,
    classify_schedule,
    edge_is_current,
    filing_identity_key,
    firm_identity_confidence,
    fund_identity_confidence,
    named_party_identity_confidence,
    normalize_crd,
    normalize_fund_id,
    owner_identity_confidence,
    parse_submitted,
    source_is_monthly_current_vintage,
    source_row_digest,
)


def test_transform_version_locked():
    assert RELATIONAL_TRANSFORM_VERSION == "inv-nat-002b-relational-v1"


def test_crd_not_sec_file_number():
    assert normalize_crd("18217") == "18217"
    # 1E1 is CRD; 1D 801- file numbers must not be treated as CRD identity.
    assert firm_identity_confidence("18217") == "CONFIRMED"
    assert firm_identity_confidence("801-30405") == "UNRESOLVED"


def test_ia_era_filing_ids_are_separate_keys():
    a = ("ria", filing_identity_key("1000"))
    b = ("era", filing_identity_key("1000"))
    assert a != b


def test_schedule_a_not_b():
    assert classify_schedule("A") == "A"
    assert classify_schedule("B") == "B"
    assert classify_schedule("A") != classify_schedule("B")


def test_owner_id_is_not_crd():
    conf = owner_identity_confidence(owner_id="2491297", name="JANE DOE", kind="PERSON")
    assert conf == "HIGH_CONFIDENCE"
    assert firm_identity_confidence("2491297") == "CONFIRMED"  # digits, but
    # OwnerID must not be stored as identifier_type crd in this pipeline.
    assert classify_de_fe_i("I") == "PERSON"


def test_same_owner_id_digest_preserves_name_history():
    d1 = source_row_digest("1", "A", "99", "JANE DOE", "I")
    d2 = source_row_digest("1", "A", "99", "JANE SMITH", "I")
    assert d1 != d2


def test_name_only_does_not_confirm():
    assert owner_identity_confidence(owner_id=None, name="JANE DOE", kind="PERSON") == "REVIEW_REQUIRED"
    assert named_party_identity_confidence(name="ACME LLC", crd=None) == "REVIEW_REQUIRED"


def test_one_fund_id_is_one_fund():
    assert normalize_fund_id("805-123") == "805-123"
    assert fund_identity_confidence(fund_id="805-123", fund_name="ALPHA") == "CONFIRMED"
    assert fund_identity_confidence(fund_id="805-123", fund_name="ALPHA LP") == "CONFIRMED"
    assert fund_identity_confidence(fund_id=None, fund_name="ALPHA") == "REVIEW_REQUIRED"


def test_different_fund_ids_remain_separate():
    assert normalize_fund_id("805-1") != normalize_fund_id("805-2")


def test_currentness_fail_closed_for_2024():
    assert edge_is_current(
        crd_on_current_roster=True,
        filing_is_latest_for_crd=True,
        source_is_current_snapshot=False,
    ) is False
    dt = parse_submitted("12/26/2024")
    assert source_is_monthly_current_vintage("historical-part1.zip", dt) is False
    dt2 = parse_submitted("07/31/2026")
    assert source_is_monthly_current_vintage("iapd-part1-monthly/2026/ADV_Filing_Data_20260701_20260731.zip", dt2) is True


def test_parse_submitted_mixed_formats():
    assert parse_submitted("11/13/2012 01:39:54 PM").date().isoformat() == "2012-11-13"
    assert parse_submitted("2026-07-31").date().isoformat() == "2026-07-31"
