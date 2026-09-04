#!/usr/bin/env python3
"""AZ-INV-001 bounded ACC enforcement index probe. No PDF download. No eDocket crawl."""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "arizona" / "az-inv-001"
OUT.mkdir(parents=True, exist_ok=True)
UA = "InvestorTrustHub-AZ-INV-001/1.0 (+https://www.investortrusthub.com; official-page research)"
URL = "https://www.azcc.gov/securities/enforcements/actions"


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=45, context=ssl.create_default_context()) as resp:
        body = resp.read()
        status = resp.status
        ctype = resp.headers.get("Content-Type")
    html = body.decode("utf-8", "replace")
    tables = re.findall(r"<table[\s\S]*?</table>", html, re.I)
    data_rows = 0
    with_crd = 0
    without_crd = 0
    pdf_rows = 0
    for table in tables:
        rows = re.findall(r"<tr[\s\S]*?</tr>", table, re.I)
        for row in rows[1:]:
            text = unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", row))).strip()
            if not text:
                continue
            data_rows += 1
            if re.search(r"CRD\s*#?\s*\d+", text, re.I):
                with_crd += 1
            else:
                without_crd += 1
            if ".pdf" in row.lower():
                pdf_rows += 1
    probe = {
        "ticket": "AZ-INV-001",
        "url": URL,
        "http_status": status,
        "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(),
        "content_type": ctype,
        "tables": len(tables),
        "data_rows": data_rows,
        "rows_with_crd_in_respondent_text": with_crd,
        "rows_name_only": without_crd,
        "pdf_linked_rows": pdf_rows,
        "pdfs_downloaded": 0,
        "edockets_crawled": 0,
    }
    (OUT / "acc-enforcement-bounded-probe.json").write_text(json.dumps(probe, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(probe, indent=2))


if __name__ == "__main__":
    main()
