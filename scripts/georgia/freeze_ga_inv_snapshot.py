#!/usr/bin/env python3
"""Freeze GA-INV-001 from the public Securities Orders index. No PDF parsing."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "data" / "georgia" / "ga-inv-001" / "orders-index.json"
ART = ROOT / "artifacts" / "ga-inv-001-public-snapshot.json"
TS = ROOT / "packages" / "domain" / "src" / "ga-public-snapshot.ts"

MONTHS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}
DATE_RE = re.compile(
    r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})"
)
CRD_RE = re.compile(r"CRD\s*(?:No\.?,?\s*)?(\d+)", re.I)


def iso_date(month: str, day: str, year: str) -> str:
    return f"{int(year):04d}-{MONTHS[month]:02d}-{int(day):02d}"


def caption_status(title: str) -> str:
    low = title.lower()
    if "formal order of investigation" in low or "investigative agent" in low:
        return "INVESTIGATION"
    if "proposed order" in low:
        return "PROPOSED"
    if "emergency order" in low:
        return "EMERGENCY"
    if "consent order" in low:
        return "CONSENT"
    if "final order" in low:
        return "FINAL_INDEX_CAPTION"
    return "INDEX_LISTED"


def classify(row: dict) -> dict:
    title = row["title"]
    dates = [iso_date(*match.groups()) for match in DATE_RE.finditer(title)]
    modification = "modification to" in title.lower()
    order_date = None if modification else (dates[-1] if dates else None)
    crds = CRD_RE.findall(title)
    status = caption_status(title)
    return {
        "case_caption": row["id"] or None,
        "respondent_caption": title,
        "grain": "standalone_enforcement_event",
        "respondent_type": "UNRESOLVED",
        "status_from_index_caption": status,
        "allegation_is_finding": False,
        "order_date": order_date,
        "referenced_prior_order_date": dates[0] if modification and dates else None,
        "crd_printed": crds,
        "sec_number_printed": [],
        "exact_profile_attachment": False,
        "source_url": row["href"],
        "source_page": "https://sos.ga.gov/node/543",
    }


def dumps(obj: object) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def main() -> None:
    rows = json.loads(INDEX.read_text(encoding="utf-8"))
    events = [classify(row) for row in rows]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {
        "version": "investor-ga-state-intel-v1",
        "ticket": "GA-INV-001",
        "asOf": "2026-09-24",
        "generatedAt": generated,
        "publicationGate": "ON",
        "publicEligibility": "state_page",
        "route": "/georgia",
        "no_trust_score": True,
        "no_ranking": True,
        "no_atlanta_page": True,
        "claimEligibilityBroadened": False,
        "regulator": {
            "agency": "Georgia Secretary of State Securities Division",
            "statute": "Georgia Uniform Securities Act of 2008",
            "division_url": "https://sos.ga.gov/securities-division-georgia-secretary-states-office",
            "about_url": "https://sos.ga.gov/page/about-securities-division",
            "orders_url": "https://sos.ga.gov/node/543",
            "iapd_url": "https://adviserinfo.sec.gov/",
            "brokercheck_url": "https://brokercheck.finra.org/",
            "complaint_url": "https://sos.ga.gov/form/complaint-office-secretary-state-securities-division",
            "offering_forms_url": "https://sos.ga.gov/page/registering-and-notice-filing-securities-offering",
            "alerts_url": "https://sos.ga.gov/page/investor-alerts-and-outreach",
        },
        "clocks": {
            "orders_index_retrieved_at": "2026-09-24T04:10:00Z",
            "principal_office_source_as_of": "2026-08-27",
            "principal_office_retrieved_at": "2026-08-28",
            "snapshot_as_of": "2026-09-24",
            "generated_at": generated,
            "retrieval_is_not_order_date": True,
        },
        "nationalOverlay": {
            "gaPrincipalOfficeSecIardFirms": 364,
            "grain": "SEC IARD roster firm with principal-office region = GA",
            "source": "IA_FIRM_SEC_Feed_08_27_2026",
            "sourceAsOf": "2026-08-27",
            "retrievedAt": "2026-08-28",
            "universe": 23622,
            "searchHref": "/firms?state=GA",
            "label": "SEC/IARD roster firms with a Georgia principal office",
            "caveat": "A Georgia principal office is not Georgia state IA registration and is not a notice filing. These firms already exist in the federal graph.",
        },
        "populations": {
            "state_registered_ia_firms": "NOT_ACQUIRED",
            "federal_covered_notice_filings": "NOT_ACQUIRED",
            "iar_persons": "NOT_ACQUIRED",
            "broker_dealer_firms": "NOT_ACQUIRED",
            "broker_dealer_agents": "NOT_ACQUIRED",
            "offerings": "NOT_ACQUIRED",
            "verification": "KNOWN",
        },
        "enforcement": {
            "index_rows": len(events),
            "exact_profile_attachments": 0,
            "name_only_joins": "UNSUPPORTED",
            "case_caption_is_not_unique": True,
            "order_dates_extracted_from_pdfs": False,
            "events": events,
        },
        "non_enforcement": {
            "implementation_orders": {
                "grain": "NON_ENFORCEMENT",
                "note": "Implementation Orders before 2011-04, dated December 8, 2011, are vacated on the official page.",
                "current_titles": [
                    "2012-01 Renewals of 1973 Act Small Issue Registrations",
                    "2011-04 Uniform Act Implementation Order",
                ],
            },
            "waiver": {
                "grain": "NON_ENFORCEMENT",
                "titles": ["Finger Lakes Region Rural Broadband Company, Inc., et al. Waiver Request – July 6, 2016"],
            },
            "relief_orders": {
                "grain": "NON_ENFORCEMENT",
                "titles": [
                    "Order Implementing Investment Advisor Annual Update Amendment To Form ADV Deadline in Response to Covid-19",
                    "Order Implementing Filing Requirements in Response to Covid-19",
                    "Order In Response to Covid - 8.28.2020",
                    "Order In Response to Covid - 10.30.2020",
                    "Order Implementing Fingerprint Requirements - 11.2.2020",
                ],
            },
        },
        "complaints": {
            "intake": "KNOWN",
            "public_dataset": "NOT_ACQUIRED",
            "count": None,
        },
        "capabilities": {
            "iard_infrastructure": "KNOWN",
            "iapd_verification": "KNOWN",
            "brokercheck": "KNOWN",
            "state_ia_roster": "NOT_ACQUIRED",
            "notice_filing_roster": "NOT_ACQUIRED",
            "iar_roster": "NOT_ACQUIRED",
            "broker_dealer_roster": "NOT_ACQUIRED",
            "agent_roster": "NOT_ACQUIRED",
            "enforcement_index": "PARTIAL",
            "implementation_orders": "KNOWN",
            "complaint_intake": "KNOWN",
            "complaint_dataset": "NOT_ACQUIRED",
            "offering_census": "NOT_ACQUIRED",
            "investor_alert_archive": "NOT_ACQUIRED",
            "name_only_adverse_join": "UNSUPPORTED",
        },
        "expansionLedger": {
            "GRAPH_WRITES": 0,
            "NET_NEW_CANONICAL_ORGANIZATIONS": 0,
            "NET_NEW_PUBLIC_PROFILES": 0,
            "EXISTING_ORGANIZATIONS_ENRICHED": 0,
        },
    }
    body["fingerprint"] = hashlib.sha256(
        dumps({k: v for k, v in body.items() if k not in {"generatedAt", "fingerprint"}}).encode()
    ).hexdigest()
    text = json.dumps(body, indent=2) + "\n"
    ART.write_text(text, encoding="utf-8")
    payload = text.rstrip()
    TS.write_text(
        "/** Generated by scripts/georgia/freeze_ga_inv_snapshot.py. Do not edit by hand. */\n"
        "export const GA_PUBLIC_SNAPSHOT = "
        + payload
        + " as const;\n\nexport type GaPublicSnapshot = typeof GA_PUBLIC_SNAPSHOT;\n",
        encoding="utf-8",
    )
    print(body["fingerprint"], len(events))


if __name__ == "__main__":
    main()
