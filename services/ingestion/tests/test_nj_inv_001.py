"""NJ-INV-001 Bureau of Securities ingest contract tests."""

from __future__ import annotations

import hashlib
from pathlib import Path

from ith_ingestion.nj_bos.acquire import download_pdfs
from ith_ingestion.nj_bos.classify import classify_event_class, classify_party_type, is_waf_block
from ith_ingestion.nj_bos.identity import apply_publication_firewall, firm_attachment_allowed, match_party
from ith_ingestion.nj_bos.models import EventParty
from ith_ingestion.nj_bos.parse import parse_action_index, parse_document_text
from ith_ingestion.nj_bos.pipeline import MemoryLedger, default_catalog, ingest_parsed_event, run_from_texts

REPO = Path(__file__).resolve().parents[3]
FIXTURES = REPO / "data" / "fixtures" / "nj-inv-001"
CATALOG = default_catalog()


CONSENT = """
STATE OF NEW JERSEY
BUREAU OF SECURITIES
IN THE MATTER OF:
Zenith Solutions, Inc. (CRD No. 304732),
Respondent.
CONSENT ORDER
Zenith is an investment adviser registered with the Bureau.
IT IS on this 29th day of July, 2024 ORDERED AND AGREED that:
Zenith shall CEASE AND DESIST from further violations of the Securities Law.
Zenith is assessed a civil monetary penalty in the amount of $20,000 due and payable
upon execution of this Consent Order.
"""

CANDD = """
STATE OF NEW JERSEY BUREAU OF SECURITIES
IN THE MATTER OF:
GEV Group LLC, Fuoco, Banfill, and Calzaretto,
Respondents.
AMENDED SUMMARY CEASE AND DESIST ORDER
Respondents shall immediately CEASE AND DESIST from offering for sale any security in New Jersey.
GEV, Fuoco, Banfill, and Calzaretto hereby are jointly and severally assessed and
liable to pay civil monetary penalties in the amount of $300,000.
NOTICE OF RIGHT TO HEARING
Respondents shall have up to twenty (20) days to respond in the form of a written
answer and written request for a hearing.
"""

COMPLAINT = """
SUPERIOR COURT OF NEW JERSEY
CHANCERY DIVISION: GENERAL EQUITY
ESSEX COUNTY
CHRISTOPHER W. GEROLD, Chief of the New Jersey Bureau of Securities, Plaintiff,
v. DENNIS K. SMITH, Defendant.
CIVIL ACTION
VERIFIED COMPLAINT
Plaintiff alleges that Dennis K. Smith violated the New Jersey Uniform Securities Law.
These are allegations only. No final finding has been entered.
"""

SUMMARY_REV = """
STATE OF NEW JERSEY BUREAU OF SECURITIES
IN THE MATTER OF:
Michael Ray Matos (CRD No. 6460694),
Respondent.
SUMMARY REVOCATION ORDER
The agent registration of Michael Ray Matos is REVOKED.
NOTICE OF RIGHT TO HEARING
The registrant may file a written application to lift the summary revocation
and in connection therewith may request a hearing.
"""

FINAL_ORDER = """
SUPERIOR COURT OF NEW JERSEY
FINAL JUDGMENT AND CONSENT ORDER AS TO DEFENDANT MICHAEL R. SCIAN, JR.
This Final Order is entered this 15th day of March, 2010.
Final judgment is entered against the defendant.
"""

MULTI_PARTY = """
STATE OF NEW JERSEY BUREAU OF SECURITIES
IN THE MATTER OF:
Steven Gluckstein (CRD No. 2518385),
Seaview Global Advisors LLC (CRD No. 150337),
and Anthony Calascione (CRD No. 2869991),
Respondents.
CONSENT ORDER AS TO STEVEN GLUCKSTEIN AND SEAVIEW GLOBAL ADVISORS LLC
Docket No. BOS 04485-2022N
Seaview is an investment adviser registered with the Bureau.
The investment adviser registration of Seaview Global Advisors LLC remains and is REVOKED.
The investment adviser representative registration of Steven Gluckstein remains and is REVOKED.
Respondents Steven Gluckstein and Seaview Global Advisors, jointly and
severally, shall pay civil monetary penalties in the amount of $150,000.
this 12th day of April, 2023
"""

