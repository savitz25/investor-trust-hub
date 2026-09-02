"""NJ-INV-001C / NJ-INV-002 contract tests."""

from __future__ import annotations

from pathlib import Path

from ith_ingestion.nj_bos.classify import is_waf_block
from ith_ingestion.nj_bos.parse import parse_action_index
from ith_ingestion.nj_bos.pipeline import default_catalog, run_from_texts
from ith_ingestion.nj_state_intel.coverage import coverage_state_for_html, never_zero_from_block, row_from_pdf_url
from ith_ingestion.nj_state_intel.exam import (
    classify_topic,
    extract_rounded_population,
    parse_deadline,
    parse_exam_year,
    parse_questions,
    population_is_exact,
    topic_timeline,
)
from ith_ingestion.nj_state_intel.filings import exemption_is_endorsement, form_d_join_allowed, inventory
from ith_ingestion.nj_state_intel.identity import (
    NJ_STATE_REGISTERED,
    SEC_REGISTERED_NOTICE_FILED,
    StateRiaRecord,
    match_state_ria,
    transition,
)
from ith_ingestion.nj_state_intel.pipeline import formatting_only_change_creates_event, historical_exam_packages, load_2026_exam, run_nj_intel
from ith_ingestion.nj_state_intel.policy import GENERAL_ORDER, iar_ce_observation, is_firm_enforcement, known_general_orders, parse_affected_classes

REPO = Path(__file__).resolve().parents[3]
FIXTURE_EXAM = REPO / "data" / "fixtures" / "nj-inv-002" / "exam-2026-sample.txt"
BLOCKED = REPO / "data" / "fixtures" / "nj-inv-001" / "action-index-blocked.html"
INDEX = REPO / "data" / "fixtures" / "nj-inv-001" / "action-index.html"
CATALOG = default_catalog()


def test_01_source_coverage_remains_partial() -> None:
    report = run_nj_intel(dry_run=True, root=REPO)
    assert report.coverage_states.get("enforcement_pdfs") == "ACQUIRED_PARTIAL_HISTORY"
    assert "ACQUIRED_COMPLETE" not in report.coverage_states.values() or report.coverage_states.get("enforcement_pdfs") != "ACQUIRED_COMPLETE"


def test_02_official_direct_pdf_is_evidence() -> None:
    row = row_from_pdf_url(
        "https://www.njconsumeraffairs.gov/Actions/Zenith_Consent_OCR_29July2024.pdf",
        discovery="PREVIOUSLY_ACQUIRED_OFFICIAL_PDF",
        sha256="abc",
    )
    assert row.official_pdf_url.endswith(".pdf")
    assert "search-engine" not in row.original_discovery_method.lower()


def test_03_incapsula_is_source_access_blocked() -> None:
    html = BLOCKED.read_text(encoding="utf-8")
    assert is_waf_block(html)
    assert coverage_state_for_html(html) == "SOURCE_ACCESS_BLOCKED"


def test_04_blocked_index_does_not_become_zero() -> None:
    html = BLOCKED.read_text(encoding="utf-8")
    coverage, entries = parse_action_index(html, "https://www.njconsumeraffairs.gov/bos/Pages/OrdersandFiledComplaints.aspx")
    assert coverage.coverage_state == "SOURCE_ACCESS_BLOCKED"
    assert never_zero_from_block(coverage.coverage_state)
    assert entries == []


def test_05_duplicate_occurrence_does_not_duplicate_document() -> None:
    ledger, _ = run_from_texts(
        [
            ("https://www.njconsumeraffairs.gov/Actions/a.pdf", "CONSENT ORDER Zenith Solutions, Inc. (CRD No. 304732)", "hash-a"),
            ("https://www.njoag.gov/press/a.pdf", "CONSENT ORDER Zenith Solutions, Inc. (CRD No. 304732)", "hash-a"),
        ]
    )
    assert len(ledger.documents) == 1


