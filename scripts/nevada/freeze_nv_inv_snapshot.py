#!/usr/bin/env python3
"""Freeze investor-nv-state-intel-v1 (NV-INV-001).

Inputs (committed):
  data/nevada/nv-inv-001/iapd-nv-census.json            NV partition of the IAPD compilations (STATE 09-17, SEC 09-18)
  data/nevada/nv-inv-001/iapd-nv-firm-crds.json         firm CRD sets per lens (numbers only)
  data/nevada/nv-inv-001/nrs-90-framework.json          NRS chapter 90 Securities Division framework
  data/nevada/nv-inv-001/securities-division-access.json  nvsos.gov access record (bot defense; no bypass)

Outputs: artifacts/nv-inv-001-public-snapshot.json and packages/domain/src/nv-public-snapshot.ts.
`--check` rebuilds and fails on drift. Registration lenses are never summed and carry their own clocks.
No enforcement listing was acquired, so nothing is attached to any firm or person. Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/nevada/nv-inv-001"
ART = ROOT / "artifacts/nv-inv-001-public-snapshot.json"
TS = ROOT / "packages/domain/src/nv-public-snapshot.ts"

V1_PRINCIPAL = 99  # homepageInputs.principalOfficeStates NV (IA_FIRM_SEC_Feed_08_27_2026 reconciled roster geography)
STATE_URL = "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_17_2026.xml.gz"
DIVISION_HOME = "https://www.nvsos.gov/sos/licensing/securities"


def need(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"NV-INV-001 freeze: {msg}")


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
    census = read_json(SRC / "iapd-nv-census.json")
    crds = read_json(SRC / "iapd-nv-firm-crds.json")
    nrs = read_json(SRC / "nrs-90-framework.json")
    access = read_json(SRC / "securities-division-access.json")
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
    need(sec["sourceAsOf"] == "2026-09-18" and sec["acceptedFeedUnavailable"]["result"].startswith("HTTP 403"), "SEC feed clock")
    need(access["result"] == "REJECTED_BY_BOT_DEFENSE" and access["enforcementListingsAcquired"] == 0, "division access")
    need(access["otherRegulatorsSubstituted"] is False, "no substitute regulator")
    bridge = sorted(set(crds["state_ia_approved"]) & set(crds["notice_filed"]), key=int)
    need(len(bridge) == X["state_ia_approved_and_notice_filed"], "bridge list")

    snap = {
        "version": "investor-nv-state-intel-v1",
        "ticket": "NV-INV-001",
        "state": "Nevada",
        "generatedFrom": {
            "nationalRoster": "data/home/investor-network-metrics-v1.json homepageInputs.principalOfficeStates",
            "iapdStateCensus": "data/nevada/nv-inv-001/iapd-nv-census.json",
            "statute": "data/nevada/nv-inv-001/nrs-90-framework.json",
            "divisionAccess": "data/nevada/nv-inv-001/securities-division-access.json",
        },
        "asOf": None,
        "generatedAt": "",
        "publicationGate": "ON",
        "publicEligibility": "state_page",
        "route": "/nevada",
        "no_trust_score": True,
        "no_ranking": True,
        "no_investment_advice": True,
        "no_las_vegas_page": True,
        "no_reno_page": True,
        "no_henderson_page": True,
        "claimEligibilityBroadened": False,
        "clocks": {
            "iapd_state_sourceAsOf": state["sourceAsOf"],
            "iapd_state_accepted_retrievedAt": state["retrievedAt"],
            "iapd_state_reverified_sha256_on": "2026-09-25",
            "iapd_sec_sourceAsOf": sec["sourceAsOf"],
            "iapd_sec_retrievedAt": sec["retrievedAt"],
            "iapd_sec_accepted_09_17_unavailable": True,
            "v1_roster_sourceAsOf": "2026-08-27",
            "nrs_retrievedAt": nrs["source"]["retrievedAt"],
            "division_site_checkedAt": access["checkedAt"],
            "enforcement_latest_order_date": None,
            "snapshotAsOf": "2026-09-25",
            "generatedAt": "",
            "no_universal_nevada_investor_clock": True,
            "retrieval_is_not_registration_effective_date": True,
        },
        "nationalOverlay": {
            "nvPrincipalOfficeSecIardFirms": V1_PRINCIPAL,
            "grain": "SEC IARD roster firm with principal-office region = NV",
            "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
            "sourceAsOf": "2026-08-27",
            "retrievedAt": "2026-08-28",
            "rawCompilationMainAddrNv": L["principal_office_sec_feed_distinct_crd"],
            "rawCompilationSource": "IA_FIRM_SEC_Feed_09_18_2026 MainAddr/@State=NV",
            "searchHref": "/firms?state=NV",
            "label": "SEC/IARD roster firms with a Nevada principal office",
            "caveat": "A Nevada principal office is not Nevada state IA licensing and is not a notice filing. These firms already exist in the federal graph.",
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
            "principalOfficeNvAmongStateIa": L["principal_office_among_state_ia"],
            "filter": "StateRgstn/Rgltr/@Cd=NV (registration jurisdiction). Not MainAddr/@State.",
            "source": "IA_FIRM_STATE_Feed_09_17_2026",
            "sourceAsOf": state["sourceAsOf"],
            "retrievedAt": state["retrievedAt"],
            "officialUrl": STATE_URL,
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "statuteTerm": "licensed (NRS 90.330)",
            "label": "IAPD Nevada state investment-adviser firms (APPROVED)",
            "caveat": "Nevada state IA licensing is not SEC registration, not a federal notice filing, not ERA, and not a principal office. TERMREQUEST rows are reported separately; verify current status on IAPD. APPROVED is the IAPD status text, not an endorsement.",
        },
        "stateEra": {
            "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_era_registration_rows"],
            "distinctFirmCrd": L["state_era_distinct_crd"],
            "activeDistinctCrd": L["state_era_active_distinct_crd"],
            "statusRows": dict(L["state_era_status_rows"]),
            "overlapWithStateIa": O["state_ia_and_state_era"],
            "filter": "ERA/Rgltr/@Cd=NV",
            "source": "IA_FIRM_STATE_Feed_09_17_2026",
            "sourceAsOf": state["sourceAsOf"],
            "statute": "NRS 90.345 exempts certain private-fund advisers from licensing",
            "label": "Nevada exempt reporting adviser (ERA) firms",
            "caveat": "An exempt reporting adviser is not a Nevada-licensed IA and not an SEC RIA.",
        },
        "federalNotice": {
            "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
            "noticeRows": L["notice_rows"],
            "noticeFiledDistinctCrd": L["notice_filed_distinct_crd"],
            "noticeStatus": "FILED",
            "noticeFiledFirmType": {k: v for k, v in L["notice_filed_firm_type"].items() if k != "raw"},
            "filter": "NoticeFiled/States/@RgltrCd=NV",
            "source": "IA_FIRM_SEC_Feed_09_18_2026",
            "sourceAsOf": sec["sourceAsOf"],
            "retrievedAt": sec["retrievedAt"],
            "officialUrl": sec["url"],
            "acceptedFeedNote": "The accepted IA_FIRM_SEC_Feed_09_17_2026 is no longer served by IAPD; the 2026-09-18 feed is the oldest one still published. Its SHA-256 is recorded in the census.",
            "noticeFiledWithNvPrincipalOffice": O["notice_filed_and_principal_office"],
            "overlapApprovedStateIa": len(bridge),
            "overlapApprovedStateIaCrds": bridge,
            "overlapApprovedStateIaJoinMethod": "exact firm CRD set intersection of APPROVED StateRgstn/Rgltr/@Cd=NV (2026-09-17 STATE feed) and NoticeFiled/States/@RgltrCd=NV St=FILED (2026-09-18 SEC feed); cross-clock by one day",
            "overlapCrossClock": True,
            "label": "SEC-registered advisers with a Nevada notice filing",
            "caveat": "A notice filing is not Nevada state IA licensing.",
        },
        "reconciliation": {
            "NV_STATE_IA_ERA_OVERLAP": O["state_ia_and_state_era"],
            "NV_STATE_IA_WITH_NV_MAIN_ADDRESS": L["principal_office_among_state_ia"],
            "NV_PRINCIPAL_OFFICE_NOTICE_OVERLAP": O["notice_filed_and_principal_office"],
            "NV_PRINCIPAL_OFFICE_NOT_NOTICE_FILED": O["principal_office_not_notice_filed"],
            "NV_PRINCIPAL_OFFICE_OVERLAY": V1_PRINCIPAL,
            "crossClock": {
                "NV_STATE_IA_NOTICE_OVERLAP": X["state_ia_approved_and_notice_filed"],
                "NV_ERA_NOTICE_OVERLAP": X["state_era_and_notice_filed"],
                "NV_PRINCIPAL_OFFICE_STATE_IA_OVERLAP_SEC_FEED": X["state_ia_and_principal_office_sec_feed"],
                "note": X["note"],
            },
            "joinMethod": "exact firm CRD",
            "clockNote": "IAPD STATE compilation 2026-09-17; IAPD SEC compilation 2026-09-18; the V1 principal-office overlay is the 2026-08-27 roster geography. Differences are clock differences, not enforcement.",
            "do_not_sum": True,
        },
        "enforcement": {
            "NV_SECURITIES_ORDER_INDEX_STATUS": "NOT_ACQUIRED_BOT_DEFENSE",
            "capability": "KNOWN",
            "capabilityBasis": "NRS 90.620 (investigations and subpoenas) and NRS 90.630 (enforcement orders)",
            "acquiredActions": "NOT_ACQUIRED",
            "listings": None,
            "observationRows": None,
            "distinctCaseNumbers": None,
            "uniqueMatters": None,
            "sourceTypesToPreserve": ["Consent Order", "Summary Order to Cease and Desist", "Administrative Order", "Other source-defined action"],
            "divisionHome": DIVISION_HOME,
            "accessResult": access["result"],
            "accessCheckedAt": access["checkedAt"],
            "accessDetail": access["detail"],
            "otherRegulatorsSubstituted": False,
            "notSubstituted": access["notSubstituted"],
            "nameOnly": "UNSAFE",
            "exactCrdLinks": [],
            "NV_ENFORCEMENT_EXACT_CRD_LINKS": 0,
            "profileAttachments": [],
            "registrationDisclosures": "IAPD and BrokerCheck show regulatory disclosures, including state actions, on each firm or person record; they were not bulk-read.",
        },
        "complaints": {
            "NV_SECURITIES_COMPLAINT_ROWS": None,
            "intake": "KNOWN",
            "intakeBasis": "The Securities Division investigates investor complaints (NRS 90.620 investigations); the intake page sits behind the same bot defense and was not read.",
            "providerLevelComplaints": "NOT_ACQUIRED",
            "complaintOutcomes": "NOT_ACQUIRED / REQUEST_ONLY",
            "complaint_ne_enforcement": True,
        },
        "iar": {
            "NV_IAR_REGISTRATION_CAPABILITY": "KNOWN",
            "NV_IAR_ROWS": None,
            "NV_IAR_PERSON_DIRECTORY": "NOT_PUBLISHED",
            "statute": "NRS 90.330 licenses representatives of investment advisers separately from advisers",
            "grain": "person CRD (not firm CRD); Form U4 through Web CRD/IARD",
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "caveat": "An IAR is a person. IAR licences are never added to firm counts, and no person profiles are created.",
        },
        "brokerDealer": {
            "NV_BD_VERIFICATION": "KNOWN",
            "NV_SALES_REP_VERIFICATION": "KNOWN",
            "NV_DEALER_ROWS": None,
            "NV_SALES_REP_ROWS": None,
            "stateOnlyBulk": "NOT_ACQUIRED",
            "statute": "NRS 90.310 licenses broker-dealers and sales representatives",
            "bd_ne_ia": True,
            "sales_rep_ne_iar": True,
            "verifyUrl": "https://brokercheck.finra.org/",
        },
        "otherClasses": {
            "transferAgents": "OUT_OF_SCOPE (NRS 90.310 separate class; never counted with advisers or broker-dealers)",
            "athleteAgents": "OUT_OF_SCOPE (separate regulatory class)",
        },
        "offerings": {
            "status": "DEFERRED",
            "note": "Securities offering registrations, exemptions and crowdfunding are not provider identity and were not ingested.",
        },
        "divisionFramework": {
            "regulator": "Nevada Secretary of State, Securities Division",
            "administrator": nrs["definitions"]["Administrator"],
            "division": nrs["definitions"]["Division"],
            "officialHomeUrl": DIVISION_HOME,
            "statute": "Nevada Uniform Securities Act (NRS Chapter 90)",
            "statuteUrl": nrs["source"]["url"],
            "statuteRetrievedAt": nrs["source"]["retrievedAt"],
            "sections": nrs["sections"],
            "infrastructure": "IARD for investment advisers and representatives; CRD/BrokerCheck for broker-dealers and sales representatives. FINRA operates the systems; it is not the Nevada regulator.",
        },
        "capabilities": {
            "state_ia_compilation": "KNOWN",
            "state_era": "KNOWN",
            "federal_notice_filing": "KNOWN",
            "principal_office_overlay": "KNOWN",
            "iar_verification": "KNOWN",
            "iar_person_population": "NOT_ACQUIRED",
            "bd_verification": "KNOWN",
            "sales_rep_verification": "KNOWN",
            "state_bd_sales_rep_bulk": "NOT_ACQUIRED",
            "enforcement_capability": "KNOWN",
            "enforcement_actions": "NOT_ACQUIRED",
            "enforcement_unique_matters": "UNKNOWN",
            "enforcement_exact_crd_links": "NOT_ACQUIRED",
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
        "/** Generated by scripts/nevada/freeze_nv_inv_snapshot.py. Do not edit by hand. */\nexport const NV_PUBLIC_SNAPSHOT = "
        + json.dumps(snap, indent=2, ensure_ascii=False)
        + " as const;\nexport type NvPublicSnapshot = typeof NV_PUBLIC_SNAPSHOT;\n"
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
                      "principal_v1": V1_PRINCIPAL, "principal_raw_0918": L["principal_office_sec_feed_distinct_crd"]}, indent=1))


if __name__ == "__main__":
    main()