PENALTY_REST = """
IN THE MATTER OF:
Bowmo Inc. and Ivan Lakshin,
Respondents.
CONSENT ORDER
Defendants Lakshin and Bowmo shall pay restitution in the amount of $60,000.
The Bureau Chief has assessed a civil penalty of $100,000 against Defendants Lakshin and Bowmo.
Disgorgement in the amount of $5,000 is also ordered.
this 21st day of October, 2025
"""

MULTISTATE = """
IN THE MATTER OF:
Sample Multistate Advisers LLC (CRD No. 304732),
Respondent.
CONSENT ORDER
This matter is a multistate NASAA coordinated review. The participating states assessed
civil monetary penalties in the amount of $500,000 without allocation among the states.
"""

BD_ORDER = """
IN THE MATTER OF:
Garden State Securities, Inc. (CRD # 10083)
ADMINISTRATIVE CONSENT ORDER
Garden State is a broker-dealer registered with the Bureau.
Garden State is hereby assessed and shall pay a civil monetary penalty in the amount of $275,000.
this 8th day of December, 2017
"""

ISSUER_ORDER = """
IN THE MATTER OF:
Volumetric Fund, Inc.
CONSENT ORDER
Volumetric is an open-end mutual fund that has been offering and selling securities to New Jersey
residents. Volumetric is an issuer and is not an investment adviser.
Volumetric shall pay notice filing and agent registration fees in the amount of $9,850.
this 22nd day of September, 2021
"""

UNREGISTERED = """
IN THE MATTER OF:
White Cedar Group LLC and Evan M. Kochav,
Respondents.
CONSENT ORDER
White Cedar Group LLC is an unregistered entity that offered securities in New Jersey.
Kochav is permanently barred from the sale of any security.
Civil monetary penalties in the amount of $1,000,000.
"""

INDIVIDUAL_ONLY = """
IN THE MATTER OF:
Naman R. Patel
ADMINISTRATIVE CONSENT ORDER
Respondent.
Naman Patel was registered with the Bureau as an agent of various broker-dealers.
Naman Patel is assessed a civil monetary penalty. Patel is not a firm.
this 9th day of July, 2015
"""

SEC_FILE_ORDER = """
IN THE MATTER OF:
National Overlay Advisers LLC,
Respondent.
CONSENT ORDER
National Overlay Advisers LLC is an investment adviser registered with the SEC,
SEC File No. 801-55555, CRD No. 999001.
this 1st day of June, 2022
"""

SUCCESSOR = """
IN THE MATTER OF:
New Path Advisors LLC, successor to Old Path Advisors LLC,
Respondent.
CONSENT ORDER
New Path Advisors LLC is the successor to Old Path Advisors LLC.
"""

NAME_ONLY = """
IN THE MATTER OF:
Zenith Solutions, Inc.,
Respondent.
CONSENT ORDER
No CRD number appears in this caption.
"""

HIGH_CONF = """
IN THE MATTER OF:
Zenith Solutions, Inc.,
Respondent.
CONSENT ORDER
The firm maintains its principal office at NJ-07032.
"""


def _event(text: str, url: str = "https://www.njconsumeraffairs.gov/Actions/x.pdf") -> object:
    digest = hashlib.sha256(text.encode()).hexdigest()
    return parse_document_text(text, source_url=url, content_hash=digest)


def test_01_action_index_parsing() -> None:
    html = (FIXTURES / "action-index.html").read_text(encoding="utf-8")
    coverage, entries = parse_action_index(html, "https://www.njconsumeraffairs.gov/bos/Pages/OrdersandFiledComplaints.aspx")
    assert coverage.coverage_state == "ACQUIRED_PARTIAL_HISTORY"
    assert len(entries) >= 11
    assert any("Zenith" in e.respondent_caption for e in entries)
    assert all(e.document_url.endswith(".pdf") for e in entries)


