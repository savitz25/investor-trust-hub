"""OH-INV-001 — bounded probe of STAR, records request, Division Orders, bulletins."""
from __future__ import annotations

import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "ohio" / "oh-inv-001" / "star-probe.json"
RAW = ROOT / "data" / "ohio" / "oh-inv-001" / "raw"
UA = "InvestorTrustHub-OH-INV-001/1.0 (research; +https://www.investortrusthub.com)"

URLS = [
    "https://com.ohio.gov/divisions-and-programs/securities",
    "https://com.ohio.gov/divisions-and-programs/securities/division-orders/division-orders",
    "https://com.ohio.gov/wps/portal/gov/com/divisions-and-programs/securities/division-orders",
    "https://com.ohio.gov/divisions-and-programs/securities/file-a-complaint-securities",
    "https://com.ohio.gov/divisions-and-programs/securities/consumers-and-investors/licensing-facts-for-investors",
    "https://com.ohio.gov/divisions-and-programs/securities/bulletins/aq-securities-bulletin-second-quarter-2024",
    "https://securities.com.ohio.gov/odoc/page/OH.ERNIE/portal.aspx",
    "https://recordrequest.com.ohio.gov/",
    "https://codes.ohio.gov/ohio-revised-code/chapter-1707",
]


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read(400_000)
            text = body.decode("utf-8", "replace")
            RAW.mkdir(parents=True, exist_ok=True)
            slug = re.sub(r"[^a-z0-9]+", "-", url.lower())[:80]
            (RAW / f"{slug}.html").write_bytes(body[:200_000])
            return {
                "url": url,
                "status": resp.status,
                "finalUrl": resp.geturl(),
                "bytes": len(body),
                "title": (re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S) or [None, ""])[1][:200],
                "has_noh": bool(re.search(r"notice of opportunity for hearing|\bNOH\b", text, re.I)),
                "has_final_order": bool(re.search(r"final order", text, re.I)),
                "has_incomplete": bool(re.search(r"may not retrieve all|not retrieve all responsive|incomplete", text, re.I)),
                "has_filing_search": bool(re.search(r"filing search|ERNIE|exemption, registration", text, re.I)),
                "has_complaint": bool(re.search(r"complaint", text, re.I)),
                "has_crd": bool(re.search(r"\bCRD\b|\bIARD\b", text, re.I)),
                "has_monthly": bool(re.search(r"monthly enforcement", text, re.I)),
                "snippet": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", text))[:800],
            }
    except Exception as exc:
        return {"url": url, "error": str(exc)}


def main() -> None:
    rows = [fetch(url) for url in URLS]
    payload = {
        "retrievedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"wrote": str(OUT), "ok": sum(1 for r in rows if "error" not in r), "n": len(rows)}, indent=2))


if __name__ == "__main__":
    main()
