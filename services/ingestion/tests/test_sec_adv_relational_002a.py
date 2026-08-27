"""INV-NAT-002A tests 1-22. No production writes."""

from __future__ import annotations

import json
from pathlib import Path

from ith_ingestion.sec_adv.relational_identity import (
    classify_de_fe_i,
    classify_schedule,
    edge_is_current,
    filing_identity_key,
    firm_identity_confidence,
    fund_identity_confidence,
    historical_firm_publication_allowed,
    named_party_identity_confidence,
    office_source_key,
    owner_identity_confidence,
)

ROOT = Path(__file__).resolve().parents[3]
REPORTS = ROOT / "data" / "reports"
MIGRATION = ROOT / "database" / "migrations" / "0013_adv_relational_graph.sql"
SQL_EDITOR = ROOT / "docs" / "INV-NAT-002-SQL-EDITOR.md"


def _load(name: str) -> dict:
    path = REPORTS / name
    assert path.exists(), f"missing {name}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_01_official_sources_fingerprinted():
    manifest = _load("inv-nat-002-source-manifest.json")
    families = {f["family"] for f in manifest["files"]}
    assert "historical_part1" in families
    assert "adv_w" in families
    assert "iapd_part1_monthly" in families
    assert "iapd_compilation" in families
    assert "form_crs_mapping" in families
    assert "iard_foia_roster" in families
    for rec in manifest["files"]:
        assert rec["sha256"] and len(rec["sha256"]) == 64
        assert rec["bytes"] > 0


def test_02_filing_identity_is_official_filing_id():
    dry = _load("inv-nat-002-dry-run.json")
    hist = dry["historical_tables"]
    ia = hist["ia_base"]
    assert "FilingID" in ia["columns"]
    assert ia["distinct_filing_id"] == ia["rows"] - ia["duplicate_filing_id_rows"]
    assert filing_identity_key("1000000") == "1000000"


def test_03_no_invented_accession():
    text = (ROOT / "services" / "ingestion" / "src" / "ith_ingestion" / "sec_adv" / "relational_identity.py").read_text(
        encoding="utf-8"
    )
    assert "Do not invent" in Path(
        ROOT / "database" / "migrations" / "0013_adv_relational_graph.sql"
    ).read_text(encoding="utf-8") or "Do not invent an accession" in Path(
        ROOT / "database" / "migrations" / "0013_adv_relational_graph.sql"
    ).read_text(encoding="utf-8")
    try:
        filing_identity_key("")
        raise AssertionError("empty filing id must fail")
    except ValueError:
        pass


def test_04_schedule_a_direct_owners():
    dry = _load("inv-nat-002-dry-run.json")
    ab = dry["historical_tables"]["ia_ab"]
    assert classify_schedule("A") == "A"
    assert ab["direct_owner_rows"] > 0
    assert ab["people_rows"] > 0
    assert ab["organization_rows"] > 0


def test_05_schedule_b_indirect_owners():
    dry = _load("inv-nat-002-dry-run.json")
    ab = dry["historical_tables"]["ia_ab"]
    assert classify_schedule("B") == "B"
    assert ab["indirect_owner_rows"] > 0
    assert set(ab["schedule_counts"]) >= {"A", "B"} or "A" in ab["schedule_counts"]


def test_06_named_private_funds_located():
    dry = _load("inv-nat-002-dry-run.json")
    funds = dry["historical_tables"]["ia_funds"]
    assert "Fund Name" in funds["columns"]
    assert "Fund ID" in funds["columns"]
    assert funds["named_fund_rows"] > 0
    assert funds["distinct_fund_ids"] > 0
    assert fund_identity_confidence(fund_id="805-1234567890", fund_name="TEST FUND") == "CONFIRMED"
    assert fund_identity_confidence(fund_id=None, fund_name="TEST FUND") == "REVIEW_REQUIRED"


def test_07_service_providers_only_from_named_rows():
    dry = _load("inv-nat-002-dry-run.json")
    hist = dry["historical_tables"]
    assert hist["custodians"]["named_rows"] > 0
    assert hist["auditors"]["named_rows"] > 0
    assert hist["administrators"]["named_rows"] > 0
    assert hist["prime_brokers"]["named_rows"] > 0
    assert hist["marketers"]["named_rows"] > 0
    assert "Name of Marketer" in hist["marketers"]["columns"]


def test_08_advw_is_withdrawal_not_misconduct():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["advw"]["through_2024"]["rows"] > 0
    assert dry["advw"]["through_2024"]["distinct_crds"] > 0
    assert dry["semantic_safety"]["advw_is_misconduct"] is False