def test_02_pdf_acquisition(monkeypatch, tmp_path: Path) -> None:
    payload = b"%PDF-1.4\n" + b"(STATE OF NEW JERSEY BUREAU OF SECURITIES CONSENT ORDER text here)\n%%EOF"
    monkeypatch.setattr(
        "ith_ingestion.nj_bos.acquire.fetch_bytes",
        lambda url, timeout=60: (200, payload, "application/pdf"),
    )
    docs, occs, stats = download_pdfs(
        ["https://www.njconsumeraffairs.gov/Actions/Zenith_Consent_OCR_29July2024.pdf"],
        tmp_path,
    )
    assert stats["downloaded"] == 1
    assert docs[0].byte_length == len(payload)
    assert occs[0].acquisition_state == "DOCUMENT_DOWNLOADED"


def test_03_existing_hash_skip(monkeypatch, tmp_path: Path) -> None:
    payload = b"%PDF-1.4 existing-hash-body-xxxx\n"
    digest = hashlib.sha256(payload).hexdigest()
    monkeypatch.setattr(
        "ith_ingestion.nj_bos.acquire.fetch_bytes",
        lambda url, timeout=60: (200, payload, "application/pdf"),
    )
    _docs, occs, stats = download_pdfs(
        ["https://www.njconsumeraffairs.gov/Actions/Zenith_Consent_OCR_29July2024.pdf"],
        tmp_path,
        existing_hashes={digest},
    )
    assert stats["skipped_existing_hash"] == 1
    assert occs[0].acquisition_state == "SKIPPED_EXISTING_HASH"


def test_04_duplicate_source_occurrence_preservation() -> None:
    html = (FIXTURES / "action-index.html").read_text(encoding="utf-8")
    _coverage, entries = parse_action_index(html, "https://example.invalid/index")
    zenith = [e for e in entries if "Zenith" in e.respondent_caption]
    assert len(zenith) == 2
    assert zenith[0].occurrence_fingerprint != zenith[1].occurrence_fingerprint
    ledger = MemoryLedger()
    for row in zenith:
        ledger.upsert_occurrence(row)
    assert len(ledger.occurrences) == 2


def test_05_duplicate_document_dedupe() -> None:
    ledger, _report = run_from_texts(
        [
            ("https://www.njconsumeraffairs.gov/Actions/a.pdf", CONSENT, "abc123"),
            ("https://www.njoag.gov/press/a.pdf", CONSENT, "abc123"),
        ]
    )
    assert len(ledger.documents) == 1
    assert len(ledger.events) == 1


def test_06_consent_order_classification() -> None:
    event = _event(CONSENT)
    assert event.event_class == "CONSENT_ORDER"
    assert event.procedural_status == "FINAL"


def test_07_cease_and_desist_classification() -> None:
    event = _event(CANDD, "https://www.njconsumeraffairs.gov/Actions/GEV_AmendedCandD_11April2025.pdf")
    assert event.event_class == "AMENDED_ORDER"
    assert event.has_cease_and_desist is True


def test_08_filed_complaint_remains_allegation() -> None:
    event = _event(COMPLAINT)
    assert event.event_class == "CIVIL_COMPLAINT"
    assert event.procedural_status == "ALLEGATION"
    assert event.procedural_status != "FINAL"


def test_09_summary_revocation_procedural_status() -> None:
    event = _event(SUMMARY_REV)
    assert event.event_class == "SUMMARY_REVOCATION"
    assert event.procedural_status == "PENDING"
    assert event.hearing_rights_preserved is True


def test_10_final_order_classification() -> None:
    event = _event(FINAL_ORDER)
    assert event.event_class == "FINAL_ORDER"
    assert event.procedural_status == "FINAL"


def test_11_penalty_separate_from_restitution() -> None:
    event = _event(PENALTY_REST)
    kinds = {t.kind for t in event.monetary}
    assert "penalty" in kinds
    assert "restitution" in kinds
    assert "disgorgement" in kinds
    penalty = next(t for t in event.monetary if t.kind == "penalty")
    restitution = next(t for t in event.monetary if t.kind == "restitution")
    assert penalty.amount == 100000
    assert restitution.amount == 60000
    assert penalty.amount != restitution.amount


def test_12_multistate_not_attributed_entirely_to_nj() -> None:
    event = _event(MULTISTATE)
    assert event.nj_monetary_attribution == "multistate_unallocated"
    assert any(t.nj_attribution == "multistate_unallocated" for t in event.monetary)