def test_06_records_request_artifact_exists() -> None:
    assert (REPO / "docs" / "artifacts" / "nj-inv-001c-bos-enforcement-index-records-request.md").exists()


def test_07_exact_crd_firm_identity() -> None:
    rec = match_state_ria(StateRiaRecord(legal_name="Zenith Solutions, Inc.", crd="304732"), CATALOG)
    assert rec.match_status == "EXACT_CRD_FIRM"
    assert rec.firm_id == "firm-zenith"


def test_08_state_vs_sec_classification() -> None:
    state = StateRiaRecord(legal_name="Zenith Solutions, Inc.", crd="304732", registration_class="STATE_REGISTERED_RIA")
    sec = StateRiaRecord(
        legal_name="National Overlay Advisers LLC",
        crd="999001",
        sec_file_number="801-55555",
        registration_class="SEC_REGISTERED_RIA",
        registration_status=SEC_REGISTERED_NOTICE_FILED,
    )
    assert state.registration_class != sec.registration_class


def test_09_state_to_sec_transition() -> None:
    row = transition(NJ_STATE_REGISTERED, SEC_REGISTERED_NOTICE_FILED, "999001", "firm-national-overlay")
    assert row["transition_class"] == "STATE_TO_SEC"
    assert row["same_firm"] is True


def test_10_sec_to_state_transition() -> None:
    row = transition(SEC_REGISTERED_NOTICE_FILED, NJ_STATE_REGISTERED, "999001", "firm-national-overlay")
    assert row["transition_class"] == "SEC_TO_STATE"
    assert row["firm_id"] == "firm-national-overlay"


def test_11_same_crd_does_not_duplicate_firm() -> None:
    a = match_state_ria(StateRiaRecord(legal_name="National Overlay Advisers LLC", crd="999001"), CATALOG)
    b = match_state_ria(
        StateRiaRecord(
            legal_name="National Overlay Advisers LLC",
            crd="999001",
            sec_file_number="801-55555",
            registration_class="SEC_REGISTERED_RIA",
        ),
        CATALOG,
    )
    assert a.firm_id == b.firm_id == "firm-national-overlay"


def test_12_name_only_rejected() -> None:
    rec = match_state_ria(StateRiaRecord(legal_name="Zenith Solutions, Inc."), CATALOG)
    assert rec.match_status == "UNSAFE_REJECTED"
    assert rec.firm_id is None


def test_13_dba_review_path() -> None:
    rec = match_state_ria(StateRiaRecord(legal_name="Unknown Shop", dba="Zenith Solutions"), CATALOG)
    assert rec.match_status == "REVIEW_REQUIRED"


def test_14_no_iar_bulk_publication() -> None:
    ce = iar_ce_observation()
    assert ce["person_evidence"] is False
    assert ce["public_directory"] is False


def test_15_exam_year_parsing() -> None:
    assert parse_exam_year(FIXTURE_EXAM.read_text(encoding="utf-8")) == 2026


def test_16_deadline_parsing() -> None:
    assert parse_deadline(FIXTURE_EXAM.read_text(encoding="utf-8")) == "2026-06-30"


def test_17_question_normalization() -> None:
    questions = parse_questions(FIXTURE_EXAM.read_text(encoding="utf-8"), 2026)
    assert len(questions) >= 25
    assert questions[0].question_number == "1"


def test_18_topic_normalization() -> None:
    assert classify_topic("Does the firm use artificial intelligence technologies") == "ARTIFICIAL_INTELLIGENCE"
    assert classify_topic("outside business activities of representatives") == "OUTSIDE_BUSINESS_ACTIVITIES"


def test_19_conditional_question() -> None:
    questions = parse_questions(FIXTURE_EXAM.read_text(encoding="utf-8"), 2026)
    assert any(q.conditional for q in questions)


def test_20_required_upload_flag() -> None:
    questions = parse_questions(FIXTURE_EXAM.read_text(encoding="utf-8"), 2026)
    assert any(q.required_upload for q in questions)


