"""Freeze Connecticut DOB adviser lists and bounded securities-order index.

Only CRDs, SEC file identifiers, status counts and source clocks are published.
Personal addresses/contact fields in the regulator workbooks are discarded.
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

import openpyxl
import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/connecticut/ct-inv-001"
PARSER = ROOT / "scripts/ohio/census_iapd_oh.py"
ACCEPTED = Path(os.environ.get("CT_INV_ACCEPTED_IAPD_DIR", str(ROOT / "data/raw/sec/form-adv/iapd-compilation-2026-09-17")))
STATE = ACCEPTED / "IA_FIRM_STATE_Feed_09_17_2026.xml.gz"
SEC = ACCEPTED / "IA_FIRM_SEC_Feed_09_17_2026.xml.gz"
HASHES = {STATE.name: "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02", SEC.name: "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22"}
LIST_PAGE = "https://portal.ct.gov/dob/securities-licensing/licensing-general/see-if-an-investment-adviser-is-registered"
LISTS = {
    "stateIa": "https://portal.ct.gov/-/media/dob/securities_nonhtml/stateregisialistxls.xlsx?hash=6B8FB75C816F2A6AE289BCEABD4C1D29&rev=acd99b42b3ff47018b1c641fd27a5ca1",
    "federalNotice": "https://portal.ct.gov/-/media/dob/securities_nonhtml/secianoticefilerlistxls.xlsx?hash=24A8AC3FEF40F30CDC2749701FBFFF1B&rev=74397f6dfa8545b38b898b7808af1b74",
    "era": "https://portal.ct.gov/-/media/dob/securities_nonhtml/exemptreportingadviserlist.xlsx?hash=F1E620E223AA0602CEF0402CE2D3466F&rev=198d981e873c43b3bb6ae0d6fc6ac0bb",
}
ORDER_BASE = "https://portal.ct.gov/dob/enforcement/administrative-orders-index-pages/"


def write(name: str, data: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def regulator_lists() -> tuple[dict, dict[str, set[str]]]:
    result, sets = {}, {}
    for kind, url in LISTS.items():
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        rows = list(openpyxl.load_workbook(io.BytesIO(response.content), read_only=True, data_only=True).active.values)
        updated = next((str(row[2]).replace("Updated ", "") for row in rows[:5] if row[2] and "Updated " in str(row[2])), None)
        records = [row for row in rows if row[0] and str(row[0]).strip().isdigit()]
        crds = {str(row[0]).strip() for row in records}
        secs = {str(row[1]).strip().upper() for row in records if row[1] and re.fullmatch(r"80[12]-\d+", str(row[1]).strip())}
        statuses = Counter(str(row[13]).strip() for row in records)
        sets[kind] = crds
        result[kind] = {"url": url, "sha256": hashlib.sha256(response.content).hexdigest(), "sourceUpdated": updated, "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "rows": len(records), "distinctFirmCrds": len(crds), "rowsWithSecFile": sum(bool(row[1] and re.fullmatch(r"80[12]-\d+", str(row[1]).strip())) for row in records), "distinctSecFiles": len(secs), "statusRows": dict(statuses), "firmCrds": sorted(crds, key=int)}
    return result, sets


def iapd_lenses() -> tuple[dict, dict[str, set[str]]]:
    for path in (STATE, SEC):
        if not path.is_file() or digest(path) != HASHES[path.name]:
            raise RuntimeError(f"Accepted IAPD feed missing or changed: {path}")
    spec = importlib.util.spec_from_file_location("iapd_parser", PARSER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.CD = "CT"
    state, sec = module.parse_state(STATE), module.parse_sec(SEC)
    sets = {"stateIaApproved": set(state["_ia_approved"]), "stateIaAll": set(state["_ia_crds"]), "eraActive": set(state["_era_active"]), "noticeFiled": set(sec["_filed_set"]), "principalOffice": set(sec["_principal"])}
    result = {
        "sourceAsOf": "2026-09-17", "acceptedRetrievedAt": "2026-09-17T15:15:00Z", "stateFeed": {"url": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/" + STATE.name, "sha256": HASHES[STATE.name]}, "secFeed": {"url": "https://reports.adviserinfo.sec.gov/reports/CompilationReports/" + SEC.name, "sha256": HASHES[SEC.name]},
        "stateIa": {"filter": "StateRgstn/Rgltr/@Cd=CT", "rows": state["co_state_ia_registration_rows"], "distinctFirmCrds": len(sets["stateIaAll"]), "approvedFirmCrds": len(sets["stateIaApproved"]), "statusRows": dict(state["status_ia"])},
        "era": {"filter": "ERA/Rgltr/@Cd=CT", "rows": state["co_state_era_registration_rows"], "activeFirmCrds": len(sets["eraActive"]), "statusRows": dict(state["status_era"])},
        "federalNotice": {"filter": "NoticeFiled/States/@RgltrCd=CT and @St=FILED", "rowsAnyStatus": sec["co_notice_rows"], "filedFirmCrds": len(sets["noticeFiled"]), "statusRows": dict(sec["notice_status"])},
        "principalOffice": {"filter": "MainAddr/@State=CT in SEC compilation", "firmCrds": len(sets["principalOffice"])},
        "exactCrdIntersections": {"stateIaApprovedAndNoticeFiled": sorted(sets["stateIaApproved"] & sets["noticeFiled"], key=int), "stateIaAndEra": sorted(sets["stateIaAll"] & sets["eraActive"], key=int), "eraAndNoticeFiled": sorted(sets["eraActive"] & sets["noticeFiled"], key=int), "principalAndNoticeFiled": sorted(sets["principalOffice"] & sets["noticeFiled"], key=int)},
        "identifierLists": {key: sorted(value, key=int) for key, value in sets.items()},
    }
    return result, sets


def inspect_order(row: dict, known_crds: set[str]) -> dict:
    try:
        response = requests.get(row["sourceDocument"], timeout=30)
        response.raise_for_status()
        if not response.content.startswith(b"%PDF"):
            return {**row, "pdfChecked": False}
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            first = "\n".join((page.extract_text() or "") for page in pdf.pages[:2])[:12000]
        head = first[:1000]
        crds = sorted(set(re.findall(r"\bCRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{4,10})\b", first, re.I)), key=int)
        secs = sorted(set(re.findall(r"\b80[12]-\d{1,8}\b", first, re.I)))
        caption = head.split("WHEREAS", 1)[0]
        caption_crds = set(re.findall(r"\bCRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{4,10})\b", caption, re.I))
        organization = bool(re.search(r"\b(?:LLC|L\.L\.C\.?|Inc\.?|Corporation|Corp\.?|LP|L\.P\.?|Ltd\.?)\b", caption, re.I))
        firm_crd = next(iter(caption_crds)) if organization and len(caption_crds) == 1 else None
        matter = re.search(r"\b(?:MATTER|DOCKET|CASE)\s*(?:NO\.?|NUMBER|#)?\s*[:#]?\s*([A-Z]{1,5}[-\w]+(?:-[A-Z])?)", head, re.I)
        slug = row["sourceDocument"].split("/")[-1].split("?")[0].lower()
        finality = "stipulation/settlement" if "stipulation" in slug or "agreement" in slug else "consent" if "consent" in slug else "document requires finality review"
        return {**row, "pdfChecked": True, "printedCrdCandidates": crds, "printedSecFileCandidates": secs, "printedFirmCrd": firm_crd, "printedSecFile": secs[0] if len(secs) == 1 else None, "caseOrDocket": matter.group(1) if matter else None, "respondentGrain": "organization caption" if firm_crd else "unresolved", "finality": finality, "exactIapdFirmCrdCrosswalk": firm_crd if firm_crd in known_crds else None}
    except Exception:
        return {**row, "pdfChecked": False}


def orders(known_crds: set[str]) -> dict:
    rows = []
    index_urls = []
    for year in range(2022, 2027):
        url = ORDER_BASE + f"{year}-securities-division-admin-orders"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        index_urls.append(url)
        for para in re.findall(r"<p\b[^>]*>.*?</p>", response.text, re.I | re.S):
            stripped = html.unescape(re.sub(r"<[^>]+>", " ", para))
            caption = " ".join(stripped.split())
            for href, label in re.findall(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', para, re.I | re.S):
                link = urljoin(url, html.unescape(href))
                if not re.search(r"\.pdf(?:\?|$)", link, re.I):
                    continue
                date_text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", label)).split())
                month_day = re.fullmatch(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})", date_text)
                action_date = datetime.strptime(f"{month_day.group(1)} {month_day.group(2)} {year}", "%B %d %Y").date().isoformat() if month_day else None
                respondent = caption.split(" - ")[0].strip(" -")
                slug = link.split("/")[-1].split("?")[0].lower()
                action = "Consent Order" if "consent" in slug else "Cease and Desist" if "cease" in slug or "cd-order" in slug else "Administrative Order / Settlement (index label unresolved)"
                rows.append({"indexYear": year, "respondentAsIndexed": respondent, "respondentGrain": "unresolved", "actionDateFromIndex": action_date, "actionLabelFromFilename": action, "caseOrDocket": None, "printedFirmCrd": None, "printedSecFile": None, "sourceDocument": link, "sourceIndex": url, "finality": "index-listed order or settlement; inspect document", "exactIapdFirmCrdCrosswalk": None, "profileEvidenceAttached": False})
    with ThreadPoolExecutor(max_workers=12) as pool:
        checked = list(pool.map(lambda row: inspect_order(row, known_crds), rows))
    return {"indexUrls": index_urls, "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "filter": "2022-2026 securities administrative-order index PDF links; documents, not unique matters or findings", "rows": checked, "pdfsChecked": sum(row.get("pdfChecked", False) for row in checked), "exactFirmCrdCrosswalks": sum(bool(row.get("exactIapdFirmCrdCrosswalk")) for row in checked), "exactEnforcementAttachments": 0, "nameOnlyAttachments": 0, "graphWrites": 0}


def main() -> None:
    dob, dob_sets = regulator_lists()
    iapd, iapd_sets = iapd_lenses()
    dob["exactCrdIntersectionsWithIapd"] = {"stateIaApproved": len(dob_sets["stateIa"] & iapd_sets["stateIaApproved"]), "noticeFiled": len(dob_sets["federalNotice"] & iapd_sets["noticeFiled"]), "eraActive": len(dob_sets["era"] & iapd_sets["eraActive"])}
    lenses = {"contract": "ct-inv-001-registration-v1", "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "regulatorListPage": LIST_PAGE, "regulatorLists": dob, "iapd": iapd, "dedupedConnecticutAdvisers": None, "newCanonicalFirms": 0, "graphWrites": 0, "claimChanges": 0}
    write("registration-lenses.json", lenses)
    order_data = {"contract": "ct-inv-001-orders-v1", **orders(set().union(*iapd_sets.values()))}
    write("securities-orders.json", order_data)
    print("DOB", {k: v["rows"] for k, v in dob.items() if isinstance(v, dict) and "rows" in v})
    print("IAPD", {k: len(v) for k, v in iapd_sets.items()})
    print("ORDER DOCUMENTS", len(order_data["rows"]))


if __name__ == "__main__":
    main()
