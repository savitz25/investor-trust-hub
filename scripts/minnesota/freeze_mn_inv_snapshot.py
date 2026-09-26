#!/usr/bin/env python3
"""Freeze investor-mn-state-intel-v1 (MN-INV-001).

Inputs (committed):
  data/minnesota/mn-inv-001/iapd-mn-census.json          MN partition of the IAPD compilations (STATE 09-17, SEC 09-18)
  data/minnesota/mn-inv-001/iapd-mn-firm-crds.json       firm CRD sets per lens (numbers only)
  data/minnesota/mn-inv-001/mn-80a-framework.json        Minn. Stat. ch. 80A / Commerce Securities Unit framework
  data/minnesota/mn-inv-001/cards-securities-index.json  Commerce CARDS Securities industry-type actions, 2022-01-01..2026-09-26

Outputs: artifacts/mn-inv-001-public-snapshot.json and packages/domain/src/mn-public-snapshot.ts.
`--check` rebuilds and fails on drift. Registration lenses are never summed and carry their own clocks. Enforcement
attaches to a firm only through an exact firm CRD printed by Commerce; nothing is attached by name. Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/minnesota/mn-inv-001"
ART = ROOT / "artifacts/mn-inv-001-public-snapshot.json"
TS = ROOT / "packages/domain/src/mn-public-snapshot.ts"

V1_PRINCIPAL = 293  # homepageInputs.principalOfficeStates MN (IA_FIRM_SEC_Feed_08_27_2026 reconciled roster geography)
STATE_URL = "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_17_2026.xml.gz"
CARDS_HOME = "https://cards.web.commerce.state.mn.us/enforcement-actions"


def need(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"MN-INV-001 freeze: {msg}")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fingerprint(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("generatedAt", None)
    clone.pop("fingerprint", None)
    (clone.get("clocks") or {}).pop("generatedAt", None)
    return hashlib.sha256(json.dumps(clone, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def main() -> None:
    check = "--check" in sys.argv
    census = read_json(SRC / "iapd-mn-census.json")
    crds = read_json(SRC / "iapd-mn-firm-crds.json")
    fw = read_json(SRC / "mn-80a-framework.json")
    cards = read_json(SRC / "cards-securities-index.json")
    L, O, X = census["lenses"], census["overlaps"], census["crossClockDiagnostics"]
    state, sec = census["state"], census["sec"]

    status_ia = dict(L["state_ia_status_rows"])
    approved = status_ia.get("APPROVED", 0)
    term = status_ia.get("TERMREQUEST", 0)
    condrest = status_ia.get("CONDREST", 0)
    need(approved == L["state_ia_approved_distinct_crd"] == len(crds["state_ia_approved"]), "approved partition")
    need(approved + term + condrest == L["state_ia_distinct_crd"] == L["state_ia_registration_rows"], "status remainder")
    need(L["state_era_active_distinct_crd"] == len(crds["state_era_active"]), "ERA list")
    need(L["notice_filed_distinct_crd"] == len(crds["notice_filed"]), "notice list")
    need(L["principal_office_sec_feed_distinct_crd"] == len(crds["principal_office_sec_feed"]), "principal list")
    need(state["sha256"] == "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02", "accepted STATE feed")
    need(sec["sourceAsOf"] == "2026-09-18", "SEC feed clock")
    bridge = sorted(set(crds["state_ia_approved"]) & set(crds["notice_filed"]), key=int)
    need(len(bridge) == X["state_ia_approved_and_notice_filed"], "bridge list")

    actions = cards["actions"]
    need(len(actions) == cards["rows"] == 43, "CARDS rows")
    sec_scope = [a for a in actions if a["scope"] == "securities"]
    need(len(sec_scope) == cards["securitiesScopeRows"], "securities scope")
    exact = sorted({c for a in actions for c in a["exactFirmCrdLinks"]}, key=int)
    need(cards["nameOnlyAttachment"] is False, "no name-only attachment")
    public_actions = [
        {
            "document": a["document"],
            "signedDate": a["signedDate"],
            "respondentAsListed": a["respondentAsListed"],
            "actionTypeAsListed": a["actionTypeAsListed"],
            "consentInActionType": a["consentInActionType"],
            "penaltyAsListed": a["penaltyAsListed"],
            "allegationAsListed": a["allegationAsListed"],
            "cityAsListed": a["cityAsListed"],
            "stateAsListed": a["stateAsListed"],
            "scope": a["scope"],
            "scopeNote": a["scopeNote"],
            "documentUrl": a["documentUrl"],
            "orderDocumentTextLayer": a["orderDocument"]["textLayer"],
            "crdPrintedInIndex": a["crdPrintedInIndex"],
            "exactFirmCrdLinks": a["exactFirmCrdLinks"],
            "attribution": a["attribution"],
        }
        for a in actions
    ]

    snap = {
        "version": "investor-mn-state-intel-v1",
        "ticket": "MN-INV-001",
        "state": "Minnesota",
        "generatedFrom": {
            "nationalRoster": "data/home/investor-network-metrics-v1.json homepageInputs.principalOfficeStates",
            "iapdStateCensus": "data/minnesota/mn-inv-001/iapd-mn-census.json",
            "statute": "data/minnesota/mn-inv-001/mn-80a-framework.json",
            "enforcementIndex": "data/minnesota/mn-inv-001/cards-securities-index.json",
        },
        "asOf": None,
        "generatedAt": "",
        "publicationGate": "ON",
        "publicEligibility": "state_page",
        "route": "/minnesota",
        "no_trust_score": True,
        "no_ranking": True,
        "no_investment_advice": True,
        "no_minneapolis_page": True,
        "no_st_paul_page": True,
        "no_rochester_page": True,
        "no_duluth_page": True,
        "claimEligibilityBroadened": False,
        "clocks": {
            "iapd_state_sourceAsOf": state["sourceAsOf"],
            "iapd_state_accepted_retrievedAt": state["retrievedAt"],
            "iapd_state_reverified_sha256_on": "2026-09-26",
            "iapd_sec_sourceAsOf": sec["sourceAsOf"],
            "iapd_sec_retrievedAt": sec["retrievedAt"],
            "iapd_sec_accepted_09_17_unavailable": True,
            "v1_roster_sourceAsOf": "2026-08-27",
            "statute_retrievedAt": fw["statute"]["retrievedAt"],
            "commerce_pages_checkedAt": fw["commerceStatements"]["checkedAt"],
            "cards_retrievedAt": cards["retrievedAt"],
            "enforcement_first_signed_date": cards["firstSignedDate"],
            "enforcement_latest_signed_date": cards["lastSignedDate"],
            "snapshotAsOf": "2026-09-26",
            "generatedAt": "",
            "no_universal_minnesota_investor_clock": True,
            "retrieval_is_not_registration_effective_date": True,
        },
        "nationalOverlay": {
            "mnPrincipalOfficeSecIardFirms": V1_PRINCIPAL,
            "grain": "SEC IARD roster firm with principal-office region = MN",
            "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
            "sourceAsOf": "2026-08-27",
            "retrievedAt": "2026-08-28",
            "rawCompilationMainAddrMn": L["principal_office_sec_feed_distinct_crd"],
            "rawCompilationSource": "IA_FIRM_SEC_Feed_09_18_2026 MainAddr/@State=MN",
            "searchHref": "/firms?state=MN",
            "label": "SEC/IARD roster firms with a Minnesota principal office",
            "caveat": "A Minnesota principal office is not Minnesota state IA registration and is not a notice filing. These firms already exist in the federal graph.",
        },
        "stateRia": {
            "STATE_RIA_BULK_ROSTER": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_ia_registration_rows"],
            "distinctFirmCrd": L["state_ia_distinct_crd"],
            "approvedDistinctCrd": approved,
            "condrestDistinctCrd": condrest,
            "termrequestDistinctCrd": term,
            "currentDistinctCrd": L["state_ia_current_distinct_crd"],
            "statusRows": status_ia,
            "principalOfficeMnAmongStateIa": L["principal_office_among_state_ia"],
            "filter": "StateRgstn/Rgltr/@Cd=MN (registration jurisdiction). Not MainAddr/@State.",
            "source": "IA_FIRM_STATE_Feed_09_17_2026",
            "sourceAsOf": state["sourceAsOf"],
            "retrievedAt": state["retrievedAt"],
            "officialUrl": STATE_URL,
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "statuteTerm": "registered (Minn. Stat. 80A.58)",
            "label": "IAPD Minnesota state investment-adviser firms (APPROVED)",
            "caveat": "Minnesota state IA registration is not SEC registration, not a federal notice filing, not ERA, and not a principal office. TERMREQUEST rows are reported separately; verify current status on IAPD. APPROVED is the IAPD status text, not an endorsement.",
        },
        "stateEra": {
            "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_era_registration_rows"],
            "distinctFirmCrd": L["state_era_distinct_crd"],
            "activeDistinctCrd": L["state_era_active_distinct_crd"],
            "statusRows": dict(L["state_era_status_rows"]),
            "overlapWithStateIa": O["state_ia_and_state_era"],
            "filter": "ERA/Rgltr/@Cd=MN",
            "source": "IA_FIRM_STATE_Feed_09_17_2026",
            "sourceAsOf": state["sourceAsOf"],
            "statute": "Minn. Stat. 80A.58 provides exemptions from investment-adviser registration",
            "label": "Minnesota exempt reporting adviser (ERA) firms",
            "caveat": "An exempt reporting adviser is not a Minnesota-registered IA and not an SEC RIA.",
        },
        "federalNotice": {
            "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
            "noticeRows": L["notice_rows"],
            "noticeFiledDistinctCrd": L["notice_filed_distinct_crd"],
            "noticeStatus": "FILED",
            "noticeFiledFirmType": {k: v for k, v in L["notice_filed_firm_type"].items() if k != "raw"},
            "filter": "NoticeFiled/States/@RgltrCd=MN",
            "source": "IA_FIRM_SEC_Feed_09_18_2026",
            "sourceAsOf": sec["sourceAsOf"],
            "retrievedAt": sec["retrievedAt"],
            "officialUrl": sec["url"],
            "statute": "Minn. Stat. 80A.60 (federal covered investment adviser notice filing)",
            "acceptedFeedNote": "The accepted IA_FIRM_SEC_Feed_09_17_2026 is no longer served by IAPD; the 2026-09-18 feed (SHA-256 recorded in the census) carries this lens on its own clock, as in NV-INV-001.",
            "noticeFiledWithMnPrincipalOffice": O["notice_filed_and_principal_office"],
            "overlapApprovedStateIa": len(bridge),
            "overlapApprovedStateIaCrds": bridge,
            "overlapApprovedStateIaJoinMethod": "exact firm CRD set intersection of APPROVED StateRgstn/Rgltr/@Cd=MN (2026-09-17 STATE feed) and NoticeFiled/States/@RgltrCd=MN St=FILED (2026-09-18 SEC feed); cross-clock by one day",
            "overlapCrossClock": True,
            "label": "SEC-registered advisers with a Minnesota notice filing",
            "caveat": "A notice filing is not Minnesota state IA registration.",
        },
        "reconciliation": {
            "MN_STATE_IA_ERA_OVERLAP": O["state_ia_and_state_era"],
            "MN_STATE_IA_WITH_MN_MAIN_ADDRESS": L["principal_office_among_state_ia"],
            "MN_PRINCIPAL_OFFICE_NOTICE_OVERLAP": O["notice_filed_and_principal_office"],
            "MN_PRINCIPAL_OFFICE_NOT_NOTICE_FILED": O["principal_office_not_notice_filed"],
            "MN_PRINCIPAL_OFFICE_OVERLAY": V1_PRINCIPAL,
            "crossClock": {
                "MN_STATE_IA_NOTICE_OVERLAP": X["state_ia_approved_and_notice_filed"],
                "MN_ERA_NOTICE_OVERLAP": X["state_era_and_notice_filed"],
                "MN_PRINCIPAL_OFFICE_STATE_IA_OVERLAP_SEC_FEED": X["state_ia_and_principal_office_sec_feed"],
                "note": X["note"],
            },
            "joinMethod": "exact firm CRD",
            "clockNote": "IAPD STATE compilation 2026-09-17; IAPD SEC compilation 2026-09-18; the V1 principal-office overlay is the 2026-08-27 roster geography. Differences are clock differences, not enforcement.",
            "do_not_sum": True,
        },
        "enforcement": {
            "MN_SECURITIES_ORDER_INDEX_STATUS": "ACQUIRED_CARDS_INDEX",
            "capability": "KNOWN",
            "capabilityBasis": "Minn. Stat. 80A.79 (investigations and subpoenas) and 80A.81 (administrative enforcement)",
            "source": cards["source"],
            "searchUrl": cards["searchUrl"],
            "cardsHome": CARDS_HOME,
            "search": cards["search"],
            "retrievedAt": cards["retrievedAt"],
            "access": cards["access"],
            "rows": cards["rows"],
            "observationRows": cards["rows"],
            "distinctCaseNumbers": None,
            "distinctCaseNumbersNote": "CARDS prints a document number per row, not a case or matter number; unique matters are UNKNOWN.",
            "securitiesScopeRows": cards["securitiesScopeRows"],
            "otherSecuritiesUnitProgramRows": cards["otherSecuritiesUnitProgramRows"],
            "securitiesScopeByYear": cards["securitiesScopeByYear"],
            "actionTypesAsListed": cards["actionTypesAsListed"],
            "firstSignedDate": cards["firstSignedDate"],
            "lastSignedDate": cards["lastSignedDate"],
            "coverage": "PARTIAL",
            "coverageNote": "Commerce's CARDS index for the Securities industry type, signed 2022-01-01 through the retrieval date. One row per CARDS document; a row is not a unique matter (companion orders against a firm and its principals are separate rows).",
            "procedural": "Action types are kept exactly as Commerce lists them. A consent order is a negotiated settlement and is not by itself an adjudicated finding.",
            "orderDocumentsWithoutTextLayer": cards["orderDocumentsWithoutTextLayer"],
            "orderDocumentText": "NOT_ACQUIRED (scanned orders; OCR not run)",
            "rowsWithCrdPrinted": cards["rowsWithCrdPrinted"],
            "nameOnly": "UNSAFE",
            "exactCrdLinks": exact,
            "MN_ENFORCEMENT_EXACT_CRD_LINKS": len(exact),
            "profileAttachments": [],
            "otherRegulatorsSubstituted": False,
            "notSubstituted": ["Commerce mortgage, insurance, banking and other industry types", "Minnesota Attorney General cases", "court cases"],
            "actions": public_actions,
            "registrationDisclosures": "IAPD and BrokerCheck show regulatory disclosures, including Minnesota actions, on each firm or person record; they were not bulk-read.",
        },
        "complaints": {
            "MN_SECURITIES_COMPLAINT_ROWS": None,
            "intake": "KNOWN",
            "intakeBasis": fw["commerceStatements"]["complaints"]["intake"],
            "intakeUrl": fw["commerceStatements"]["complaints"]["url"],
            "providerLevelComplaints": "NOT_ACQUIRED",
            "complaintOutcomes": "NOT_ACQUIRED / REQUEST_ONLY",
            "complaint_ne_enforcement": True,
        },
        "iar": {
            "MN_IAR_REGISTRATION_CAPABILITY": "KNOWN",
            "MN_IAR_ROWS": None,
            "MN_IAR_PERSON_DIRECTORY": "NOT_PUBLISHED",
            "statute": "Minn. Stat. 80A.58 and 80A.61; Commerce: IARs file Form U4 on CRD ($50 fee)",
            "grain": "person CRD (not firm CRD); Form U4 through CRD",
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "caveat": "An IAR is a person. IAR registrations are never added to firm counts, and no person profiles are created.",
        },
        "brokerDealer": {
            "MN_BD_VERIFICATION": "KNOWN",
            "MN_AGENT_VERIFICATION": "KNOWN",
            "MN_BD_ROWS": None,
            "MN_AGENT_ROWS": None,
            "stateOnlyBulk": "NOT_ACQUIRED",
            "statute": "Minn. Stat. 80A.56 (broker-dealers) and 80A.57 (agents); applications through CRD (80A.61; Minn. R. 2876.4062)",
            "bd_ne_ia": True,
            "agent_ne_iar": True,
            "verifyUrl": "https://brokercheck.finra.org/",
        },
        "otherClasses": {
            "franchises": "OUT_OF_SCOPE (Securities Unit program; not provider identity)",
            "subdividedLandAndTimeshares": "OUT_OF_SCOPE (Minn. Stat. ch. 83; CARDS rows labelled other_securities_unit_program)",
            "mnvest": "OUT_OF_SCOPE (intrastate crowdfunding)",
        },
        "offerings": {
            "status": "DEFERRED",
            "note": "Securities offering registrations and exemptions (Minn. Stat. 80A.49) are not provider identity and were not ingested.",
        },
        "safeSeniors": {
            "status": "CONTEXT_ONLY",
            "note": "Commerce links Minnesota's Safe Senior Financial Protection Act from its adviser page. Referral or reporting activity is not an order and is not counted.",
        },
        "divisionFramework": {
            "regulator": fw["regulator"],
            "administrator": fw["administrator"],
            "statute": fw["statute"]["name"],
            "statuteUrl": fw["statute"]["url"],
            "statuteRetrievedAt": fw["statute"]["retrievedAt"],
            "rules": fw["rules"],
            "sections": fw["sections"],
            "commerce": fw["commerceStatements"],
            "infrastructure": "IARD for investment advisers (Form ADV); CRD for representatives (Form U4), broker-dealers and agents. FINRA operates the systems; it is not the Minnesota regulator.",
        },
        "capabilities": {
            "state_ia_compilation": "KNOWN",
            "state_era": "KNOWN",
            "federal_notice_filing": "KNOWN",
            "principal_office_overlay": "KNOWN",
            "iar_verification": "KNOWN",
            "iar_person_population": "NOT_ACQUIRED",
            "bd_verification": "KNOWN",
            "agent_verification": "KNOWN",
            "state_bd_agent_bulk": "NOT_ACQUIRED",
            "enforcement_capability": "KNOWN",
            "enforcement_actions": "PARTIAL",
            "enforcement_order_text": "NOT_ACQUIRED",
            "enforcement_unique_matters": "UNKNOWN",
            "enforcement_exact_crd_links": "KNOWN",
            "registration_disciplinary_records": "KNOWN",
            "complaint_intake": "KNOWN",
            "provider_complaints": "NOT_ACQUIRED",
            "complaint_outcomes": "REQUEST_ONLY",
            "offerings": "NOT_ACQUIRED",
            "name_only_adverse_attachment": "UNSUPPORTED",
            "combined_investment_professional_count": "UNSUPPORTED",
            "local_city_pages": "UNSUPPORTED",
        },
        "expansionLedger": {
            "NET_NEW_STATE_RESEARCH_IDENTITIES": approved,
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_PUBLIC_INVESTOR_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
            "GRAPH_WRITES": 0,
            "CLAIM_ELIGIBILITY_BROADENED": False,
            "EXACT_PROFILE_ATTACHMENTS": 0,
            "ENFORCEMENT_ROWS": cards["rows"],
        },
        "fingerprint": "",
    }
    existing = read_json(ART) if ART.exists() else None
    generated = existing["generatedAt"] if check and existing else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    snap["generatedAt"] = generated
    snap["clocks"]["generatedAt"] = generated
    snap["fingerprint"] = fingerprint(snap)
    art_text = json.dumps(snap, indent=2, ensure_ascii=False) + "\n"
    ts_text = (
        "/** Generated by scripts/minnesota/freeze_mn_inv_snapshot.py. Do not edit by hand. */\nexport const MN_PUBLIC_SNAPSHOT = "
        + json.dumps(snap, indent=2, ensure_ascii=False)
        + " as const;\nexport type MnPublicSnapshot = typeof MN_PUBLIC_SNAPSHOT;\n"
    )
    if check:
        for path, text in ((ART, art_text), (TS, ts_text)):
            need(path.exists() and path.read_text(encoding="utf-8").replace("\r\n", "\n") == text, f"{path.relative_to(ROOT)} drifted; rerun the freeze")
        print("check", snap["fingerprint"])
        return
    for path, text in ((ART, art_text), (TS, ts_text)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
    print(json.dumps({"fingerprint": snap["fingerprint"], "state_ia": [approved, term, condrest],
                      "era": L["state_era_active_distinct_crd"], "notice": L["notice_filed_distinct_crd"],
                      "principal_v1": V1_PRINCIPAL, "principal_raw_0918": L["principal_office_sec_feed_distinct_crd"],
                      "bridge": len(bridge), "enforcement": [cards["rows"], cards["securitiesScopeRows"], len(exact)]}, indent=1))


if __name__ == "__main__":
    main()
