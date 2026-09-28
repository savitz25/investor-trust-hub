"""Bounded Michigan IAPD lenses and public CSCL securities-order index.

Reuses the accepted 2026-09-17 STATE/SEC compilation parser. The two source
files are local accepted evidence; no identifier enumeration or MiCLEAR scrape.
"""
from __future__ import annotations

import hashlib
import html
import importlib.util
import io
import json
import os
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/michigan/mi-inv-001"
PARSER = ROOT / "scripts/ohio/census_iapd_oh.py"
ACCEPTED = Path(os.environ.get("MI_INV_ACCEPTED_IAPD_DIR", str(ROOT / "data/raw/sec/form-adv/iapd-compilation-2026-09-17")))
STATE = ACCEPTED / "IA_FIRM_STATE_Feed_09_17_2026.xml.gz"
SEC = ACCEPTED / "IA_FIRM_SEC_Feed_09_17_2026.xml.gz"
HASHES = {
    STATE.name: "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02",
    SEC.name: "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22",
}
SOURCE = "https://www.michigan.gov/lara/bureau-list/cscl/complaints/disciplinary/securities"
ENDPOINT = "https://www.michigan.gov/lara/sxa/search/results/"
PARAMS = {"v": "{A7E26C93-DB14-4DA8-BBE9-6651406E11AA}", "s": "{EE710561-176C-4A94-B066-9611688906B7}", "p": "1000", "itemid": "{4841C2E3-C26B-4E05-B0FD-AB6A491AEF6A}"}


def write(name: str, value: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())