def test_09_part2a_and_crs_cataloged():
    dry = _load("inv-nat-002-dry-run.json")
    crs = dry["crs"]["2026-07"]
    assert crs["rows"] > 0
    assert crs["distinct_crds"] > 0
    assert crs["distinct_crs_ids"] > 0
    assert dry["documents"]["part2a_official_monthly_archives_cataloged"] is True
    assert dry["documents"]["part2a_bulk_pdf_ingested"] == 0


def test_10_historical_and_current_not_conflated():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["currentness"]["fail_closed"] is True
    assert edge_is_current(
        crd_on_current_roster=True,
        filing_is_latest_for_crd=True,
        source_is_current_snapshot=False,
    ) is False
    assert dry["semantic_safety"]["historical_edges_marked_current"] is False


def test_11_collisions_quantified():
    census = _load("inv-nat-002-collision-census.json")
    assert "firms" in census["collisions"]
    assert "people" in census["collisions"]
    assert "organizations" in census["collisions"]
    assert "funds" in census["collisions"]
    assert "filings" in census["collisions"]
    assert census["historical_firms"]["publication"] == "NO"


def test_12_migration_0013_prepared_not_applied():
    assert MIGRATION.exists()
    text = MIGRATION.read_text(encoding="utf-8")
    assert "DO NOT APPLY" in text
    assert "form_adv_filings" in text
    assert "is_current BOOLEAN NOT NULL DEFAULT FALSE" in text
    dry = _load("inv-nat-002-dry-run.json")
    assert "0013_adv_relational_graph.sql" not in dry["production_baseline"]["schema_migrations"]
    assert SQL_EDITOR.exists()
    assert "DO NOT APPLY" in SQL_EDITOR.read_text(encoding="utf-8")


def test_13_dry_run_separates_graph_layers():
    dry = _load("inv-nat-002-dry-run.json")
    assert "records" in dry
    assert "entities" in dry
    assert "relationships" in dry
    assert "documents" in dry
    assert dry["production_untouched"] is True
    assert dry["people_written"] == 0
    assert dry["products_written"] == 0
    assert dry["disclosure_events_written"] == 0


def test_14_wave1_remains_1000():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["production_baseline"]["indexable"] == 1000
    assert dry["indexable_unchanged"] is True
    assert dry["semantic_safety"]["wave1_expanded"] is False


def test_15_no_public_entities_created():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["production_baseline"]["people"] == 0
    assert dry["production_baseline"]["products"] == 0
    assert dry["production_baseline"]["disclosure_events"] == 0
    assert historical_firm_publication_allowed(False) is False


def test_16_person_vs_organization_vs_firm():
    assert classify_de_fe_i("I") == "PERSON"
    assert classify_de_fe_i("DE") == "ORGANIZATION"
    assert classify_de_fe_i("FE") == "ORGANIZATION"
    assert owner_identity_confidence(owner_id=None, name="JANE DOE", kind="PERSON") == "REVIEW_REQUIRED"
    assert firm_identity_confidence("12345") == "CONFIRMED"
    assert named_party_identity_confidence(name="ACME CUSTODY LLC", crd=None) == "REVIEW_REQUIRED"
    assert named_party_identity_confidence(name="ACME CUSTODY LLC", crd="999") == "CONFIRMED"


def test_17_item11_does_not_create_disclosure_events():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["semantic_safety"]["item_11_checkbox_creates_disclosure_events"] is False
    assert dry["semantic_safety"]["result"] == "PASS"


def test_18_item7b_count_does_not_mint_funds():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["semantic_safety"]["item_7b_count_mints_funds"] is False
    funds = dry["historical_tables"]["ia_funds"]
    assert "Fund Name" in funds["columns"]


def test_19_name_similarity_is_not_identity():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["semantic_safety"]["name_similarity_is_identity"] is False
    census = _load("inv-nat-002-collision-census.json")
    assert "Do not merge people on name" in census["collisions"]["people"]["rule"]


def test_20_ria_era_not_collapsed():
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["semantic_safety"]["era_collapsed_into_ria"] is False
    assert dry["historical_tables"]["ia_base"]["rows"] > 0
    assert dry["historical_tables"]["era_base"]["rows"] > 0


def test_21_compilation_is_not_named_schedules():
    tags = json.loads((REPORTS / "inv-nat-002-compilation-tags.json").read_text(encoding="utf-8"))
    names = {n for n, _ in tags["element_counts"]}
    assert "Firm" in names
    assert "Item7B" in names
    assert "Fund Name" not in names
    assert tags["heuristic"]["owner_count"] == 0
    assert tags["heuristic"]["fund_count"] == 0


def test_22_office_identity_is_source_key():
    key = office_source_key(
        street_1="1 Main St",
        city="Miami",
        region="FL",
        postal_code="33101",
        country="US",
        branch_number="2",
    )
    assert "miami" in key
    assert "FL" in key
    dry = _load("inv-nat-002-dry-run.json")
    assert dry["historical_tables"]["ia_offices"]["rows"] > 0