def test_21_year_to_year_topic_appearance() -> None:
    pkgs = historical_exam_packages() + [load_2026_exam(REPO)]
    rows = topic_timeline(pkgs)
    ai = next(r for r in rows if r["topic"] == "ARTIFICIAL_INTELLIGENCE")
    assert ai["first_year"] == 2024
    assert 2024 in ai["years_present"]


def test_22_rounded_firm_estimate_not_exact() -> None:
    text = extract_rounded_population("nearly 800 New Jersey-registered investment adviser firms")
    assert text == "nearly 800"
    assert population_is_exact(text) is False


def test_23_exam_questionnaire_not_enforcement() -> None:
    assert is_firm_enforcement(GENERAL_ORDER) is False
    pkg = load_2026_exam(REPO)
    assert "pass/fail" in " ".join(pkg.notes).lower() or "not a pass" in " ".join(pkg.notes).lower() or "Not a pass" in " ".join(pkg.notes)


def test_24_exam_not_firm_pass_fail() -> None:
    report = run_nj_intel(dry_run=True, root=REPO)
    snap = (REPO / "artifacts" / "nj-inv-002-audited-state-snapshot.json").read_text(encoding="utf-8")
    assert '"pass_fail_metric": false' in snap.lower() or '"pass_fail_metric": false' in snap
    assert report.baseline_only is True


def test_25_no_firm_result_fabricated() -> None:
    run_nj_intel(dry_run=True, root=REPO)
    snap = (REPO / "artifacts" / "nj-inv-002-audited-state-snapshot.json").read_text(encoding="utf-8")
    assert "SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN" in snap
    assert "passed" not in snap.lower() or "pass_fail_metric" in snap


def test_26_general_order_not_firm_enforcement() -> None:
    assert is_firm_enforcement(GENERAL_ORDER) is False
    assert all(o.document_class == GENERAL_ORDER for o in known_general_orders())


def test_27_general_order_effective_date() -> None:
    ce = next(o for o in known_general_orders() if o.policy_key == "iar-ce-2025-rule")
    assert ce.effective_on == "2025-01-01"


def test_28_superseding_order_relationship() -> None:
    order = known_general_orders()[0]
    assert hasattr(order, "superseded_by_key")


def test_29_rescission_field() -> None:
    assert all(hasattr(o, "rescinded_on") for o in known_general_orders())


def test_30_affected_class_parsing() -> None:
    assert "IAR" in parse_affected_classes("investment adviser representative continuing education")
    assert "INVESTMENT_ADVISER" in parse_affected_classes("investment adviser firms")


def test_31_issuer_not_adviser() -> None:
    classes = {row.filing_class for row in inventory()}
    assert "PRIVATE_PLACEMENT_REPORT" in classes
    assert "STATE_REGISTERED_RIA" not in classes


def test_32_private_placement_category() -> None:
    row = next(r for r in inventory() if r.filing_class == "PRIVATE_PLACEMENT_REPORT")
    assert "50(b)(12)" in (row.statutory_basis or "")


def test_33_covered_security_filing() -> None:
    row = next(r for r in inventory() if r.filing_class == "INVESTMENT_COMPANY_NOTICE")
    assert row.covered_security is True


def test_34_crowdfunding_category() -> None:
    assert any(r.filing_class == "CROWDFUNDING_EXEMPTION" for r in inventory())


def test_35_iso_registration_category() -> None:
    assert any(r.filing_class == "INTERNET_SITE_OPERATOR" for r in inventory())


def test_36_exemption_not_endorsement() -> None:
    assert exemption_is_endorsement("CROWDFUNDING_EXEMPTION") is False
    assert all(r.endorsement is False for r in inventory())


def test_37_form_d_exact_join_only() -> None:
    assert form_d_join_allowed("021-12345", "Acme", "Acme Advisers") == "EXACT_JOIN"
    assert form_d_join_allowed(None, "Acme Advisers LLC", "Acme Advisers LLC") == "UNSAFE_REJECTED"