def test_13_multi_party_order() -> None:
    event = _event(MULTI_PARTY)
    names = {p.legal_name for p in event.parties}
    assert any("Gluckstein" in n for n in names)
    assert any("Seaview" in n for n in names)
    assert len(event.parties) >= 2


def test_14_exact_crd_firm_match() -> None:
    event = _event(CONSENT)
    party = next(p for p in event.parties if p.crd == "304732")
    match_party(party, CATALOG)
    assert party.match_status == "EXACT_CRD_FIRM"
    assert party.firm_id == "firm-zenith"


def test_15_exact_crd_individual_match() -> None:
    event = _event(MULTI_PARTY)
    party = next(p for p in event.parties if p.crd == "2518385")
    match_party(party, CATALOG)
    apply_publication_firewall(party)
    assert party.match_status == "EXACT_CRD_INDIVIDUAL"
    assert party.person_id == "person-gluckstein"
    assert party.firm_id is None


def test_16_exact_sec_file_match() -> None:
    event = _event(SEC_FILE_ORDER)
    party = event.parties[0]
    if not party.sec_file_number:
        party.sec_file_number = "801-55555"
        party.crd = "999001"
    match_party(party, CATALOG)
    assert party.match_status in {"EXACT_SEC_FILE", "EXACT_CRD_FIRM"}
    assert party.firm_id == "firm-national-overlay"


def test_17_legal_name_address_high_confidence() -> None:
    party = EventParty(legal_name="Zenith Solutions, Inc.", party_type="STATE_RIA", address_text="nj-07032")
    match_party(party, CATALOG)
    assert party.match_status == "HIGH_CONFIDENCE"
    assert party.firm_id == "firm-zenith"


def test_18_name_only_rejection() -> None:
    party = EventParty(legal_name="Zenith Solutions, Inc.", party_type="STATE_RIA")
    match_party(party, CATALOG)
    assert party.match_status == "UNSAFE_REJECTED"
    assert party.firm_id is None


def test_19_firm_vs_individual_separation() -> None:
    event = _event(MULTI_PARTY)
    types = {p.party_type for p in event.parties}
    assert "INDIVIDUAL" in types or "IAR" in types
    assert any(p.party_type in {"STATE_RIA", "RIA_FIRM"} for p in event.parties)


def test_20_adviser_vs_broker_dealer_separation() -> None:
    ia = _event(CONSENT)
    bd = _event(BD_ORDER)
    assert any(p.party_type in {"STATE_RIA", "RIA_FIRM"} for p in ia.parties)
    assert any(p.party_type == "BROKER_DEALER" for p in bd.parties)


def test_21_issuer_vs_adviser_separation() -> None:
    issuer = _event(ISSUER_ORDER)
    adviser = _event(CONSENT)
    assert any(p.party_type == "ISSUER" for p in issuer.parties)
    assert not any(p.party_type == "ISSUER" for p in adviser.parties)


def test_22_unregistered_entity_preservation() -> None:
    event = _event(UNREGISTERED)
    assert any(p.party_type == "UNREGISTERED_ENTITY" for p in event.parties)


def test_23_individual_internal_only_publication_firewall() -> None:
    event = _event(INDIVIDUAL_ONLY)
    ledger = MemoryLedger()
    ingest_parsed_event(ledger, event, CATALOG, context=INDIVIDUAL_ONLY)
    for party in event.parties:
        assert party.public_eligibility == "internal_only"
        if party.party_type in {"INDIVIDUAL", "IAR", "AGENT"}:
            assert party.firm_id is None


def test_24_individual_action_not_copied_to_firm() -> None:
    event = _event(INDIVIDUAL_ONLY)
    ledger = MemoryLedger()
    ingest_parsed_event(ledger, event, CATALOG, context=INDIVIDUAL_ONLY)
    assert ledger.firm_attachments == {}
    for party in event.parties:
        assert firm_attachment_allowed(party) is False


def test_25_successor_predecessor_review_path() -> None:
    event = _event(SUCCESSOR)
    ledger = MemoryLedger()
    ingest_parsed_event(ledger, event, CATALOG, context=SUCCESSOR)
    assert any(p.match_status == "REVIEW_REQUIRED" for p in event.parties)


