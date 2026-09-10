"""Parse SCC SRF 2025 annual-report aggregates and the public regulatory-activity table."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "data" / "raw" / "virginia" / "regulatory-activity.html"
TXT = ROOT / "data" / "raw" / "virginia" / "2025srf.txt"
OUT = ROOT / "data" / "virginia" / "va-inv-001"
RETRIEVED_AT = "2026-09-10T17:50:00Z"

CASE_RE = re.compile(
    r"SEC-?\s*(\d{4})\s*-?\s*(\d{5})\s*(.*)$",
    re.I,
)


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def parse_case_label(label: str) -> tuple[str, str]:
    raw = clean(label)
    m = re.search(r"SEC[\s-]*(\d{4})[\s-]*(\d{5})", raw, re.I)
    if not m:
        return "", raw
    case = f"SEC-{m.group(1)}-{m.group(2)}"
    rest = clean(raw[m.end() :])
    return case, rest


def parse_date(raw: str) -> str | None:
    s = clean(raw).replace("l", "1")  # OCR-ish 04/l7/2024
    s = s.replace("01/22/26", "01/22/2026")
    for fmt in ("%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    return None


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_td = False
        self.in_a = False
        self.cell = ""
        self.href = ""
        self.row: list[tuple[str, str]] = []
        self.rows: list[list[tuple[str, str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = dict(attrs)
        if tag == "tr":
            self.row = []
        elif tag == "td":
            self.in_td = True
            self.cell = ""
            self.href = ""
        elif tag == "a" and self.in_td:
            self.in_a = True
            href = ad.get("href") or ""
            if href:
                self.href = href

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.in_a:
            self.in_a = False
        elif tag == "td" and self.in_td:
            self.row.append((clean(self.cell), self.href))
            self.in_td = False
        elif tag == "tr" and len(self.row) >= 3:
            self.rows.append(self.row)

    def handle_data(self, data: str) -> None:
        if self.in_td:
            self.cell += data


def normalize_href(href: str) -> str:
    h = (href or "").strip()
    if h.startswith("http"):
        return h.split("http", 1)[-1] and h  # keep first url if concatenated
    if h.startswith("/"):
        return "https://www.scc.virginia.gov" + h
    return h


def parse_table(html: str) -> list[dict]:
    p = TableParser()
    p.feed(html)
    rows = []
    seen = set()
    for cells in p.rows:
        label, href = cells[0]
        respondent = cells[1][0]
        date_raw = cells[2][0]
        if not label.lower().startswith("sec-") and "SEC" not in label.upper():
            continue
        case, order_type = parse_case_label(label)
        if not case:
            continue
        # concatenated duplicate hrefs
        hrefs = re.findall(r"https://[^\s]+|/docketsearch[^\s\"]+", href or cells[0][1])
        url = ""
        if hrefs:
            first = hrefs[0]
            url = first if first.startswith("http") else "https://www.scc.virginia.gov" + first
        elif cells[0][1]:
            url = normalize_href(cells[0][1].split("http")[0] if cells[0][1].count("http") > 1 else cells[0][1])
            if url.startswith("/"):
                url = "https://www.scc.virginia.gov" + url
        iso = parse_date(date_raw)
        key = (case, order_type.lower(), iso, clean(respondent).lower())
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "case_number": case,
                "order_type": order_type or "Unspecified",
                "respondent_label": clean(respondent),
                "order_date": iso,
                "order_date_raw": date_raw,
                "source_url": url,
                "crd": None,
                "sec_file": None,
                "identity": "NAME_ONLY",
            }
        )
    return rows


def parse_srf_aggregates(text: str) -> dict:
    items = []
    section = "UNKNOWN"
    for line in text.splitlines():
        ln = clean(line)
        if ln.startswith("UNDER THE VIRGINIA SECURITIES ACT"):
            section = "VIRGINIA_SECURITIES_ACT"
            continue
        if "TRADEMARK" in ln and ln.startswith("UNDER"):
            section = "TRADEMARK_AND_SERVICE_MARK_ACT"
            continue
        if ln.startswith("UNDER THE VIRGINIA RETAIL FRANCHISING"):
            section = "VIRGINIA_RETAIL_FRANCHISING_ACT"
            continue
        if ln.startswith("ORDERS, JUDGMENTS"):
            section = "ORDERS_JUDGMENTS_AND_SETTLEMENTS"
            continue
        if ln.startswith("TELEPHONE CALLS"):
            section = "TELEPHONE_CALLS_EMAILS_AND_COMPLAINTS"
            continue
        m = re.match(r"^([\d,]+)\s+(.+)$", ln)
        if not m:
            continue
        n = int(m.group(1).replace(",", ""))
        label = m.group(2).strip()
        items.append({"section": section, "count": n, "label": label})
    def find(substr: str) -> int | None:
        hits = [i for i in items if i["label"] == substr]
        return hits[0]["count"] if hits else None
    return {
        "year": 2025,
        "source": "SCC Division of Securities and Retail Franchising Annual Report for 2025",
        "source_url": "https://www.scc.virginia.gov/media/sccvirginiagov-home/about-the-scc/annual-reports/2025srf.pdf",
        "grain": "2025_activity_process_count",
        "not_current_registrant_universe": True,
        "items": items,
        "headline": {
            "broker_dealer_registrations_and_renewals_approved": find("broker-dealer registrations and renewals approved"),
            "broker_dealer_agent_registrations_and_renewals_approved": find("broker-dealer agent registrations and renewals approved"),
            "investment_advisor_registrations_renewals_and_amendments_approved": find("investment advisor registrations, renewals, and amendments approved"),
            "investment_advisor_representative_registrations_and_renewals_approved": find("investment advisor representative registrations and renewals approved"),
            "investment_advisor_audits_completed": find("investment advisor audits completed"),
            "investigations_completed": find("investigations completed"),
            "complaints_resulting_in_investigations": find("complaints resulting in investigations"),
            "investment_advisor_eras_approved": find("investment advisor eras approved"),
            "audit_violation_deficiencies_resolved": find("audit violation deficiencies resolved"),
        },
    }


def main() -> None:
    html = HTML.read_text(encoding="utf-8", errors="replace")
    rows = parse_table(html)
    types = Counter(r["order_type"] for r in rows)
    cases = {r["case_number"] for r in rows}
    dates = sorted(r["order_date"] for r in rows if r["order_date"])
    aggregates = parse_srf_aggregates(TXT.read_text(encoding="utf-8"))
    activity = {
        "source": "Virginia SCC Division of Securities and Retail Franchising Regulatory Activity table",
        "source_url": "https://www.scc.virginia.gov/consumers/consumer-investments/regulatory-activity/",
        "retrieved_at": RETRIEVED_AT,
        "grain": "scc_srf_regulatory_activity_row",
        "not_investment_adviser_enforcement_census": True,
        "observation_rows": len(rows),
        "distinct_case_numbers": len(cases),
        "order_type_distribution": types.most_common(),
        "date_min": dates[0] if dates else None,
        "date_max": dates[-1] if dates else None,
        "rows_with_crd": 0,
        "name_only_rows": len(rows),
        "pdfs_opened": 0,
        "exact_crd_crosswalks": 0,
        "identity": "NAME_ONLY unless source prints CRD/SEC; table does not expose CRD/SEC IDs",
        "rows": rows,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "srf-2025-aggregates.json").write_text(json.dumps(aggregates, indent=2) + "\n", encoding="utf-8")
    (OUT / "regulatory-activity.json").write_text(json.dumps(activity, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "srf_items": len(aggregates["items"]),
        "headline": aggregates["headline"],
        "activity_rows": activity["observation_rows"],
        "distinct_cases": activity["distinct_case_numbers"],
        "types": activity["order_type_distribution"][:12],
        "date_min": activity["date_min"],
        "date_max": activity["date_max"],
    }, indent=2))


if __name__ == "__main__":
    main()
