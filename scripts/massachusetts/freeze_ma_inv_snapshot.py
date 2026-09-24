#!/usr/bin/env python3
"""Freeze investor-ma-state-intel-v1 (MA-INV-001).

Inputs (committed):
  data/massachusetts/ma-inv-001/iapd-ma-census.json        MA partition of the accepted 2026-09-17 IAPD compilation
  data/massachusetts/ma-inv-001/iapd-ma-firm-crds.json     firm CRD sets per lens (numbers only)
  data/massachusetts/ma-inv-001/enforcement-archive-main.html  Securities Division archive listing (<main>, verbatim)
  data/massachusetts/ma-inv-001/enforcement-archive-acquisition.json

Outputs: artifacts/ma-inv-001-public-snapshot.json, packages/domain/src/ma-public-snapshot.ts,
data/massachusetts/ma-inv-001/enforcement-index.json. `--check` rebuilds and fails on drift.
Registration lenses are never summed. Enforcement documents keep their exact listed type; a complaint
is an allegation, not a finding. Nothing is attached to a profile by name. Standard library only.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/massachusetts/ma-inv-001"
ART = ROOT / "artifacts/ma-inv-001-public-snapshot.json"
TS = ROOT / "packages/domain/src/ma-public-snapshot.ts"
INDEX = SRC / "enforcement-index.json"

V1_PRINCIPAL = 803  # V1_ROSTER_PRINCIPAL_OFFICE_STATES MA (IA_FIRM_SEC_Feed_08_27_2026 reconciled roster geography)
ARCHIVE_URL = "https://www.sec.state.ma.us/divisions/securities/enforcement/enforcement-actions.htm"
BASE = "https://www.sec.state.ma.us/divisions/securities/enforcement/"
MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MONTHS.update({"jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12})

ALLEGATION_TYPES = {"COMPLAINT", "ADMINISTRATIVE_COMPLAINT", "AMENDED_COMPLAINT"}
ORDER_TYPES = {"CONSENT_ORDER", "ORDER", "CEASE_AND_DESIST_ORDER", "EX_PARTE_ORDER_TO_CEASE_AND_DESIST", "SUSPENSION_ORDER"}
SUPPORTING_TYPES = {"EXHIBITS", "MEMORANDUM"}


def need(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"MA-INV-001 freeze: {msg}")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def text_of(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def iso(date_text: str | None) -> str | None:
    if not date_text:
        return None
    m = re.fullmatch(r"([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})", date_text.strip())
    if not m or m.group(1).lower() not in MONTHS:
        return None
    return f"{int(m.group(3))}-{MONTHS[m.group(1).lower()]:02d}-{int(m.group(2)):02d}"


def document_type(link_text: str) -> str:
    s = link_text.lower()
    for pattern, kind in (
        (r"ex parte order to cease and desist", "EX_PARTE_ORDER_TO_CEASE_AND_DESIST"),
        (r"cease and desist order", "CEASE_AND_DESIST_ORDER"),
        (r"suspension order", "SUSPENSION_ORDER"),
        (r"consent[- ]order", "CONSENT_ORDER"),
        (r"administrative complaint", "ADMINISTRATIVE_COMPLAINT"),
        (r"amm?ended complaint", "AMENDED_COMPLAINT"),
        (r"complaint", "COMPLAINT"),
        (r"\border\b", "ORDER"),
        (r"exhibit", "EXHIBITS"),
        (r"memorandum", "MEMORANDUM"),
    ):
        if re.search(pattern, s):
            return kind
    return "OTHER_AS_LISTED"


def dockets(text: str) -> list[str]:
    return sorted({f"E-{y}-{n.zfill(4)}" for y, n in re.findall(r"(?:^|[^A-Za-z0-9])[Ee]-?\s?(\d{4})-(\d{3,4})", text)})


def parse_archive(main: str) -> list[dict]:
    years = [(m.start(), int(m.group(1))) for m in re.finditer(r'<button class="usa-accordion__button"[^>]*>\s*(\d{4})\s*</button>', main)]
    need(years and years[0][1] == 2026 and years[-1][1] == 2012, f"year sections {[y for _, y in years]}")
    out: list[dict] = []
    for k, (pos, year) in enumerate(years):
        block = main[pos:(years[k + 1][0] if k + 1 < len(years) else len(main))]
        for n, details in enumerate(re.findall(r"<details.*?</details>", block, re.S), 1):
            summary, body = details.split("</summary>", 1)
            headline = text_of((re.search(r"<b>(.*?)</b>", summary, re.S) or re.search(r"<summary[^>]*>(.*)", summary, re.S)).group(1))
            date_span = re.search(r'<span style="font-size:14px[^"]*">(.*?)</span>', summary, re.S)
            listed = text_of(date_span.group(1)) if date_span else None
            docs = []
            for j, a in enumerate(re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', body, re.S), 1):
                href, label = a.group(1), text_of(a.group(2))
                url = href if href.startswith("http") else ("https://www.sec.state.ma.us" + href if href.startswith("/") else BASE + href)
                kind = document_type(label)
                docs.append({
                    "id": f"ma-sd-{year}-{n:02d}-d{j}",
                    "document_type": kind,
                    "document_link_text_as_listed": label,
                    "role": "ALLEGATIONS" if kind in ALLEGATION_TYPES else "ORDER_AS_LISTED" if kind in ORDER_TYPES else "SUPPORTING",
                    "docket_numbers": dockets(f"{href} {label}"),
                    "crd_printed_in_listing": re.findall(r"CRD\s*(?:No\.?|#)?\s*(\d+)", label, re.I),
                    "url": url,
                })
            need(docs, f"{year} item {n} has no document")
            out.append({
                "id": f"ma-sd-{year}-{n:02d}",
                "archive_year": year,
                "headline_as_listed": headline,
                "listing_date_as_listed": listed,
                "listing_date": iso(listed),
                "documents": docs,
                "docket_numbers": sorted({d for doc in docs for d in doc["docket_numbers"]}),
            })
    return out


def fingerprint(payload: dict) -> str:
    clone = json.loads(json.dumps(payload))
    clone.pop("generatedAt", None)
    clone.pop("fingerprint", None)
    (clone.get("clocks") or {}).pop("generatedAt", None)
    return hashlib.sha256(json.dumps(clone, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def main() -> None:
    check = "--check" in sys.argv
    census = read_json(SRC / "iapd-ma-census.json")
    crds = read_json(SRC / "iapd-ma-firm-crds.json")
    acq = read_json(SRC / "enforcement-archive-acquisition.json")
    main_html = (SRC / "enforcement-archive-main.html").read_text(encoding="utf-8").rstrip("\n")
    need(hashlib.sha256(main_html.encode("utf-8")).hexdigest() == acq["main_sha256"], "archive listing bytes differ from the acquisition record")

    L, O, st, sec = census["lenses"], census["overlaps"], census["state"], census["sec"]
    need(st["sha256"] == "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02", "state feed is not the accepted compilation")
    need(sec["sha256"] == "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22", "SEC feed is not the accepted compilation")
    status = dict(L["state_ia_status_rows"])
    approved, term, condrest = status.get("APPROVED", 0), status.get("TERMREQUEST", 0), status.get("CONDREST", 0)
    need(approved + term + condrest == L["state_ia_distinct_crd"] == L["state_ia_registration_rows"], "state IA status partition")
    need(len(crds["state_ia_approved"]) == approved and len(crds["notice_filed"]) == L["notice_filed_distinct_crd"], "CRD lists")
    bridge = sorted(set(crds["state_ia_approved"]) & set(crds["notice_filed"]))
    need(len(bridge) == O["state_ia_approved_and_notice_filed"], "approved/notice bridge")

    items = parse_archive(main_html)
    documents = [d for i in items for d in i["documents"]]
    types = Counter(d["document_type"] for d in documents)
    need("OTHER_AS_LISTED" not in types, f"unclassified document type: {types}")
    all_dockets = sorted({d for i in items for d in i["docket_numbers"]})
    by_year = Counter(i["archive_year"] for i in items)
    dated = [i["listing_date"] for i in items if i["listing_date"]]

    enforcement = {
        "MA_SECURITIES_ARCHIVE_STATUS": "ACQUIRED_PUBLIC_ARCHIVE_2012_2026",
        "coverage": "KNOWN",
        "source": ARCHIVE_URL,
        "retrievedAt": acq["retrieved_at"],
        "sourceAsOf": None,
        "archiveYears": [min(by_year), max(by_year)],
        "latestListingDate": max(dated),
        "earliestListingDate": min(dated),
        "announcementsByYear": {str(y): by_year[y] for y in sorted(by_year)},
        "announcements": len(items),
        "announcementsWithoutListedDate": sum(1 for i in items if not i["listing_date"]),
        "observationRows": len(documents),
        "documentTypes": dict(sorted(types.items())),
        "allegationDocuments": sum(1 for d in documents if d["role"] == "ALLEGATIONS"),
        "orderDocumentsAsListed": sum(1 for d in documents if d["role"] == "ORDER_AS_LISTED"),
        "supportingDocuments": sum(1 for d in documents if d["role"] == "SUPPORTING"),
        "distinctCaseNumbers": len(all_dockets),
        "announcementsWithPrintedDocket": sum(1 for i in items if i["docket_numbers"]),
        "announcementsWithoutPrintedDocket": sum(1 for i in items if not i["docket_numbers"]),
        "docketsOnMoreThanOneAnnouncement": sorted(d for d, c in Counter(x for i in items for x in i["docket_numbers"]).items() if c > 1),
        "uniqueMatters": None,
        "uniqueMattersNote": "Only printed docket numbers are deduplicated. Announcements without a printed docket are not merged, so a unique-matter count is not claimed.",
        "documentCountIsNotMatterCount": True,
        "complaintIsAllegationNotFinding": True,
        "orderTypeKeptAsListed": True,
        "reliefNotParsed": True,
        "pdfsParsed": 0,
        "linkedDocumentRetrieval": acq["linked_documents_retrieval"],
        "crdPrintedInListing": sum(len(d["crd_printed_in_listing"]) for d in documents),
        "MA_ENFORCEMENT_EXACT_CRD_ATTACHMENTS": 0,
        "nameOnly": "UNSAFE",
        "profileAttachments": [],
        "standaloneEvents": len(items),
        "pre2012": "REQUEST_ONLY",
        "pre2012Statement": acq["pre_2012_statement"],
        "pre2012ContactUrl": acq["pre_2012_contact_url"],
        "recent": [
            {"id": i["id"], "headline": i["headline_as_listed"], "listingDate": i["listing_date"],
             "documents": [{"type": d["document_type"], "label": d["document_link_text_as_listed"], "url": d["url"]} for d in i["documents"]]}
            for i in items if i["archive_year"] >= 2025
        ],
    }

    snap = {
        "version": "investor-ma-state-intel-v1",
        "ticket": "MA-INV-001",
        "state": "Massachusetts",
        "generatedFrom": {
            "nationalRoster": "packages/domain/src/investor-home-intel.ts V1_ROSTER_PRINCIPAL_OFFICE_STATES",
            "iapdStateCensus": "data/massachusetts/ma-inv-001/iapd-ma-census.json",
            "enforcementArchive": "data/massachusetts/ma-inv-001/enforcement-archive-main.html",
        },
        "asOf": "2026-09-17",
        "generatedAt": None,
        "publicationGate": "ON",
        "publicEligibility": "state_page",
        "route": "/massachusetts",
        "no_trust_score": True,
        "no_ranking": True,
        "no_investment_advice": True,
        "no_boston_page": True,
        "no_worcester_page": True,
        "claimEligibilityBroadened": False,
        "clocks": {
            "iapd_sourceAsOf": st["sourceAsOf"],
            "iapd_accepted_retrievedAt": st["retrievedAt"],
            "iapd_reverified_sha256_on": "2026-09-24",
            "v1_roster_sourceAsOf": "2026-08-27",
            "enforcement_archive_retrievedAt": acq["retrieved_at"],
            "enforcement_latest_listing_date": max(dated),
            "snapshotAsOf": "2026-09-24",
            "generatedAt": None,
            "no_universal_massachusetts_investor_clock": True,
        },
        "nationalOverlay": {
            "maPrincipalOfficeSecIardFirms": V1_PRINCIPAL,
            "grain": "SEC IARD roster firm with principal-office region = MA",
            "source": "IA_FIRM_SEC_Feed_08_27_2026 (reconciled V1 roster geography)",
            "sourceAsOf": "2026-08-27",
            "retrievedAt": "2026-08-28",
            "rawCompilationMainAddrMa": L["principal_office_sec_feed_distinct_crd"],
            "rawCompilationSource": "IA_FIRM_SEC_Feed_09_17_2026 MainAddr/@State=MA",
            "searchHref": "/firms?state=MA",
            "label": "SEC/IARD roster firms with a Massachusetts principal office",
            "caveat": "A Massachusetts principal office is not Massachusetts state IA registration and is not a notice filing. These firms already exist in the federal graph.",
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
            "principalOfficeMaAmongStateIa": L["principal_office_among_state_ia"],
            "filter": "StateRgstn/Rgltr/@Cd=MA (registration jurisdiction). Not MainAddr/@State.",
            "source": st["filename"].replace(".xml.gz", ""),
            "sourceAsOf": st["sourceAsOf"],
            "retrievedAt": st["retrievedAt"],
            "officialUrl": st["url"],
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "label": "IAPD Massachusetts state-registered investment-adviser firms (APPROVED)",
            "caveat": "Massachusetts state IA registration is not SEC registration, not a federal notice filing, not ERA, and not a principal office. CONDREST and TERMREQUEST rows are reported separately; verify current status on IAPD.",
        },
        "stateEra": {
            "STATE_ERA_REPORTING": "ACQUIRED_IAPD_STATE_COMPILATION",
            "registrationRows": L["state_era_registration_rows"],
            "distinctFirmCrd": L["state_era_distinct_crd"],
            "activeDistinctCrd": L["state_era_active_distinct_crd"],
            "overlapWithStateIa": O["state_ia_and_state_era"],
            "filter": "ERA/Rgltr/@Cd=MA",
            "source": st["filename"].replace(".xml.gz", ""),
            "sourceAsOf": st["sourceAsOf"],
            "label": "Massachusetts state ERA reporting firms",
            "caveat": "An exempt reporting adviser is not a Massachusetts state-registered IA and not an SEC RIA.",
        },
        "federalNotice": {
            "FEDERAL_COVERED_NOTICE_ROSTER": "ACQUIRED_IAPD_SEC_COMPILATION",
            "noticeRows": L["notice_rows"],
            "noticeFiledDistinctCrd": L["notice_filed_distinct_crd"],
            "noticeStatus": "FILED",
            "noticeFiledFirmType": {k: v for k, v in L["notice_filed_firm_type"].items() if k != "raw"},
            "filter": "NoticeFiled/States/@RgltrCd=MA",
            "source": sec["filename"].replace(".xml.gz", ""),
            "sourceAsOf": sec["sourceAsOf"],
            "retrievedAt": sec["retrievedAt"],
            "overlapApprovedStateIa": len(bridge),
            "overlapApprovedStateIaCrds": bridge,
            "overlapApprovedStateIaJoinMethod": "exact firm CRD set intersection of APPROVED StateRgstn/Rgltr/@Cd=MA and NoticeFiled/States/@RgltrCd=MA St=FILED",
            "overlapEraNotice": O["state_era_and_notice_filed"],
            "label": "SEC-registered advisers with a Massachusetts notice filing",
            "caveat": "A notice filing is not Massachusetts state IA registration.",
        },
        "reconciliation": {
            "MA_STATE_IA_NOTICE_OVERLAP": len(bridge),
            "MA_STATE_IA_ERA_OVERLAP": O["state_ia_and_state_era"],
            "MA_ERA_NOTICE_OVERLAP": O["state_era_and_notice_filed"],
            "MA_PRINCIPAL_OFFICE_STATE_IA_OVERLAP": O["state_ia_and_principal_office_sec_feed"],
            "MA_PRINCIPAL_OFFICE_NOTICE_OVERLAP": O["notice_filed_and_principal_office"],
            "MA_PRINCIPAL_OFFICE_OVERLAY": V1_PRINCIPAL,
            "joinMethod": "exact firm CRD",
            "clockNote": "IAPD compilations 2026-09-17; the V1 principal-office overlay is the 2026-08-27 roster geography. The difference is a clock difference, not enforcement.",
            "do_not_sum": True,
        },
        "enforcement": enforcement,
        "records": {
            "MA_REGISTRATION_RECORDS_CAPABILITY": "KNOWN",
            "classes": ["broker-dealer", "agent", "investment adviser", "investment adviser representative"],
            "channel": "Securities Division (RICE section) answers registration-status and disciplinary-history questions on request",
            "sourceUrl": "https://www.sec.state.ma.us/divisions/securities/rice/rice-mission-statement.htm",
            "bulkRoster": "NOT_ACQUIRED",
        },
        "complaints": {
            "MA_SECURITIES_COMPLAINT_ROWS": None,
            "intake": "KNOWN",
            "providerLevelComplaints": "NOT_ACQUIRED",
            "complaintOutcomes": "NOT_ACQUIRED / REQUEST_ONLY",
            "sourceUrl": "https://www.sec.state.ma.us/divisions/securities/enforcement/enforcement-overview.htm",
            "complaint_ne_enforcement": True,
            "division_complaint_document_ne_investor_complaint": True,
        },
        "iar": {
            "MA_IAR_REGISTRATION_CAPABILITY": "KNOWN",
            "MA_IAR_ROWS": None,
            "MA_IAR_PERSON_DIRECTORY": "NOT_PUBLISHED",
            "grain": "person CRD (not firm CRD)",
            "verifyUrl": "https://adviserinfo.sec.gov/",
            "caveat": "An IAR is a person. IAR registrations are never added to firm counts, and no person profiles are created.",
        },
        "brokerDealer": {
            "MA_BD_VERIFICATION": "KNOWN",
            "MA_AGENT_VERIFICATION": "KNOWN",
            "MA_DEALER_ROWS": None,
            "MA_AGENT_ROWS": None,
            "stateOnlyBulk": "NOT_ACQUIRED",
            "bd_ne_ia": True,
            "agent_ne_iar": True,
            "verifyUrl": "https://brokercheck.finra.org/",
        },
        "offerings": {"status": "DEFERRED", "note": "Securities offering registrations are not provider identity and were not ingested."},
        "divisionFramework": {
            "regulator": "Massachusetts Secretary of the Commonwealth, Securities Division",
            "officialHomeUrl": "https://www.sec.state.ma.us/divisions/securities/securities.htm",
            "enforcementArchiveUrl": ARCHIVE_URL,
            "statute": "Massachusetts Uniform Securities Act (M.G.L. c. 110A)",
            "infrastructure": "IARD for investment advisers and representatives; CRD/BrokerCheck for broker-dealers and agents. Infrastructure is not the regulator.",
            "contactUrl": "https://www.sec.state.ma.us/divisions/about-us/contact-us.htm#securities",
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
            "enforcement_archive_2012_2026": "KNOWN",
            "enforcement_unique_matters": "PARTIAL",
            "enforcement_pre_2012": "REQUEST_ONLY",
            "enforcement_exact_crd_attachments": "NOT_ACQUIRED",
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
    index = {"version": "investor-ma-enforcement-index-v1", "source": ARCHIVE_URL, "retrievedAt": acq["retrieved_at"], "announcements": items}
    existing = read_json(ART) if ART.exists() else None
    generated = existing["generatedAt"] if check and existing else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    snap["generatedAt"] = generated
    snap["clocks"]["generatedAt"] = generated
    snap["fingerprint"] = fingerprint(snap)
    art_text = json.dumps(snap, indent=2, ensure_ascii=False) + "\n"
    ts_text = ("/** Generated by scripts/massachusetts/freeze_ma_inv_snapshot.py. Do not edit by hand. */\nexport const MA_PUBLIC_SNAPSHOT = "
               + json.dumps(snap, indent=2, ensure_ascii=False) + " as const;\nexport type MaPublicSnapshot = typeof MA_PUBLIC_SNAPSHOT;\n")
    index_text = json.dumps(index, indent=1, ensure_ascii=False) + "\n"
    if check:
        for path, text in ((ART, art_text), (TS, ts_text), (INDEX, index_text)):
            need(path.exists() and path.read_text(encoding="utf-8").replace("\r\n", "\n") == text, f"{path.relative_to(ROOT)} drifted; rerun the freeze")
        print("check", snap["fingerprint"])
        return
    for path, text in ((ART, art_text), (TS, ts_text), (INDEX, index_text)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
    print(json.dumps({"fingerprint": snap["fingerprint"], "state_ia_approved": approved, "era": L["state_era_active_distinct_crd"], "notice": L["notice_filed_distinct_crd"],
                      "principal_v1": V1_PRINCIPAL, "announcements": len(items), "documents": len(documents), "types": dict(types), "dockets": len(all_dockets)}, indent=1))


if __name__ == "__main__":
    main()