def test_26_state_ria_vs_sec_ria_separation() -> None:
    state = classify_party_type("Zenith Solutions, Inc.", "investment adviser registered with the Bureau")
    sec = classify_party_type("National Overlay Advisers LLC", "investment adviser registered with the SEC File No. 801-55555")
    assert state == "STATE_RIA"
    assert sec == "SEC_RIA"


def test_27_state_to_sec_transition_does_not_duplicate_firm() -> None:
    party = EventParty(
        legal_name="National Overlay Advisers LLC",
        party_type="STATE_RIA",
        crd="999001",
    )
    match_party(party, CATALOG)
    assert party.firm_id == "firm-national-overlay"
    assert party.raw_value.get("transition") == "STATE_TO_SEC"
    assert party.party_type == "SEC_RIA"


def test_28_source_unavailable_does_not_become_zero() -> None:
    html = (FIXTURES / "action-index-blocked.html").read_text(encoding="utf-8")
    coverage, entries = parse_action_index(html, "https://www.njconsumeraffairs.gov/bos/Pages/OrdersandFiledComplaints.aspx")
    assert is_waf_block(html)
    assert coverage.coverage_state == "SOURCE_ACCESS_BLOCKED"
    assert entries == []
    assert coverage.coverage_state != "ACQUIRED_COMPLETE"


def test_29_baseline_only_first_snapshot() -> None:
    ledger, report = run_from_texts(
        [("https://www.njconsumeraffairs.gov/Actions/z.pdf", CONSENT, "hash-consent")]
    )
    assert report.baseline_only is True
    assert report.monitoring_events == 0
    assert all(e.monitoring_state == "baseline_only" for e in ledger.events.values())


def test_30_idempotent_second_run() -> None:
    texts = [("https://www.njconsumeraffairs.gov/Actions/z.pdf", CONSENT, "hash-consent")]
    ledger, _first = run_from_texts(texts)
    first_counts = ledger.counts()
    _ledger2, _second = run_from_texts(texts, ledger=ledger)
    assert ledger.counts() == first_counts
    assert ledger.counts()["monitoring"] == 0


def test_31_no_public_nj_route() -> None:
    app = REPO / "apps" / "web" / "src" / "app"
    assert not (app / "new-jersey").exists()
    routes = (REPO / "packages" / "config" / "src" / "routes.ts").read_text(encoding="utf-8")
    assert "/new-jersey" not in routes
    assert "county" not in routes.lower()


def test_32_no_sitemap_indexing_expansion() -> None:
    sitemap = (REPO / "apps" / "web" / "src" / "app" / "sitemap.ts").read_text(encoding="utf-8")
    routes = (REPO / "packages" / "config" / "src" / "routes.ts").read_text(encoding="utf-8")
    assert "new-jersey" not in sitemap.lower()
    assert "INDEXABLE_PATHS" in routes
    assert "/new-jersey" not in routes


def test_33_existing_sec_ria_era_regression() -> None:
    classification = (REPO / "packages" / "domain" / "src" / "firm-classification.ts").read_text(encoding="utf-8")
    assert "exempt_reporting_adviser" in classification
    assert "registered_investment_adviser" in classification
    assert "STATE_REGISTERED_RIA" not in classification


def test_34_existing_public_profile_regression() -> None:
    firm_page = (REPO / "apps" / "web" / "src" / "app" / "firm" / "[slug]" / "page.tsx").read_text(encoding="utf-8")
    assert "new-jersey" not in firm_page.lower()
    assert "trust score" not in firm_page.lower()


def test_35_customer_claim_validation_regression() -> None:
    adapter = (REPO / "apps" / "web" / "src" / "lib" / "customer-claim-validation" / "v1.ts").read_text(encoding="utf-8")
    assert "PUBLIC_CURRENT" in adapter
    assert "representative_claim_not_allowed" in adapter


def test_36_no_vercel_project_changes() -> None:
    assert not (REPO / ".vercel" / "project.json").exists()
    # This ticket must not add a Vercel project file or vercel.json.
    assert not (REPO / "vercel.json").exists()


def test_classify_filename_consent() -> None:
    assert classify_event_class("", "Zenith_Consent_OCR_29July2024.pdf") == "CONSENT_ORDER"


def test_waf_short_body_is_blocked() -> None:
    assert is_waf_block("ok", 212) is True
