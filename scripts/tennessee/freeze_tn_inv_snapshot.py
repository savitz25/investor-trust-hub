#!/usr/bin/env python3
"""Freeze investor-tn-state-intel-v1 (TN-INV-001).

Inputs (committed):
  data/tennessee/tn-inv-001/iapd-tn-census.json          TN partition of the accepted 2026-09-17 IAPD compilation
  data/tennessee/tn-inv-001/iapd-tn-firm-crds.json       firm CRD sets per lens (numbers only)
  data/tennessee/tn-inv-001/<archive>-archive.html       Securities Division order archive pages (article, verbatim)
  data/tennessee/tn-inv-001/enforcement-archive-acquisition.json
  data/tennessee/tn-inv-001/order-document-identifiers.json  bounded 2024-2026 identifier pass (numbers only)

Outputs: artifacts/tn-inv-001-public-snapshot.json, packages/domain/src/tn-public-snapshot.ts,
data/tennessee/tn-inv-001/enforcement-index.json. `--check` rebuilds and fails on drift.
Registration lenses are never summed. Each order keeps its archive (Consent Order, Cease and Desist
Order, Final Administrative Order, Initial Order); nothing is merged into a generic violation class.
An order is linked to a firm only through a firm CRD printed in the order that is a firm CRD in the
accepted IAPD compilation, with the IAPD firm name present in the listed caption as a guard. Nothing is
attached by name, and no profile is written. Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import tn_order_index as idx  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/tennessee/tn-inv-001"
ART = ROOT / "artifacts/tn-inv-001-public-snapshot.json"
TS = ROOT / "packages/domain/src/tn-public-snapshot.ts"
INDEX = SRC / "enforcement-index.json"

V1_PRINCIPAL = 264  # V1_ROSTER_PRINCIPAL_OFFICE_STATES TN (IA_FIRM_SEC_Feed_08_27_2026 reconciled roster geography)
ENFORCEMENT_URL = "https://www.tn.gov/commerce/securities/investors/enforcement-actions.html"
WINDOW_START = 2012


def need(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"TN-INV-001 freeze: {msg}")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fingerprint(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("generatedAt", None)
    clone.pop("fingerprint", None)
    (clone.get("clocks") or {}).pop("generatedAt", None)
    return hashlib.sha256(json.dumps(clone, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def archive_summary(rows: list[dict], window_start: int) -> dict:
    years = Counter(r["sourceYear"] for r in rows)
    dated = sorted(r["orderDate"] for r in rows if r["orderDate"])
    in_window = [r for r in rows if r["sourceYear"] >= window_start]
    return {
        "listings": len(rows),
        "documents": sum(len(r["documents"]) for r in rows),
        "listingsWithMoreThanOneDocument": sum(1 for r in rows if len(r["documents"]) > 1),
        "listingsWithoutParsedDate": sum(1 for r in rows if not r["orderDate"]),
        "yearsListed": [min(years), max(years)] if years else None,
        "earliestOrderDate": dated[0] if dated else None,
        "latestOrderDate": dated[-1] if dated else None,
        "listingsByYear": {str(y): years[y] for y in sorted(years)},
        "listingsSince2012": len(in_window),
        "documentsSince2012": sum(len(r["documents"]) for r in in_window),
    }


def main() -> None:
    check = "--check" in sys.argv
    census = read_json(SRC / "iapd-tn-census.json")
    crds = read_json(SRC / "iapd-tn-firm-crds.json")
    acq = read_json(SRC / "enforcement-archive-acquisition.json")
    ids = read_json(SRC / "order-document-identifiers.json")

    L, O, st, sec = census["lenses"], census["overlaps"], census["state"], census["sec"]
    need(st["sha256"] == "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02", "state feed is not the accepted compilation")
    need(sec["sha256"] == "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22", "SEC feed is not the accepted compilation")
    status = dict(L["state_ia_status_rows"])
    approved, term, condrest = status.get("APPROVED", 0), status.get("TERMREQUEST", 0), status.get("CONDREST", 0)
    need(approved + term + condrest == L["state_ia_distinct_crd"] == L["state_ia_registration_rows"], "state IA status partition")
    need(len(crds["state_ia_approved"]) == approved and len(crds["notice_filed"]) == L["notice_filed_distinct_crd"], "CRD lists")
    bridge = sorted(set(crds["state_ia_approved"]) & set(crds["notice_filed"]))
    need(len(bridge) == O["state_ia_approved_and_notice_filed"], "approved/notice bridge")

    rows: list[dict] = []
    for name in idx.ARCHIVES:
        article = (SRC / acq[name]["committed_file"]).read_text(encoding="utf-8")
        need(hashlib.sha256(article.rstrip("\n").encode("utf-8")).hexdigest() == acq[name]["article_sha256"], f"{name} archive bytes differ from the acquisition record")
        rows += idx.parse_archive(name, article.rstrip("\n"))
    need(len({r["id"] for r in rows}) == len(rows), "listing ids are unique")
    by_archive = {cat: [r for r in rows if r["archive"] == cat] for cat in idx.ARCHIVES.values()}

    # Bounded identifier pass (2024-2026 Consent and Cease and Desist listings).
    docs = {d["listingId"]: d for d in ids["documents"]}
    links = []
    for r in rows:
        d = docs.get(r["id"])
        r["identifierPass"] = None
        if not d:
            continue
        r["identifierPass"] = {
            "documentRead": d["documentUrl"],
            "retrieved": d.get("retrieved", False),
            "imageOnlyNotOcrd": d.get("imageOnlyNotOcrd", False),
            "crdPrintedCount": d.get("crdPrintedCount", 0),
            "crdPrintedNotInIapdFirmFeeds": d.get("crdPrintedNotInIapdFirmFeeds", 0),
            "secFileNumbersPrinted": d.get("secFileNumbersPrinted", []),
        }
        r["exactFirmCrdLinks"] = [
            {"crd": x["crd"], "iapdFeeds": x["iapdFeeds"], "method": "EXACT_FIRM_CRD_PRINTED_IN_ORDER"}
            for x in d.get("iapdFirmCrdsPrinted", [])
            if x["iapdNameInCaption"]
        ]
        r["iapdFirmCrdsPrintedNotRespondent"] = [x["crd"] for x in d.get("iapdFirmCrdsPrinted", []) if not x["iapdNameInCaption"]]
        for x in r["exactFirmCrdLinks"]:
            links.append({"listingId": r["id"], "archive": r["archive"], "orderDate": r["orderDate"], "crd": x["crd"], "iapdFeeds": x["iapdFeeds"]})
    passed = [docs[k] for k in docs]
    need(all(r["id"] in docs for r in rows if r["archive"] in ("CONSENT_ORDER", "CEASE_AND_DESIST_ORDER") and r["sourceYear"] >= ids["window"][0]), "identifier pass covers the window")

    summaries = {cat: archive_summary(v, WINDOW_START) for cat, v in by_archive.items()}
    enforcement = {
        "TN_SECURITIES_ORDER_ARCHIVES_STATUS": "ACQUIRED_COMPLETE_PUBLIC_INDEX",
        "coverage": "KNOWN",
        "source": ENFORCEMENT_URL,
        "archivePages": {cat: acq[name]["url"] for name, cat in idx.ARCHIVES.items()},
        "retrievedAt": max(v["retrievedAt"] for v in acq.values()),
        "sourceAsOf": None,
        "consentOrders": summaries["CONSENT_ORDER"],
        "ceaseAndDesistOrders": summaries["CEASE_AND_DESIST_ORDER"],
        "finalAdministrativeOrders": summaries["FINAL_ADMINISTRATIVE_ORDER"],
        "initialOrders": summaries["INITIAL_ORDER"],
        "observationRows": len(rows),
        "observationGrain": "order listing on a Division archive page (alternate copies of the same order are documents of one listing)",
        "distinctCaseNumbers": None,
        "distinctCaseNumbersNote": "The archive index prints no docket or matter number, so no case count is claimed.",
        "uniqueMatters": None,
        "archivesKeptSeparate": True,
        "orderTypeKeptAsListed": True,
        "listingCountIsNotMatterCount": True,
        "ceaseAndDesistIsNotAFindingUnlessTheOrderSaysSo": True,
        "reliefNotParsed": True,
        "publicCoverage": "Complete public index as listed (1998-2026). The preferred research window is 2012-2026; earlier listings are kept as published.",
        "pre1998": "REQUEST_ONLY",
        "identifierPass": {
            "window": ids["window"],
            "archives": ["CONSENT_ORDER", "CEASE_AND_DESIST_ORDER"],
            "listingsRead": len(passed),
            "documentsRetrieved": sum(1 for d in passed if d.get("retrieved")),
            "imageOnlyNotOcrd": sum(1 for d in passed if d.get("imageOnlyNotOcrd")),
            "listingsWithAnyCrdPrinted": sum(1 for d in passed if d.get("crdPrintedCount")),
            "crdPrintedTotal": sum(d.get("crdPrintedCount", 0) for d in passed),
            "crdPrintedNotInIapdFirmFeeds": sum(d.get("crdPrintedNotInIapdFirmFeeds", 0) for d in passed),
            "iapdFirmCrdsPrinted": sum(len(d.get("iapdFirmCrdsPrinted", [])) for d in passed),
            "iapdFirmCrdsPrintedNotRespondent": sum(1 for d in passed for x in d.get("iapdFirmCrdsPrinted", []) if not x["iapdNameInCaption"]),
            "secFileNumbersPrinted": sum(len(d.get("secFileNumbersPrinted", [])) for d in passed),
            "method": ids["method"],
            "extractedAt": ids["extractedAt"],
            "personCrdsPublished": False,
        },
        "TN_ENFORCEMENT_EXACT_CRD_LINKS": len(links),
        "exactCrdLinks": links,
        "exactCrdLinkRule": "firm CRD printed in the order AND present in the accepted 2026-09-17 IAPD firm feeds AND the IAPD firm name appears in the listed caption (guard only, never a join key)",
        "nameOnly": "UNSAFE",
        "profileAttachments": [],
        "profileAttachmentsNote": "Exact CRD links are shown on /tennessee as event evidence; no firm profile is written.",
        "standaloneEvents": len(rows) - len({x["listingId"] for x in links}),
        "recent": [
            {
                "id": r["id"],
                "archive": r["archive"],
                "caption": r["captionAsListed"],
                "orderDate": r["orderDate"],
                "dateAsListed": r["dateAsListed"],
                "documents": [{"label": d["linkTextAsListed"], "url": d["url"]} for d in r["documents"]],
                "exactFirmCrds": [x["crd"] for x in r.get("exactFirmCrdLinks", [])],
            }
            for r in rows
            if r["sourceYear"] >= 2024
        ],
    }

    snap = {
        "version": "investor-tn-state-intel-v1",
        "ticket": "TN-INV-001",
        "state": "Tennessee",
        "generatedFrom": {
            "nationalRoster": "packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES",
            "iapdStateCensus": "data/tennessee/tn-inv-001/iapd-tn-census.json",
            "enforcementArchives": "data/tennessee/tn-inv-001/*-archive.html",
            "orderIdentifiers": "data/tennessee/tn-inv-001/order-document-identifiers.json",
        },
        "asOf": "2026-09-17",
        "generatedAt": None,
        "publicationGate": "ON",
        "publicEligibility": "state_page",
        "route": "/tennessee",
        "no_trust_score": True,
        "no_ranking": True,
        "no_investment_advice": True,
        "no_nashville_page": True,
        "no_memphis_page": True,
        "claimEligibilityBroadened": False,
        "clocks": {
            "iapd_sourceAsOf": st["sourceAsOf"],
            "iapd_accepted_retrievedAt": st["retrievedAt"],
            "iapd_reverified_sha256_on": "2026-09-25",
            "v1_roster_sourceAsOf": "2026-08-27",
            "enforcement_archive_retrievedAt": enforcement["retrievedAt"],
            "enforcement_latest_order_date": max(s["latestOrderDate"] for s in summaries.values() if s["latestOrderDate"]),
            "order_identifier_pass_extractedAt": ids["extractedAt"],
            "snapshotAsOf": "2026-09-25",
            "generatedAt": None,
            "no_universal_tennessee_investor_clock": True,
            "retrieval_is_not_registration_effective_date": True,
        },
        "nationalOverlay": {
            "tnPrincipalOfficeSecIardFirms": V1_PRINCIPAL,
            "grain": "SEC IARD roster firm with principal-office region = TN",
            "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
            "sourceAsOf": "2026-08-27",
            "retrievedAt": "2026-08-28",
            "rawCompilationMainAddrTn": L["principal_office_sec_feed_distinct_crd"],
            "rawCompilationSource": "IA_FIRM_SEC_Feed_09_17_2026 MainAddr/@State=TN",
            "searchHref": "/firms?state=TN",
            "label": "SEC/IARD roster firms with a Tennessee principal office",
            "caveat": "A Tennessee principal office is not Tennessee state IA registration and is not a notice filing. These firms already exist in the federal graph.",
        },
        "stateRia": {
            "STATE_RIA_BULK_ROSTER": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_ia_registration_rows"],
            "distinctFirmCrd": L["state_ia_distinct_crd"],
            "approvedDistinctCrd": approved,
            "condrestDistinctCrd": condrest,
            "termrequestDistinctCrd": term,
            "currentDistinctCrd": L["state_ia_current_distinct_crd"],
            "statusRows": dict(sorted(status.items())),
            "principalOfficeTnAmongStateIa": L["principal_office_among_state_ia"],
            "filter": "StateRgstn/Rgltr/@Cd=TN (registration jurisdiction). Not MainAddr/@State.",
            "source": st["filename"].replace(".xml.gz", ""),
            "sourceAsOf": st["sourceAsOf"],
            "retrievedAt": st["retrievedAt"],
            "officialUrl": st["url"],
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "label": "IAPD Tennessee state-registered investment-adviser firms (APPROVED)",
            "caveat": "Tennessee state IA registration is not SEC registration, not a federal notice filing, not ERA, and not a principal office. TERMREQUEST rows are reported separately; verify current status on IAPD.",
        },
        "stateEra": {
            "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_era_registration_rows"],
            "distinctFirmCrd": L["state_era_distinct_crd"],
            "activeDistinctCrd": L["state_era_active_distinct_crd"],
            "overlapWithStateIa": O["state_ia_and_state_era"],
            "filter": "ERA/Rgltr/@Cd=TN",
            "source": st["filename"].replace(".xml.gz", ""),
            "sourceAsOf": st["sourceAsOf"],
            "label": "Tennessee state ERA reporting firms",
            "caveat": "An exempt reporting adviser is not a Tennessee state-registered IA and not an SEC RIA.",
        },
        "federalNotice": {
            "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
            "noticeRows": L["notice_rows"],
            "noticeFiledDistinctCrd": L["notice_filed_distinct_crd"],
            "noticeStatus": "FILED",
            "noticeFiledFirmType": {k: v for k, v in L["notice_filed_firm_type"].items() if k != "raw"},
            "filter": "NoticeFiled/States/@RgltrCd=TN",
            "source": sec["filename"].replace(".xml.gz", ""),
            "sourceAsOf": sec["sourceAsOf"],
            "retrievedAt": sec["retrievedAt"],
            "overlapApprovedStateIa": len(bridge),
            "overlapApprovedStateIaCrds": bridge,
            "overlapApprovedStateIaJoinMethod": "exact firm CRD set intersection of APPROVED StateRgstn/Rgltr/@Cd=TN and NoticeFiled/States/@RgltrCd=TN St=FILED",
            "overlapEraNotice": O["state_era_and_notice_filed"],
            "noticeFiledWithTnPrincipalOffice": O["notice_filed_and_principal_office"],
            "label": "SEC-registered advisers with a Tennessee notice filing",
            "caveat": "A notice filing is not Tennessee state IA registration.",
        },
        "reconciliation": {
            "TN_STATE_IA_NOTICE_OVERLAP": len(bridge),
            "TN_STATE_IA_ERA_OVERLAP": O["state_ia_and_state_era"],
            "TN_ERA_NOTICE_OVERLAP": O["state_era_and_notice_filed"],
            "TN_PRINCIPAL_OFFICE_STATE_IA_OVERLAP_SEC_FEED": O["state_ia_and_principal_office_sec_feed"],
            "TN_STATE_IA_WITH_TN_MAIN_ADDRESS": L["principal_office_among_state_ia"],
            "TN_PRINCIPAL_OFFICE_NOTICE_OVERLAP": O["notice_filed_and_principal_office"],
            "TN_PRINCIPAL_OFFICE_NOT_NOTICE_FILED": O["principal_office_not_notice_filed"],
            "TN_PRINCIPAL_OFFICE_OVERLAY": V1_PRINCIPAL,
            "joinMethod": "exact firm CRD",
            "clockNote": "IAPD compilations 2026-09-17; the V1 principal-office overlay is the 2026-08-27 roster geography. The difference is a clock difference, not enforcement.",
            "do_not_sum": True,
        },
        "enforcement": enforcement,
        "records": {
            "TN_REGISTRATION_RECORDS_CAPABILITY": "KNOWN",
            "classes": ["broker-dealer", "agent", "investment adviser", "investment adviser representative"],
            "channel": "Securities Division Investment Adviser/Broker-Dealer Check points to IAPD and BrokerCheck; public records requests go to the Department of Commerce & Insurance",
            "sourceUrl": "https://www.tn.gov/commerce/securities/industry-professionals/investment-adviser-broker-dealer-check.html",
            "bulkRoster": "NOT_ACQUIRED",
            "paidRequestsSubmitted": 0,
        },
        "complaints": {
            "TN_SECURITIES_COMPLAINT_ROWS": None,
            "intake": "KNOWN",
            "providerLevelComplaints": "NOT_ACQUIRED",
            "complaintOutcomes": "NOT_ACQUIRED / REQUEST_ONLY",
            "sourceUrl": "https://www.tn.gov/commerce/securities/investors/file-a-complaint/investments-complaint.html",
            "complaint_ne_enforcement": True,
            "notDerivedFromOrderArchives": True,
        },
        "iar": {
            "TN_IAR_REGISTRATION_CAPABILITY": "KNOWN",
            "TN_IAR_ROWS": None,
            "TN_IAR_PERSON_DIRECTORY": "NOT_PUBLISHED",
            "grain": "person CRD (not firm CRD); Form U4 through Web CRD/IARD",
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "caveat": "An IAR is a person. IAR registrations are never added to firm counts, and no person profiles are created.",
        },
        "brokerDealer": {
            "TN_BD_VERIFICATION": "KNOWN",
            "TN_AGENT_VERIFICATION": "KNOWN",
            "TN_DEALER_ROWS": None,
            "TN_AGENT_ROWS": None,
            "stateOnlyBulk": "NOT_ACQUIRED",
            "bd_ne_ia": True,
            "agent_ne_iar": True,
            "verifyUrl": "https://brokercheck.finra.org/",
        },
        "offerings": {"status": "DEFERRED", "note": "Securities offering registrations and exemptions are not provider identity and were not ingested."},
        "divisionFramework": {
            "regulator": "Tennessee Department of Commerce & Insurance, Securities Division",
            "officialHomeUrl": "https://www.tn.gov/commerce/securities.html",
            "enforcementArchiveUrl": ENFORCEMENT_URL,
            "statute": "Tennessee Securities Act of 1983 (Tenn. Code Ann. Title 48, Chapter 1)",
            "infrastructure": "IARD for investment advisers and representatives; CRD/BrokerCheck for broker-dealers and agents. Infrastructure is not the regulator.",
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
            "consent_order_index": "KNOWN",
            "cease_and_desist_order_index": "KNOWN",
            "final_administrative_order_index": "KNOWN",
            "initial_order_index": "KNOWN",
            "order_document_identifiers_2024_2026": "PARTIAL",
            "order_document_identifiers_pre_2024": "NOT_ACQUIRED",
            "enforcement_unique_matters": "UNKNOWN",
            "enforcement_exact_crd_links": "PARTIAL",
            "registration_disciplinary_records": "KNOWN",
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
    index = {
        "version": "investor-tn-enforcement-index-v1",
        "source": ENFORCEMENT_URL,
        "retrievedAt": enforcement["retrievedAt"],
        "listings": rows,
    }
    existing = read_json(ART) if ART.exists() else None
    generated = existing["generatedAt"] if check and existing else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    snap["generatedAt"] = generated
    snap["clocks"]["generatedAt"] = generated
    snap["fingerprint"] = fingerprint(snap)
    art_text = json.dumps(snap, indent=2, ensure_ascii=False) + "\n"
    ts_text = (
        "/** Generated by scripts/tennessee/freeze_tn_inv_snapshot.py. Do not edit by hand. */\nexport const TN_PUBLIC_SNAPSHOT = "
        + json.dumps(snap, indent=2, ensure_ascii=False)
        + " as const;\nexport type TnPublicSnapshot = typeof TN_PUBLIC_SNAPSHOT;\n"
    )
    index_text = json.dumps(index, indent=1, ensure_ascii=False) + "\n"
    if check:
        for path, text in ((ART, art_text), (TS, ts_text), (INDEX, index_text)):
            need(path.exists() and path.read_text(encoding="utf-8").replace("\r\n", "\n") == text, f"{path.relative_to(ROOT)} drifted; rerun the freeze")
        print("check", snap["fingerprint"])
        return
    for path, text in ((ART, art_text), (TS, ts_text), (INDEX, index_text)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "fingerprint": snap["fingerprint"],
                "state_ia": [approved, term, condrest],
                "era": L["state_era_active_distinct_crd"],
                "notice": L["notice_filed_distinct_crd"],
                "principal_v1": V1_PRINCIPAL,
                "bridge": bridge,
                "archives": {k: [v["listings"], v["documents"], v["yearsListed"], v["listingsSince2012"]] for k, v in summaries.items()},
                "idpass": enforcement["identifierPass"],
                "links": links,
            },
            indent=1,
        )
    )


if __name__ == "__main__":
    main()