def acquire_lenses() -> None:
    for path in (STATE, SEC):
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != HASHES[path.name]:
            raise RuntimeError(f"Accepted IAPD file missing or hash drifted: {path}")
    spec = importlib.util.spec_from_file_location("accepted_iapd_parser", PARSER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.CD = "MI"
    state, sec = module.parse_state(STATE), module.parse_sec(SEC)
    ia, approved, era = set(state["_ia_crds"]), set(state["_ia_approved"]), set(state["_era_active"])
    notice, principal = set(sec["_filed_set"]), set(sec["_principal"])
    overlap = lambda a, b: sorted(a & b, key=int)
    write("iapd-mi-lenses.json", {
        "contract": "mi-inv-001-iapd-lenses-v1", "retrievedAt": "2026-09-17T15:15:00Z", "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "stateFeed": {"url": f"https://reports.adviserinfo.sec.gov/reports/CompilationReports/{STATE.name}", "sourceAsOf": "2026-09-17", "sha256": HASHES[STATE.name]},
        "secFeed": {"url": f"https://reports.adviserinfo.sec.gov/reports/CompilationReports/{SEC.name}", "sourceAsOf": "2026-09-17", "sha256": HASHES[SEC.name]},
        "stateIa": {"filter": "StateRgstn/Rgltr/@Cd=MI", "rows": state["co_state_ia_registration_rows"], "distinctFirmCrd": len(ia), "approvedDistinctFirmCrd": len(approved), "statusRows": dict(state["status_ia"]), "principalOfficeMi": state["principal_office_co_among_state_ia"]},
        "era": {"filter": "ERA/Rgltr/@Cd=MI", "rows": state["co_state_era_registration_rows"], "distinctFirmCrd": len(set(state["_era_crds"])), "activeDistinctFirmCrd": len(era), "statusRows": dict(state["status_era"])},
        "federalNotice": {"filter": "NoticeFiled/States/@RgltrCd=MI and @St=FILED", "rowsAnyStatus": sec["co_notice_rows"], "filedDistinctFirmCrd": len(notice), "filedFirmTypes": sec["co_notice_filed_firm_type"], "statusRows": dict(sec["notice_status"])},
        "principalOffice": {"filter": "MainAddr/@State=MI (SEC compilation)", "distinctFirmCrd": len(principal)},
        "exactCrdIntersections": {"stateIaApprovedAndNoticeFiled": overlap(approved, notice), "stateIaAndEra": overlap(ia, era), "eraAndNoticeFiled": overlap(era, notice), "principalAndNoticeFiled": overlap(principal, notice)},
        "identifierLists": {"stateIaApprovedFirmCrds": sorted(approved, key=int), "eraActiveFirmCrds": sorted(era, key=int), "noticeFiledFirmCrds": sorted(notice, key=int), "principalOfficeFirmCrds": sorted(principal, key=int)},
        "dedupedMichiganAdvisers": None, "graphWrites": 0,
    })
    print("IAPD", len(approved), "approved IA", len(era), "active ERA", len(notice), "filed notices", len(principal), "principal-office")


def inspect_order(row: dict) -> dict:
    try:
        r = requests.get(row["sourceDocument"], headers={"User-Agent": "Mozilla/5.0", "Referer": SOURCE}, timeout=25)
        r.raise_for_status()
        if not r.content.startswith(b"%PDF"):
            return {**row, "pdfChecked": False}
        with pdfplumber.open(io.BytesIO(r.content)) as pdf:
            first = "\n".join((p.extract_text() or "") for p in pdf.pages[:2])[:10000]
        # Printed identifiers only. A person CRD cannot become a firm CRD.
        crds = sorted(set(re.findall(r"\bCRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{4,10})\b", first, re.I)), key=int)
        secs = sorted(set(re.findall(r"\b(?:SEC\s+File\s*(?:No\.?|Number|#)?\s*[:#]?\s*)?(801-\d{1,8})\b", first, re.I)))
        caption = re.search(r"In the matter of:(.{0,550}?)(?:Respondent|Registrant)\s*\.", first, re.S | re.I)
        caption_text = caption.group(1) if caption else ""
        caption_crds = re.findall(r"\bCRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{4,10})\b", caption_text, re.I)
        organization = bool(re.search(r"\b(?:LLC|L\.L\.C\.?|Inc\.?|Corporation|Corp\.?|Ltd\.?)\b", caption_text, re.I))
        caption_firm_crd = caption_crds[0] if organization and len(set(caption_crds)) == 1 else None
        heading = next((line.strip() for line in first.splitlines()[:35] if re.search(r"\b(?:ORDER|NOTICE OF INTENT|CONSENT AGREEMENT)\b", line, re.I) and len(line.strip()) > 12), None)
        date = re.search(r"\b(?:Dated|Issued|Entered)\s*(?:this|on|:)?\s*(\w+\s+\d{1,2},?\s+20\d{2})", first, re.I)
        issued = None
        if date:
            try:
                issued = datetime.strptime(date.group(1).replace(",", ""), "%B %d %Y").date().isoformat()
            except ValueError:
                pass
        return {**row, "pdfChecked": True, "printedCrdCandidates": crds, "printedSecFileCandidates": secs, "captionFirmCrd": caption_firm_crd, "respondentGrain": "firm" if caption_firm_crd else "unresolved", "actionLabel": heading or row["actionLabel"], "orderDate": issued, "identifierScope": "first two pages; firm CRD only when one CRD is printed in an organization respondent caption"}
    except Exception:
        return {**row, "pdfChecked": False}


def acquire_orders() -> None:
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0", "Referer": SOURCE})
    response = session.get(ENDPOINT, params=PARAMS, timeout=60)
    response.raise_for_status()
    data = response.json()
    rows = []
    for item in data["Results"]:
        fragment = item["Html"]
        if "Michigan Uniform Securities Act" not in fragment:
            continue
        link = re.search(r'<a class="content-title-link" href="([^"]+)"[^>]*>(.*?)</a>', fragment, re.S)
        if not link:
            continue
        path = html.unescape(link.group(1))
        year = re.search(r"/SecuritiesOrders/(20\d{2})/", path, re.I)
        if not year or not (2022 <= int(year.group(1)) <= 2026):
            continue
        title = clean(link.group(2))
        rows.append({"indexYear": int(year.group(1)), "respondentAsIndexed": title, "respondentGrain": "UNRESOLVED", "actionLabel": "Published enforcement order", "sourceDocument": urljoin("https://www.michigan.gov", path), "sourceIndex": SOURCE, "orderDate": None, "printedCrdCandidates": [], "printedSecFileCandidates": []})
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(inspect_order, rows))
    lenses = json.loads((OUT / "iapd-mi-lenses.json").read_text(encoding="utf-8"))
    firm_crds = set().union(*(set(values) for values in lenses["identifierLists"].values()))
    for row in rows:
        row["exactIapdFirmCrdLink"] = row.get("captionFirmCrd") if row.get("captionFirmCrd") in firm_crds else None
        row["profileEvidenceAttached"] = False
    write("securities-orders.json", {"contract": "mi-inv-001-securities-orders-v1", "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "indexUrl": SOURCE, "indexEndpoint": ENDPOINT, "mixedIndexRowsAtRetrieval": data["Count"], "filter": "MUSA-tagged official order-index documents under /SecuritiesOrders/2022..2026. Year is index path year, not presumed order date.", "rows": rows, "exactFirmCrdCrosswalks": sum(bool(r["exactIapdFirmCrdLink"]) for r in rows), "exactFirmEvidenceAttachments": 0, "nameOnlyAttachments": 0, "graphWrites": 0})
    print("Orders", len(rows), "MUSA-tagged index documents", Counter(r["indexYear"] for r in rows), "PDF checked", sum(r["pdfChecked"] for r in rows), "caption firm CRDs", sum(bool(r.get("captionFirmCrd")) for r in rows), "exact IAPD firm CRD crosswalks", sum(bool(r["exactIapdFirmCrdLink"]) for r in rows))


if __name__ == "__main__":
    acquire_lenses()
    acquire_orders()
