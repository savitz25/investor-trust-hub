#!/usr/bin/env python3
"""Freeze investor-nc-state-intel-v1."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CENSUS = json.loads((ROOT / "data/north-carolina/nc-inv-001/iapd-nc-census.json").read_text(encoding="utf-8"))
ENF = json.loads((ROOT / "data/north-carolina/nc-inv-001/enforcement-coverage.json").read_text(encoding="utf-8"))
SOS_IA = json.loads((ROOT / "data/north-carolina/nc-inv-001/sos-ia-crds.json").read_text(encoding="utf-8"))
IAPD_IA = json.loads((ROOT / "data/north-carolina/nc-inv-001/iapd-nc-ia-approved-crds.json").read_text(encoding="utf-8"))
SUM = json.loads((ROOT / "data/north-carolina/nc-inv-001/sos-register-summary.json").read_text(encoding="utf-8"))

sos = set(SOS_IA["crds"])
iapd = set(IAPD_IA["crds"])
overlap = sorted(sos & iapd, key=lambda x: int(x))
sos_only = sorted(sos - iapd, key=lambda x: int(x))
iapd_only = sorted(iapd - sos, key=lambda x: int(x))

SOS_IA_N = len(sos)
SOS_IAR_N = 21528
SOS_BD_N = 1786
SOS_AG_N = 247984
IAPD_IA = CENSUS["state"]["co_state_ia_approved_distinct_crd"]
IAPD_IA_ROWS = CENSUS["state"]["co_state_ia_registration_rows"]
ERA = CENSUS["state"]["co_state_era_active_distinct_crd"]
NOTICE = CENSUS["sec"]["co_notice_filed_distinct_crd"]
PRINCIPAL = 325
RAW_PRINCIPAL = CENSUS["sec"]["co_principal_office_distinct_crd"]


def fingerprint(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("generatedAt", None)
    clocks = clone.get("clocks") or {}
    clocks.pop("generatedAt", None)
    clone["clocks"] = clocks
    clone.pop("fingerprint", None)
    return hashlib.sha256(json.dumps(clone, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


snap = {
    "version": "investor-nc-state-intel-v1",
    "ticket": "NC-INV-001",
    "generatedFrom": {
        "nationalRoster": "packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES",
        "iapdStateCensus": "data/north-carolina/nc-inv-001/iapd-nc-census.json",
        "sosRegisters": "data/north-carolina/nc-inv-001/sos-register-summary.json",
        "enforcement": "data/north-carolina/nc-inv-001/enforcement-coverage.json",
    },
    "asOf": "2026-09-17",
    "generatedAt": SUM["retrievedAt"],
    "publicationGate": "ON",
    "publicEligibility": "state_page",
    "route": "/north-carolina",
    "growthClassification": "INTELLIGENCE_GROWTH_HEAVY",
    "no_trust_score": True,
    "no_ranking": True,
    "no_charlotte_page": True,
    "no_raleigh_page": True,
    "claimEligibilityBroadened": False,
    "local_work_needed_now": "NO",
    "nationalOverlay": {
        "ncPrincipalOfficeSecIardFirms": PRINCIPAL,
        "grain": "SEC IARD roster firm with principal-office region = NC",
        "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
        "sourceAsOf": "2026-08-27",
        "retrievedAt": "2026-08-28",
        "universe": 23622,
        "resolvedPrincipalOfficeRegions": 17997,
        "searchHref": "/firms?state=NC",
        "rawCompilationMainAddrNc": RAW_PRINCIPAL,
        "rawCompilationSource": "IA_FIRM_SEC_Feed_09_17_2026 MainAddr/@State=NC",
        "label": "SEC/IARD roster firms with a North Carolina principal office",
        "caveat": "A North Carolina principal office is not North Carolina state IA registration and is not a notice filing. These firms already exist in the federal graph.",
    },
    "sosRegisters": {
        "NC_SOS_REGISTER_SOURCE_AS_OF": "2026-06-30",
        "retrievedAt": SUM["retrievedAt"],
        "pageLabelMay20": "SUPERSEDED — live registers say current as of 6/30/26",
        "NC_SOS_IA_ROWS": SOS_IA_N,
        "NC_SOS_IA_DISTINCT_CRDS": SOS_IA_N,
        "NC_SOS_IA_MISSING_CRD": 0,
        "NC_SOS_IAR_ROWS": SOS_IAR_N,
        "NC_SOS_IAR_DISTINCT_CRDS": SOS_IAR_N,
        "NC_SOS_IAR_MISSING_CRD": 0,
        "NC_SOS_BD_ROWS": SOS_BD_N,
        "NC_SOS_BD_DISTINCT_CRDS": SOS_BD_N,
        "NC_SOS_AG_ROWS": SOS_AG_N,
        "NC_SOS_AG_DISTINCT_CRDS": SOS_AG_N,
        "ia_sha256": "2931670d2017a3b08a6ca94bf1bf835a3d4244566abad8ed80cc3a85f2cf7707",
        "iar_sha256": "c1fd862391c938aa86e58e50a2b5afb86cc71c2217bafb523f3ce2ba2a51a351",
        "bd_sha256": "6455ef114cfda85879b643faeca5eddbd14ec180a09a8765d50b586db37d3080",
        "ag_sha256": "33bc5cb997fae51165d8c89159850672329e817c3e0dfb344d89c49ef7d8f0cb",
        "iar_person_ne_ia_firm": True,
        "bd_ne_ia": True,
        "ag_ne_attorney_general": True,
        "ag_person_ne_bd_firm": True,
        "do_not_add_classes": True,
    },
    "stateRia": {
        "STATE_RIA_BULK_ROSTER": "ACQUIRED_IAPD_STATE_COMPILATION",
        "NC_STATE_IA_ROWS": IAPD_IA_ROWS,
        "NC_STATE_IA_DISTINCT_CRDS": CENSUS["state"]["co_state_ia_distinct_crd"],
        "NC_STATE_IA_APPROVED_CURRENT": IAPD_IA,
        "completeStateRiaCount": IAPD_IA,
        "registrationRows": IAPD_IA_ROWS,
        "distinctFirmCrd": CENSUS["state"]["co_state_ia_distinct_crd"],
        "approvedDistinctCrd": IAPD_IA,
        "termrequestDistinctCrd": 1,
        "filter": "StateRgstn/Rgltr/@Cd=NC (registration jurisdiction). Not MainAddr/@State.",
        "source": "IA_FIRM_STATE_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "retrievedAt": "2026-09-17T15:15:00Z",
        "verifyUrl": "https://adviserinfo.sec.gov/",
        "officialUrl": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_17_2026.xml.gz",
        "sosHomeUrl": "https://sosnc.gov/divisions/securities/investment_adviser_registration",
        "sosRegistersUrl": "https://www.sosnc.gov/webfiles/documents/forms/securities/Register_of_NC_IAs.pdf",
        "iapdUrl": "https://adviserinfo.sec.gov/",
        "brokercheckUrl": "https://brokercheck.finra.org/",
        "label": "IAPD North Carolina state-registered investment-adviser firms (APPROVED)",
        "caveat": "IAPD jurisdiction=NC APPROVED is complementary to the NC SOS IA register. Different source clocks. Do not force the counts to match. Not SEC RIA, not ERA, not notice, not principal office.",
    },
    "stateEra": {
        "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
        "NC_STATE_ERA_ROWS": ERA,
        "NC_STATE_ERA_DISTINCT_CRDS": ERA,
        "registrationRows": ERA,
        "distinctFirmCrd": ERA,
        "activeDistinctCrd": ERA,
        "overlapWithStateIa": 0,
        "filter": "ERA/Rgltr/@Cd=NC",
        "source": "IA_FIRM_STATE_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "label": "North Carolina state ERA reporting firms",
        "caveat": "ERA is not a North Carolina state IA and is not an SEC RIA.",
    },
    "federalNotice": {
        "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
        "NC_NOTICE_FILING_ROWS": NOTICE,
        "NC_NOTICE_FILING_DISTINCT_CRDS": NOTICE,
        "NC_NOTICE_FILED_CURRENT": NOTICE,
        "noticeRows": NOTICE,
        "noticeFiledDistinctCrd": NOTICE,
        "noticeStatus": "FILED",
        "filter": "NoticeFiled/States/@RgltrCd=NC",
        "source": "IA_FIRM_SEC_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "retrievedAt": "2026-09-17T15:15:00Z",
        "overlapApprovedStateIa": CENSUS["overlaps"]["state_ia_approved_and_notice_filed"],
        "overlapApprovedStateIaCrds": CENSUS["overlaps"]["state_ia_approved_and_notice_filed_crds"],
        "overlapApprovedStateIaJoinMethod": CENSUS["overlaps"]["state_ia_approved_and_notice_filed_joinMethod"],
        "overlapEraNotice": 0,
        "label": "SEC/IARD firms with a North Carolina notice filing",
        "caveat": "Notice filing is not North Carolina state IA registration.",
    },
    "reconciliation": {
        "EXACT_NC_SOS_IA_TO_IAPD_CRDS": len(overlap),
        "NC_SOS_ONLY_CRDS": len(sos_only),
        "IAPD_NC_STATE_IA_ONLY_CRDS": len(iapd_only),
        "NC_STATE_IA_NOTICE_OVERLAP": CENSUS["overlaps"]["state_ia_approved_and_notice_filed"],
        "NC_STATE_IA_ERA_OVERLAP": 0,
        "NC_ERA_NOTICE_OVERLAP": 0,
        "NC_PRINCIPAL_OFFICE_STATE_IA_OVERLAP": CENSUS["overlaps"]["state_ia_approved_and_principal_office"],
        "NC_PRINCIPAL_OFFICE_NOTICE_OVERLAP": CENSUS["overlaps"]["notice_filed_and_principal_office"],
        "joinMethod": "exact firm CRD",
        "clockNote": "SOS IA register current as of 2026-06-30. IAPD compilations 2026-09-17. Difference is not enforcement.",
        "do_not_sum": True,
    },
    "enforcement": {
        "NC_SECURITIES_ENFORCEMENT_CATALOG_STATUS": ENF["catalog_status"],
        "NC_SECURITIES_ENFORCEMENT_YEAR_MIN": ENF["yearMin"],
        "NC_SECURITIES_ENFORCEMENT_YEAR_MAX": ENF["yearMax"],
        "NC_SECURITIES_ENFORCEMENT_DOCUMENTS": ENF["documents"],
        "NC_SECURITIES_UNIQUE_MATTERS": None,
        "NC_ADMINISTRATIVE_ACTION_DOCUMENTS": ENF["administrative"],
        "NC_CRIMINAL_ACTION_DOCUMENTS": ENF["criminal"],
        "NC_SUMMARY_CEASE_DESIST_DOCUMENTS": ENF["summary_cease_desist"],
        "NC_FINAL_ADMINISTRATIVE_ORDER_DOCUMENTS": ENF["final_administrative_order"],
        "NC_IA_ENFORCEMENT_DOCUMENTS": None,
        "NC_IAR_ENFORCEMENT_DOCUMENTS": None,
        "NC_BD_ENFORCEMENT_DOCUMENTS": None,
        "NC_AGENT_ENFORCEMENT_DOCUMENTS": None,
        "NC_ENFORCEMENT_EXACT_CRD_DOCUMENTS": 0,
        "NC_ENFORCEMENT_EXACT_CRD_ATTACHMENTS": 0,
        "NC_ENFORCEMENT_REVIEW_REQUIRED": 0,
        "pdfsDownloaded": 0,
        "mixed_universe": True,
        "summary_ne_final": True,
        "charge_ne_conviction": True,
        "source": ENF["source"],
        "documents_2022_2026": ENF["documents_2022_2026"],
        "yearOptionsIncludeEmpty2025_2026": True,
        "nameOnly": "UNSAFE",
        "profileAttachments": [],
        "observationRows": ENF["documents"],
        "distinctCaseNumbers": None,
    },
    "complaints": {
        "NC_SECURITIES_COMPLAINT_ROWS": None,
        "NC_SECURITIES_COMPLAINT_COVERAGE": "INTAKE_AVAILABLE / BULK_NOT_PUBLIC",
        "complaint_ne_enforcement": True,
    },
    "exams": {
        "NC_IA_EXAM_RESULTS": "NOT_PUBLICLY_ACQUIRED",
    },
    "iar": {
        "NC_IAR_PERSON_DIRECTORY": "NOT_PUBLISHED",
        "grain": "person CRD (not firm CRD)",
        "registerRows": SOS_IAR_N,
        "caveat": "IAR is a person. Do not add IAR rows to IA firm counts. No mass person profiles.",
    },
    "brokerDealer": {
        "registerRows": SOS_BD_N,
        "agentRows": SOS_AG_N,
        "bd_ne_ia": True,
        "verifyUrl": "https://brokercheck.finra.org/",
    },
    "sosFramework": {
        "officialHomeUrl": "https://sosnc.gov/divisions/securities/investment_adviser_registration",
        "enforcementUrl": "https://www.sosnc.gov/divisions/securities/admin_action",
        "checkRegistrationUrl": "https://sosnc.gov/divisions/securities/check_a_registration",
        "renewalNote": "An investment adviser registration expires December 31 of each year unless renewed through IARD.",
        "clientThresholdNote": "North Carolina state IA registration is filed through IARD. Federal-covered advisers notice-file. Verify current status on IAPD or with the Securities Division.",
    },
    "expansionLedger": {
        "NET_NEW_STATE_RESEARCH_IDENTITIES": SOS_IA_N,
        "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
        "NET_NEW_PUBLIC_INVESTOR_PROFILES": 0,
        "EXISTING_ORGANIZATIONS_ENRICHED": 0,
        "GRAPH_WRITES": 0,
        "CLAIM_ELIGIBILITY_BROADENED": False,
        "EXACT_PROFILE_ATTACHMENTS": 0,
    },
    "adverse_publication": {
        "ADVERSE_SOURCES_FOUND": 2,
        "ADVERSE_SOURCES_ACQUIRED": 1,
        "ADVERSE_ROWS_ACQUIRED": ENF["documents"],
        "UNIQUE_REGULATORY_MATTERS": None,
        "EXACT_PROFILE_ATTACHMENTS": 0,
        "REVIEW_REQUIRED": 0,
        "UNRESOLVED": None,
        "INTERNAL_ONLY": 0,
        "PUBLICATION_PENDING": 0,
        "PUBLIC_READY_PROFILES": 0,
        "PUBLICLY_RENDERED_PROFILES": 0,
        "BUSINESS_RESPONSE_READY": False,
        "SEARCH_SUPPORTED": True,
    },
    "fingerprint": "",
}
snap["fingerprint"] = fingerprint(snap)
art = ROOT / "artifacts" / "nc-inv-001-public-snapshot.json"
art.write_text(json.dumps(snap, indent=2) + "\n", encoding="utf-8")
ts = ROOT / "packages" / "domain" / "src" / "nc-public-snapshot.ts"
ts.write_text(
    "/** Generated by scripts/freeze-nc-inv-snapshot.py. Do not edit by hand. */\nexport const NC_PUBLIC_SNAPSHOT = "
    + json.dumps(snap, indent=2)
    + " as const;\nexport type NcPublicSnapshot = typeof NC_PUBLIC_SNAPSHOT;\n",
    encoding="utf-8",
)
print(json.dumps({"fingerprint": snap["fingerprint"], "sos_ia": SOS_IA_N, "iapd_ia": IAPD_IA, "overlap": len(overlap)}, indent=2))
