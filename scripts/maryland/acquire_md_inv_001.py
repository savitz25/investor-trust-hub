"""Reproduce the bounded Maryland Securities Division action index.

The public page uses a SharePoint list and year folders; no identifier search
or enumeration is involved. A missing PDF remains an index row, not a finding.
"""
from __future__ import annotations

import io
import json
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/maryland/md-inv-001/securities-actions.json"
BASE = "https://oag.maryland.gov/i-need-to"
INDEX = BASE + "/Pages/securities-administrative-actions.aspx"
API = BASE + "/_api/web/lists/getbytitle('Securities')/items?$top=5000&$select=Title,Date,TypeOfOrder,Attachement"
HEADERS = {"Accept": "application/json;odata=verbose", "User-Agent": "Mozilla/5.0"}


def fetch_json(url: str) -> dict:
    response = requests.get(url, headers=HEADERS, timeout=45)
    response.raise_for_status()
    return response.json()


def files_for_year(year: int) -> dict[str, str]:
    url = BASE + f"/_api/web/GetFolderByServerRelativeUrl('/i-need-to/Documents/pdfs/Securities/{year}')/Files?$select=Name,ServerRelativeUrl"
    return {x["Name"].lower().replace(" ", "").replace(",", ""): "https://oag.maryland.gov" + x["ServerRelativeUrl"]
            for x in fetch_json(url)["d"]["results"]}


def inspect(row: dict) -> dict:
    if not row["sourceDocument"]:
        return row
    try:
        response = requests.get(row["sourceDocument"], timeout=35, headers=HEADERS)
        response.raise_for_status()
        if not response.content.startswith(b"%PDF"):
            return row
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            first = "\n".join(page.extract_text() or "" for page in pdf.pages[:2])[:12000]
        crds = sorted(set(re.findall(r"\bCRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{4,10})\b", first, re.I)), key=int)
        secs = sorted(set(re.findall(r"\b801-\d{1,8}\b", first, re.I)))
        return {**row, "pdfChecked": True, "printedCrdCandidates": crds, "printedSecFileCandidates": secs}
    except (requests.RequestException, ValueError, OSError):
        return row


def main() -> None:
    items = fetch_json(API)["d"]["results"]
    folders = {year: files_for_year(year) for year in range(2022, 2027)}
    rows = []
    for item in items:
        try:
            date = datetime.strptime(item["Date"].strip(), "%m/%d/%Y").date()
        except (ValueError, TypeError, AttributeError):
            continue
        if not 2022 <= date.year <= 2026:
            continue
        attachment = (item.get("Attachement") or "").strip()
        key = (attachment if attachment.lower().endswith(".pdf") else attachment + ".pdf").lower().replace(" ", "").replace(",", "")
        label = (item.get("TypeOfOrder") or "").strip()
        rows.append({"respondentAsIndexed": (item.get("Title") or "").strip(), "respondentGrain": "unresolved index caption",
                     "actionDateAsIndexed": date.isoformat(), "orderTypeAsIndexed": label, "orderStatus": "final" if "final" in label.lower() else "consent" if "consent" in label.lower() else "show_cause_or_summary" if any(x in label.lower() for x in ("show cause", "summary")) else "other_or_unresolved",
                     "attachmentAsIndexed": attachment, "caseOrOrderNumberAsIndexed": (re.match(r"^(20\d{6})(?:[_ .-]|$)", attachment) or [None, None])[1], "sourceDocument": folders[date.year].get(key), "sourceIndex": INDEX,
                     "pdfChecked": False, "printedCrdCandidates": [], "printedSecFileCandidates": [], "exactFirmCrdCrosswalk": None,
                     "exactSecFileCrosswalk": None, "profileEvidenceAttached": False})
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(inspect, rows))
    rows.sort(key=lambda x: (x["actionDateAsIndexed"], x["respondentAsIndexed"]), reverse=True)
    result = {"contract": "md-inv-001-actions-v1", "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "indexUrl": INDEX, "apiUrl": API,
              "scope": "Rows with parseable list Date in 2022-2026; date is list date, not independently validated order-signing date.",
              "rows": rows, "statusCounts": dict(Counter(r["orderStatus"] for r in rows)),
              "exactFirmCrdCrosswalks": 0, "exactSecFileCrosswalks": 0, "exactEnforcementAttachments": 0,
              "nameOnlyAttachments": 0, "newCanonicalFirms": 0, "graphWrites": 0, "claimChanges": 0}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Rows", len(rows), "linked", sum(bool(x["sourceDocument"]) for x in rows), "PDF checked", sum(x["pdfChecked"] for x in rows), "printed CRD candidates", sum(bool(x["printedCrdCandidates"]) for x in rows), "types", result["statusCounts"])


if __name__ == "__main__":
    main()
