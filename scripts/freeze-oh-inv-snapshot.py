#!/usr/bin/env python3
"""Freeze investor-oh-state-intel-v1."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CENSUS = json.loads((ROOT / "data/ohio/oh-inv-001/iapd-oh-census.json").read_text(encoding="utf-8"))
PROBE = json.loads((ROOT / "data/ohio/oh-inv-001/star-probe.json").read_text(encoding="utf-8"))

STATE = CENSUS["state"]
SEC = CENSUS["sec"]
OV = CENSUS["overlaps"]
IAPD_IA = STATE["co_state_ia_approved_distinct_crd"]
IAPD_IA_ROWS = STATE["co_state_ia_registration_rows"]
IAPD_IA_DISTINCT = STATE["co_state_ia_distinct_crd"]
TERM = STATE["co_state_ia_termrequest_distinct_crd"]
ERA = STATE["co_state_era_active_distinct_crd"]
ERA_ROWS = STATE["co_state_era_registration_rows"]
NOTICE = SEC["co_notice_filed_distinct_crd"]
NOTICE_ROWS = SEC["co_notice_rows"]
RAW_PRINCIPAL = SEC["co_principal_office_distinct_crd"]
V1_PRINCIPAL = 426
OVERLAP_NOTICE = OV["state_ia_approved_and_notice_filed"]
OVERLAP_ERA = OV["state_ia_and_state_era"]
OVERLAP_ERA_NOTICE = OV["state_era_and_notice_filed"]
OVERLAP_PO_IA = OV["state_ia_approved_and_principal_office"]
OVERLAP_PO_NOTICE = OV["notice_filed_and_principal_office"]
OVERLAP_CRDS = OV.get("state_ia_approved_and_notice_filed_crds") or []


def fingerprint(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("generatedAt", None)
    clocks = clone.get("clocks") or {}
    clocks.pop("generatedAt", None)
    clone["clocks"] = clocks
    clone.pop("fingerprint", None)
    return hashlib.sha256(json.dumps(clone, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
snap = {
    "version": "investor-oh-state-intel-v1",
    "ticket": "OH-INV-001",
    "generatedFrom": {
        "nationalRoster": "packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES",
        "iapdStateCensus": "data/ohio/oh-inv-001/iapd-oh-census.json",
        "starProbe": "data/ohio/oh-inv-001/star-probe.json",
    },
    "asOf": "2026-09-17",
    "generatedAt": generated,
    "publicationGate": "ON",
    "publicEligibility": "state_page",
    "route": "/ohio",
    "growthClassification": "INTELLIGENCE_GROWTH_HEAVY",
    "no_trust_score": True,
    "no_ranking": True,
    "no_columbus_page": True,
    "no_cleveland_page": True,
    "claimEligibilityBroadened": False,
    "local_work_needed_now": "NO",
    "clocks": {
        "iapd_sourceAsOf": "2026-09-17",
        "star_retrievedAt": PROBE.get("retrievedAt"),
        "v1_roster_sourceAsOf": "2026-08-27",
        "order_date": None,
        "noh_date": None,
        "final_order_date": None,
        "bulletin_period": None,
        "retrievedAt": STATE["retrievedAt"],
        "snapshotAsOf": "2026-09-17",
        "generatedAt": generated,
        "no_universal_ohio_investor_clock": True,
    },
    "nationalOverlay": {
        "ohPrincipalOfficeSecIardFirms": V1_PRINCIPAL,
        "grain": "SEC IARD roster firm with principal-office region = OH",
        "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
        "sourceAsOf": "2026-08-27",
        "retrievedAt": "2026-08-28",
        "universe": 23622,
        "resolvedPrincipalOfficeRegions": 17997,
        "searchHref": "/firms?state=OH",
        "rawCompilationMainAddrOh": RAW_PRINCIPAL,
        "rawCompilationSource": "IA_FIRM_SEC_Feed_09_17_2026 MainAddr/@State=OH",
        "label": "SEC/IARD roster firms with an Ohio principal office",
        "caveat": "An Ohio principal office is not Ohio state IA registration and is not a notice filing. These firms already exist in the federal graph.",
    },
    "stateRia": {
        "STATE_RIA_BULK_ROSTER": "ACQUIRED_IAPD_STATE_COMPILATION",
        "OH_STATE_IA_ROWS": IAPD_IA_ROWS,
        "OH_STATE_IA_DISTINCT_CRDS": IAPD_IA_DISTINCT,
        "OH_STATE_IA_APPROVED_CURRENT": IAPD_IA,
        "registrationRows": IAPD_IA_ROWS,
        "distinctFirmCrd": IAPD_IA_DISTINCT,
        "approvedDistinctCrd": IAPD_IA,
        "termrequestDistinctCrd": TERM,
        "filter": "StateRgstn/Rgltr/@Cd=OH (registration jurisdiction). Not MainAddr/@State.",
        "source": "IA_FIRM_STATE_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "retrievedAt": STATE["retrievedAt"],
        "verifyUrl": "https://adviserinfo.sec.gov/",
        "officialUrl": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_17_2026.xml.gz",
        "divisionHomeUrl": "https://com.ohio.gov/divisions-and-programs/securities",
        "starUrl": "https://securities.com.ohio.gov/odoc/page/OH.ERNIE/portal.aspx",
        "recordsRequestUrl": "https://recordrequest.com.ohio.gov/",
        "iapdUrl": "https://adviserinfo.sec.gov/",
        "brokercheckUrl": "https://brokercheck.finra.org/",
        "label": "IAPD Ohio state-registered investment-adviser firms (APPROVED)",
        "caveat": "Ohio state IA license is not SEC registration, not a federal notice filing, not ERA, and not a principal office. Annual expiration on December 31 is statutory context, not a firm-level status. Verify current status on IAPD.",
    },
    "stateEra": {
        "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
        "OH_STATE_ERA_ROWS": ERA_ROWS,
        "OH_STATE_ERA_DISTINCT_CRDS": ERA,
        "registrationRows": ERA_ROWS,
        "distinctFirmCrd": ERA,
        "activeDistinctCrd": ERA,
        "overlapWithStateIa": OVERLAP_ERA,
        "filter": "ERA/Rgltr/@Cd=OH",
        "source": "IA_FIRM_STATE_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "label": "Ohio state ERA reporting firms",
        "caveat": "ERA is not an Ohio licensed state IA and is not an SEC RIA.",
    },
    "federalNotice": {
        "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
        "OH_NOTICE_FILING_ROWS": NOTICE_ROWS,
        "OH_NOTICE_FILING_DISTINCT_CRDS": NOTICE,
        "OH_NOTICE_FILED_CURRENT": NOTICE,
        "noticeRows": NOTICE_ROWS,
        "noticeFiledDistinctCrd": NOTICE,
        "noticeStatus": "FILED",
        "filter": "NoticeFiled/States/@RgltrCd=OH",
        "source": "IA_FIRM_SEC_Feed_09_17_2026",
        "sourceAsOf": "2026-09-17",
        "retrievedAt": SEC["retrievedAt"],
        "overlapApprovedStateIa": OVERLAP_NOTICE,
        "overlapApprovedStateIaCrds": OVERLAP_CRDS,
        "overlapApprovedStateIaJoinMethod": OV["state_ia_approved_and_notice_filed_joinMethod"],
        "overlapEraNotice": OVERLAP_ERA_NOTICE,
        "label": "SEC/IARD firms with an Ohio notice filing",
        "caveat": "Notice filing is not Ohio state IA registration.",
    },
    "star": {
        "OH_STAR_FILING_SEARCH_STATUS": "OPEN_SEARCH_ONLY",
        "OH_STAR_IA_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
        "OH_STAR_IAR_ROSTER_STATUS": "OPEN_SEARCH_ONLY",
        "OH_STAR_EXACT_CRD_ROWS": None,
        "OH_RECORDS_REQUEST_ONLY_CLASSES": ["dealer", "salesperson", "IA", "IAR"],
        "ernie_scope": "securities offering exemption / registration / notice filings (ERNIE), not an IA/IAR license census",
        "ernie_retention": "eight years then destroyed",
        "records_request_url": "https://recordrequest.com.ohio.gov/",
        "filing_search_ne_census": True,
    },
    "reconciliation": {
        "EXACT_OH_STATE_SOURCE_TO_IAPD_CRDS": None,
        "OH_STATE_SOURCE_ONLY_CRDS": None,
        "IAPD_OH_STATE_IA_ONLY_CRDS": None,
        "OH_STATE_IA_NOTICE_OVERLAP": OVERLAP_NOTICE,
        "OH_STATE_IA_ERA_OVERLAP": OVERLAP_ERA,
        "OH_ERA_NOTICE_OVERLAP": OVERLAP_ERA_NOTICE,
        "OH_PRINCIPAL_OFFICE_STATE_IA_OVERLAP": OVERLAP_PO_IA,
        "OH_PRINCIPAL_OFFICE_NOTICE_OVERLAP": OVERLAP_PO_NOTICE,
        "OH_PRINCIPAL_OFFICE_OVERLAY": V1_PRINCIPAL,
        "OH_PRINCIPAL_OFFICE_DISTINCT_CRDS": V1_PRINCIPAL,
        "joinMethod": "exact firm CRD",
        "clockNote": "IAPD compilations 2026-09-17. V1 principal-office overlay is the 2026-08-27 roster geography. STAR/state-native IA roster was not enumerable. Difference is not enforcement.",
        "do_not_sum": True,
    },
    "enforcement": {
        "OH_SECURITIES_ORDER_SEARCH_STATUS": "OPEN_SEARCH_ONLY / INCOMPLETE_RETRIEVAL_WARNED",
        "OH_SECURITIES_ORDER_DOCUMENTS": None,
        "OH_SECURITIES_UNIQUE_MATTERS": None,
        "OH_SECURITIES_ENFORCEMENT_DOCUMENTS": None,
        "OH_NOH_DOCUMENTS": None,
        "OH_FINAL_ORDER_DOCUMENTS": None,
        "OH_CONSENT_ORDER_DOCUMENTS": None,
        "OH_CEASE_DESIST_DOCUMENTS": None,
        "OH_IA_ENFORCEMENT_DOCUMENTS": None,
        "OH_IAR_ENFORCEMENT_DOCUMENTS": None,
        "OH_DEALER_ENFORCEMENT_DOCUMENTS": None,
        "OH_SALESPERSON_ENFORCEMENT_DOCUMENTS": None,
        "OH_OTHER_SECURITIES_ENFORCEMENT_DOCUMENTS": None,
        "OH_ENFORCEMENT_EXACT_CRD_DOCUMENTS": 0,
        "OH_ENFORCEMENT_EXACT_CRD_ATTACHMENTS": 0,
        "OH_ENFORCEMENT_REVIEW_REQUIRED": 0,
        "observationRows": None,
        "distinctCaseNumbers": None,
        "pdfsDownloaded": 0,
        "mixed_universe": True,
        "noh_ne_final": True,
        "summary_ne_final": True,
        "charge_ne_conviction": True,
        "admin_order_ne_criminal": True,
        "online_search_incomplete": True,
        "monthly_enforcement_complete_listing_claimed_by_division": True,
        "bulletin_ne_order_catalog": True,
        "source": "https://com.ohio.gov/divisions-and-programs/securities/division-orders/division-orders",
        "starOrdersUrl": "https://com.ohio.gov/divisions-and-programs/securities/division-orders/division-orders",
        "nameOnly": "UNSAFE",
        "profileAttachments": [],
    },
    "complaints": {
        "OH_SECURITIES_COMPLAINT_ROWS": None,
        "OH_SECURITIES_COMPLAINT_COVERAGE": "INTAKE_AVAILABLE / BULK_NOT_PUBLIC",
        "complaint_ne_enforcement": True,
        "intakeUrl": "https://com.ohio.gov/divisions-and-programs/securities/file-a-complaint-securities",
    },
    "iar": {
        "OH_IAR_ROSTER_STATUS": "OPEN_SEARCH_ONLY / RECORDS_REQUEST_ONLY",
        "OH_IAR_ROWS": None,
        "OH_IAR_DISTINCT_CRDS": None,
        "grain": "person CRD (not firm CRD)",
        "caveat": "IAR is a person. Do not add IAR rows to IA firm counts. No mass person profiles.",
    },
    "brokerDealer": {
        "OH_DEALER_ROSTER_STATUS": "OPEN_SEARCH_ONLY / RECORDS_REQUEST_ONLY",
        "OH_DEALER_ROWS": None,
        "OH_SALESPERSON_ROSTER_STATUS": "OPEN_SEARCH_ONLY / RECORDS_REQUEST_ONLY",
        "OH_SALESPERSON_ROWS": None,
        "bd_ne_ia": True,
        "salesperson_ne_iar": True,
        "verifyUrl": "https://brokercheck.finra.org/",
    },
    "divisionFramework": {
        "officialHomeUrl": "https://com.ohio.gov/divisions-and-programs/securities",
        "starUrl": "https://securities.com.ohio.gov/odoc/page/OH.ERNIE/portal.aspx",
        "recordsRequestUrl": "https://recordrequest.com.ohio.gov/",
        "ordersUrl": "https://com.ohio.gov/divisions-and-programs/securities/division-orders/division-orders",
        "complaintUrl": "https://com.ohio.gov/divisions-and-programs/securities/file-a-complaint-securities",
        "statute": "Ohio Securities Act / Chapter 1707",
        "renewalNote": "Ohio IA and IAR licenses expire December 31 unless renewed. That is statutory context, not a firm-level current-status observation.",
    },
    "expansionLedger": {
        "NET_NEW_STATE_RESEARCH_IDENTITIES": IAPD_IA,
        "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
        "NET_NEW_PUBLIC_INVESTOR_PROFILES": 0,
        "EXISTING_ORGANIZATIONS_ENRICHED": 0,
        "GRAPH_WRITES": 0,
        "CLAIM_ELIGIBILITY_BROADENED": False,
        "EXACT_PROFILE_ATTACHMENTS": 0,
    },
    "adverse_publication": {
        "ADVERSE_SOURCES_FOUND": 3,
        "ADVERSE_SOURCES_ACQUIRED": 0,
        "ADVERSE_ROWS_ACQUIRED": None,
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
        "REMAINING_ADVERSE_GAPS": [
            "STAR Final Orders searchable index (incomplete retrieval warned)",
            "NOH vs Final Order enumeration",
            "Monthly Enforcement Actions catalog",
            "Securities Bulletin order-number dedupe",
        ],
        "WITHHELD_REASON_COUNTS": {
            "OPEN_SEARCH_ONLY": 4,
            "INTAKE_AVAILABLE / BULK_NOT_PUBLIC": 1,
            "INCOMPLETE_RETRIEVAL_WARNED": 1,
        },
    },
    "fingerprint": "",
}
snap["fingerprint"] = fingerprint(snap)
art = ROOT / "artifacts" / "oh-inv-001-public-snapshot.json"
art.write_text(json.dumps(snap, indent=2) + "\n", encoding="utf-8")
ts = ROOT / "packages" / "domain" / "src" / "oh-public-snapshot.ts"
ts.write_text(
    "/** Generated by scripts/freeze-oh-inv-snapshot.py. Do not edit by hand. */\nexport const OH_PUBLIC_SNAPSHOT = "
    + json.dumps(snap, indent=2)
    + " as const;\nexport type OhPublicSnapshot = typeof OH_PUBLIC_SNAPSHOT;\n",
    encoding="utf-8",
)
print(json.dumps({"fingerprint": snap["fingerprint"], "iapd_ia": IAPD_IA, "era": ERA, "notice": NOTICE, "principal": V1_PRINCIPAL}, indent=2))
