"""INV-NAT-001 ADV1–ADV20 safety tests. No production writes."""
from __future__ import annotations

from ith_ingestion.sec_adv.enrichment import extract_enrichment
from ith_ingestion.sec_adv.identifiers import normalize_crd
from ith_ingestion.sec_adv.normalize import classify, normalize_row
from ith_ingestion.sec_adv.models import ParsedRow


def row(values: dict, kind: str = "ria", n: int = 1) -> ParsedRow:
    base = {
        "Organization CRD#": "123456",
        "Legal Name": "ALPHA ADVISERS LLC",
        "Primary Business Name": "ALPHA ADVISERS",
        "Firm Type": "Registered" if kind == "ria" else "ERA",
        "SEC Current Status": "Approved" if kind == "ria" else "ERA - Active",
        "SEC#": "801-1" if kind == "ria" else "802-1",
    }
    base.update(values)
    return ParsedRow(dataset_kind=kind, row_number=n, values=base)  # type: ignore[arg-type]


def test_adv1_same_crd_one_firm():
    a = normalize_row(row({"Organization CRD#": "111"}))
    b = normalize_row(row({"Organization CRD#": "111", "Legal Name": "ALPHA ADVISERS LLC AMENDED"}))
    assert a.crd == b.crd == "111"


def test_adv2_same_name_different_crd():
    a = normalize_row(row({"Organization CRD#": "111"}))
    b = normalize_row(row({"Organization CRD#": "222"}))
    assert a.crd != b.crd


def test_adv3_sec_number_separate_from_crd():
    n = normalize_row(row({"Organization CRD#": "111", "SEC#": "801-999"}))
    assert n.crd == "111"
    assert n.sec_file_number and "801" in n.sec_file_number


def test_adv4_raum_source_preserved():
    n = normalize_row(row({"5F(2)(c)": "$1,000,000"}))
    assert n.raum_amount == "1000000.00"


def test_adv5_client_data_source_preserved():
    e = extract_enrichment(row({"5C(1)": "12"}).values, dataset_kind="ria")
    assert e["clients_5c1"] == "12"


def test_adv6_no_fee_only_inference():
    e = extract_enrichment(row({"5E(1)": "Y", "5E(4)": "Y"}).values, dataset_kind="ria")
    assert "percentage_of_assets" in e["compensation_methods"]
    assert e["fee_only_inferred"] is False
    assert "fee_only" not in e["compensation_methods"]


def test_adv7_custody_yes_is_not_risk_score():
    e = extract_enrichment(row({"9A(1)(a)": "Y"}).values, dataset_kind="ria")
    assert e["custody_cash_reported"] is True
    assert e["custody_risk_score"] is None


def test_adv8_affiliation_is_not_conflict():
    e = extract_enrichment(row({"7A(1)": "Y"}).values, dataset_kind="ria")
    assert "broker_dealer" in e["affiliation_types"]
    assert e["conflict_finding"] is False


def test_adv9_control_persons_as_evidence_not_people():
    e = extract_enrichment(row({"10A": "Y"}).values, dataset_kind="ria")
    assert e["control_persons_reported"] is True
    assert e["named_schedule_d_funds"] == []


def test_adv10_item11_not_misconduct_label():
    e = extract_enrichment(row({"11": "Y", "11A(1)": "Y"}).values, dataset_kind="ria")
    assert e["disclosure_indicator"] == "Y"
    assert "criminal_felony" in e["disclosure_categories"]
    assert "misconduct" not in str(e).lower()


def test_adv11_private_fund_counts_not_named_funds():
    e = extract_enrichment(row({"7B": "Y", "Count of Private Funds - 7B(1)": "3"}).values, dataset_kind="ria")
    assert e["private_funds_reported"] is True
    assert e["private_fund_count_7b1"] == "3"
    assert e["named_schedule_d_funds"] == []


def test_adv12_normalize_does_not_drop_crd_on_amendment_name():
    first = normalize_row(row({"Organization CRD#": "9", "Legal Name": "OLD"}))
    second = normalize_row(row({"Organization CRD#": "9", "Legal Name": "NEW"}))
    assert first.crd == second.crd


def test_adv13_conflicting_observations_can_coexist_in_payload():
    e = extract_enrichment(row({"11": "N", "11A(1)": "Y"}).values, dataset_kind="ria")
    assert e["disclosure_indicator"] == "N"
    assert "criminal_felony" in e["disclosure_categories"]


def test_adv14_not_found_is_not_clean():
    e = extract_enrichment(row({"11": ""}).values, dataset_kind="ria")
    assert e["disclosure_indicator"] is None


def test_adv15_successor_requires_different_crd():
    same = extract_enrichment(
        row({"4A": "Y", "Organization CRD#": "50", "Acquired Firm CRD#": "50"}).values,
        dataset_kind="ria",
    )
    other = extract_enrichment(
        row({"4A": "Y", "Organization CRD#": "50", "Acquired Firm CRD#": "99"}).values,
        dataset_kind="ria",
    )
    assert same["successor_acquired_crd"] is None
    assert other["successor_acquired_crd"] == "99"


def test_adv16_name_does_not_override_crd():
    a = normalize_row(row({"Organization CRD#": "1", "Legal Name": "SAME"}))
    b = normalize_row(row({"Organization CRD#": "2", "Legal Name": "SAME"}))
    assert a.crd != b.crd


def test_adv17_no_trust_score():
    e = extract_enrichment(row({}).values, dataset_kind="ria")
    assert e["trust_score"] is None


def test_adv18_wave1_indexing_untouched_by_parser():
    e = extract_enrichment(row({}).values, dataset_kind="ria")
    assert "indexable" not in e


def test_adv19_parser_does_not_create_pages():
    e = extract_enrichment(row({}).values, dataset_kind="ria")
    assert "slug" not in e


def test_adv20_extract_is_deterministic():
    r = row({"5E(1)": "Y", "7B": "Y"}).values
    assert extract_enrichment(r, dataset_kind="ria") == extract_enrichment(r, dataset_kind="ria")


def test_era_never_classified_as_ria():
    classified = classify(row({"Firm Type": "ERA"}, kind="era"))
    assert classified[0] == "exempt_reporting_adviser"


def test_crd_digits_only():
    assert normalize_crd(" 0123 ") == "0123"
