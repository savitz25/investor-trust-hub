"""WA-INV-001 bounded DFI access test. First pages only. No search crawl, no PDF harvest."""
from __future__ import annotations

import json
import re
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CTX = ssl.create_default_context()
UA = {"User-Agent": "InvestorTrustHub/0.1 (research; no crawl)"}
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "washington" / "wa-inv-001"
URLS = {
    "verify_license": "https://dfi.wa.gov/consumers/verify-license",
    "verify_securities": "https://dfi.wa.gov/section-main-pages/verify-securities-licenses-and-registration",
    "enforcement": "https://dfi.wa.gov/securities-enforcement-actions",
    "ia_home": "https://dfi.wa.gov/investment-advisers",
    "ia_registration": "https://dfi.wa.gov/investment-advisers/registration",
    "ia_iar": "https://dfi.wa.gov/investment-advisers/investment-adviser-representative",
    "federal_notice": "https://dfi.wa.gov/investment-advisers/federally-covered-advisers",
}


def get(url: str, timeout: int = 45) -> tuple[bytes, dict, str]:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
        return resp.read(), dict(resp.headers), resp.geturl()


def classify(html: str) -> dict:
    csv_like = re.findall(r'href=["\']([^"\']+\.(?:csv|xlsx|xls|json|zip))["\']', html, re.I)
    api_like = [
        h
        for h in re.findall(r'href=["\']([^"\']+)["\']', html, re.I)
        if any(x in h.lower() for x in ("/api/", "export", "download", "csv", "json"))
    ]
    return {
        "csv_or_xlsx_links": csv_like[:20],
        "api_like_links": api_like[:20],
        "has_csv_export": bool(csv_like),
        "has_html_table": bool(re.search(r"<table", html, re.I)),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report: dict = {
        "ticket": "WA-INV-001",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "no_search_crawl": True,
        "no_iapd_scrape": True,
        "no_brokercheck_scrape": True,
        "no_pdf_harvest": True,
        "pages": {},
    }
    for key, url in URLS.items():
        try:
            body, hdr, final = get(url)
            text = body.decode("utf-8", "replace")
            info = classify(text)
            info.update(
                {
                    "requested_url": url,
                    "final_url": final,
                    "bytes": len(body),
                    "content_type": hdr.get("Content-Type"),
                    "title": (
                        re.search(r"<title>([^<]+)</title>", text, re.I).group(1).strip()
                        if re.search(r"<title>([^<]+)</title>", text, re.I)
                        else None
                    ),
                }
            )
            if key == "enforcement":
                types = sorted(set(re.findall(
                    r"(Final Order|Consent Order|Statement of Charges|Summary Order|Cease and Desist)",
                    text,
                    re.I,
                )))
                rows = len(re.findall(r"<tr\b", text, re.I))
                info["native_type_mentions"] = types
                info["tr_tags_on_first_page"] = rows
                info["has_year_archive_link"] = "2024 and earlier" in text or "securities2024" in text.lower()
            report["pages"][key] = info
        except Exception as e:
            report["pages"][key] = {"requested_url": url, "error": str(e)[:240]}

    try:
        cat_body, _, _ = get("https://data.wa.gov/api/views.json")
        items = json.loads(cat_body.decode("utf-8"))
        hits = []
        for it in items:
            blob = f"{it.get('name','')} {it.get('description','')} {it.get('category','')}".lower()
            if any(n in blob for n in ("investment adviser", "broker-dealer", "securities division", "iard", "dfi securities")):
                hits.append({"id": it.get("id"), "name": it.get("name"), "category": it.get("category")})
        report["data_wa_hits"] = hits[:20]
    except Exception as e:
        report["data_wa_hits_error"] = str(e)[:240]

    any_csv = any((p.get("has_csv_export") for p in report["pages"].values() if isinstance(p, dict)))
    report["WASHINGTON_STATE_RIA_BULK_ROSTER"] = "SOURCE_NOT_ACQUIRED / OPEN_SEARCH_ONLY"
    report["enforcement_bulk"] = "NO_BULK_ACQUIRED"
    report["complete_state_ria_count"] = "UNKNOWN"
    report["csv_found_on_bounded_pages"] = bool(any_csv)
    (OUT / "dfi-bounded-probe.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in report if k != "pages"}, indent=2))
    for k, v in report["pages"].items():
        print(k, v.get("final_url") or v.get("error"), "csv", v.get("has_csv_export"), "table", v.get("has_html_table"))


if __name__ == "__main__":
    main()