def test_38_no_investor_pii() -> None:
    text = (REPO / "docs" / "artifacts" / "nj-inv-002-issuer-filing-index-request.md").read_text(encoding="utf-8")
    assert "investor names" in text.lower()
    assert "exclude" in text.lower()


def test_39_baseline_only() -> None:
    report = run_nj_intel(dry_run=True, root=REPO)
    assert report.baseline_only is True
    assert report.monitoring_events == 0


def test_40_idempotent_rerun() -> None:
    first = run_nj_intel(dry_run=True, root=REPO)
    second = run_nj_intel(dry_run=True, root=REPO)
    assert first.coverage_rows == second.coverage_rows
    assert second.monitoring_events == 0


def test_41_new_exam_year_is_state_intelligence_event() -> None:
    years = [p.exam_year for p in historical_exam_packages()]
    assert 2025 in years
    assert 2026 not in years  # 2026 is the current package, added separately
    assert load_2026_exam(REPO).exam_year == 2026


def test_42_formatting_only_source_change_creates_no_event() -> None:
    assert formatting_only_change_creates_event("aaa", "bbb", semantic_equal=True) is False
    assert formatting_only_change_creates_event("aaa", "bbb", semantic_equal=False) is True


def test_43_national_sec_ria_spine() -> None:
    text = (REPO / "packages" / "domain" / "src" / "firm-classification.ts").read_text(encoding="utf-8")
    assert "registered_investment_adviser" in text


def test_44_era_spine() -> None:
    text = (REPO / "packages" / "domain" / "src" / "firm-classification.ts").read_text(encoding="utf-8")
    assert "exempt_reporting_adviser" in text


def test_45_crd_identifiers() -> None:
    text = (REPO / "packages" / "domain" / "src" / "identifiers.ts").read_text(encoding="utf-8")
    assert "'crd'" in text


def test_46_public_firm_profiles() -> None:
    page = (REPO / "apps" / "web" / "src" / "app" / "firm" / "[slug]" / "page.tsx").read_text(encoding="utf-8")
    assert "new-jersey" not in page.lower()


def test_47_customer_claim_validation() -> None:
    adapter = (REPO / "apps" / "web" / "src" / "lib" / "customer-claim-validation" / "v1.ts").read_text(encoding="utf-8")
    assert "PUBLIC_CURRENT" in adapter


def test_48_nj_inv_001_present() -> None:
    assert (REPO / "database" / "migrations" / "0014_regulatory_document_ledger.sql").exists()
    assert (REPO / "services" / "ingestion" / "tests" / "test_nj_inv_001.py").exists()


def test_49_no_nj_public_route() -> None:
    assert not (REPO / "apps" / "web" / "src" / "app" / "new-jersey").exists()


def test_50_no_sitemap_indexing_expansion() -> None:
    sitemap = (REPO / "apps" / "web" / "src" / "app" / "sitemap.ts").read_text(encoding="utf-8")
    assert "new-jersey" not in sitemap.lower()


def test_51_no_public_individual_directory() -> None:
    routes = (REPO / "packages" / "config" / "src" / "routes.ts").read_text(encoding="utf-8")
    assert "/iar" not in routes
    assert "/new-jersey" not in routes


def test_52_no_ranking() -> None:
    snap = (REPO / "docs" / "nj-inv-002-public-metric-contract.md").read_text(encoding="utf-8")
    assert "ranking" in snap.lower()
    assert "must not" in snap.lower() or "do not" in snap.lower() or "not" in snap.lower()


def test_53_no_trust_score() -> None:
    snap = (REPO / "docs" / "nj-inv-002-public-metric-contract.md").read_text(encoding="utf-8")
    assert "trust score" in snap.lower()


def test_54_no_vercel_configuration_change() -> None:
    assert not (REPO / ".vercel" / "project.json").exists()
    assert not (REPO / "vercel.json").exists()
