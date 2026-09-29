"""Bounded Indiana IAPD lenses and Securities Division administrative-action index (IN-INV-001).

Reuses the accepted 2026-09-17 STATE/SEC compilation parser (hash-pinned local evidence; no
national re-ingestion). The administrative-action index and order PDFs were captured from the
public reCAPTCHA-backed search page into gitignored data/raw/indiana/ (see fetch_orders.py there).
Printed CRD/SEC numbers are read only from order text layers; scanned orders are not OCR'd.
"""
from __future__ import annotations

import gzip
import hashlib
import importlib.util
import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from xml.etree.ElementTree import iterparse

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/indiana/in-inv-001"
RAW = ROOT / "data/raw/indiana"
PARSER = ROOT / "scripts/ohio/census_iapd_oh.py"
ACCEPTED = Path(os.environ.get("IN_INV_ACCEPTED_IAPD_DIR", str(ROOT / "data/raw/sec/form-adv/iapd-compilation-2026-09-17")))
STATE = ACCEPTED / "IA_FIRM_STATE_Feed_09_17_2026.xml.gz"
SEC = ACCEPTED / "IA_FIRM_SEC_Feed_09_17_2026.xml.gz"
HASHES = {
    STATE.name: "5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02",
    SEC.name: "f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22",
}
INDEX = "https://lcm.securities.sos.in.gov/admin-actions-search"
# Index-tagged "Loan Broker" whose order text cites only the Uniform Securities Act (IC 23-19).
IUSA_TAGGED_LB = {"26-0004 CA", "26-0014 CA"}
STOP = {"LLC", "L.L.C.", "INC", "INC.", "CORP", "CORP.", "CORPORATION", "CO", "CO.", "COMPANY", "LTD", "LP", "THE", "GROUP", "&", "AND", "OF"}


def write(name: str, value: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def firm_names() -> dict[str, dict]:
    """Firm CRD -> names / SEC file from both accepted feeds (firm grain only)."""
    firms: dict[str, dict] = {}
    for path in (STATE, SEC):
        with gzip.open(path) as fh:
            for _event, el in iterparse(fh):
                if el.tag == "Info" and el.get("FirmCrdNb"):
                    rec = firms.setdefault(el.get("FirmCrdNb"), {"names": set(), "sec": None})
                    rec["names"].update(n for n in (el.get("BusNm"), el.get("LegalNm")) if n)
                    rec["sec"] = rec["sec"] or el.get("SECNb")
                elif el.tag == "Firm":
                    el.clear()
    return firms


def key_words(name: str) -> list[str]:
    words = [w for w in re.sub(r"[^A-Z0-9& ]", " ", name.upper()).split() if w not in STOP]
    return words[:3]


def name_in_caption(names: set[str], caption: str) -> bool:
    cap = " " + re.sub(r"[^A-Z0-9& ]", " ", caption.upper()) + " "
    cap = re.sub(r"\s+", " ", cap)
    return any((words := key_words(n)) and " " + " ".join(words) + " " in cap for n in names)


def acquire_lenses() -> tuple[dict, set[str]]:
    for path in (STATE, SEC):
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != HASHES[path.name]:
            raise RuntimeError(f"Accepted IAPD file missing or hash drifted: {path}")
    spec = importlib.util.spec_from_file_location("accepted_iapd_parser", PARSER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.CD = "IN"
    state, sec = module.parse_state(STATE), module.parse_sec(SEC)
    ia, approved, era = set(state["_ia_crds"]), set(state["_ia_approved"]), set(state["_era_active"])
    notice, principal = set(sec["_filed_set"]), set(sec["_principal"])
    overlap = lambda a, b: sorted(a & b, key=int)
    lenses = {
        "contract": "in-inv-001-iapd-lenses-v1", "retrievedAt": "2026-09-17T15:15:00Z", "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "stateFeed": {"url": f"https://reports.adviserinfo.sec.gov/reports/CompilationReports/{STATE.name}", "sourceAsOf": "2026-09-17", "sha256": HASHES[STATE.name]},
        "secFeed": {"url": f"https://reports.adviserinfo.sec.gov/reports/CompilationReports/{SEC.name}", "sourceAsOf": "2026-09-17", "sha256": HASHES[SEC.name]},
        "stateIa": {"filter": "StateRgstn/Rgltr/@Cd=IN", "rows": state["co_state_ia_registration_rows"], "distinctFirmCrd": len(ia), "approvedDistinctFirmCrd": len(approved), "statusRows": dict(state["status_ia"]), "principalOfficeIn": state["principal_office_co_among_state_ia"]},
        "era": {"filter": "ERA/Rgltr/@Cd=IN", "rows": state["co_state_era_registration_rows"], "distinctFirmCrd": len(set(state["_era_crds"])), "activeDistinctFirmCrd": len(era), "statusRows": dict(state["status_era"])},
        "federalNotice": {"filter": "NoticeFiled/States/@RgltrCd=IN and @St=FILED", "rowsAnyStatus": sec["co_notice_rows"], "filedDistinctFirmCrd": len(notice), "filedFirmTypes": sec["co_notice_filed_firm_type"], "statusRows": dict(sec["notice_status"])},
        "principalOffice": {"filter": "MainAddr/@State=IN (SEC compilation)", "distinctFirmCrd": len(principal)},
        "exactCrdIntersections": {"stateIaApprovedAndNoticeFiled": overlap(approved, notice), "stateIaAndEra": overlap(ia, era), "eraAndNoticeFiled": overlap(era, notice), "principalAndNoticeFiled": overlap(principal, notice)},
        "identifierLists": {"stateIaApprovedFirmCrds": sorted(approved, key=int), "eraActiveFirmCrds": sorted(era, key=int), "noticeFiledFirmCrds": sorted(notice, key=int), "principalOfficeFirmCrds": sorted(principal, key=int)},
        "dedupedIndianaAdvisers": None, "graphWrites": 0,
    }
    write("iapd-in-lenses.json", lenses)
    print("IAPD", len(approved), "approved IA", len(era), "active ERA", len(notice), "filed notices", len(principal), "principal-office")
    return lenses, set().union(*(set(v) for v in lenses["identifierLists"].values()))


def order_text(order_id: str) -> str:
    text = ""
    for pdf in sorted((RAW / "orders" / order_id).glob("*.pdf")):
        text += " ".join((p.extract_text() or "") for p in PdfReader(pdf).pages)
    return re.sub(r"\s+", " ", text)


def acquire_orders(lens_crds: set[str]) -> None:
    firms = firm_names()
    pages = [json.loads((RAW / f"admin-actions-index-p{p}.json").read_text(encoding="utf-8")) for p in (1, 2)]
    index = [r for page in pages for r in page["response"]["data"]]
    assert len({r["id"] for r in index}) == len(index) == pages[0]["response"]["total"]
    manifest = json.loads((RAW / "orders-manifest.json").read_text(encoding="utf-8"))
    rows = []
    for r in sorted(index, key=lambda r: (r["date_issued"], r["cause_name"]), reverse=True):
        if r["date_issued"] < "2022-01-01" or not ("securities_investment" in r["entity_types"] or r["cause_name"] in IUSA_TAGGED_LB):
            continue
        files = manifest[r["id"]]["files"]
        text = order_text(r["id"])
        text_layer = len(text) > 500
        printed_crds = sorted(set(re.findall(r"CRD\s*(?:No\.?|Number|#)?\s*[:#]?\s*(\d{3,8})\b", text, re.I)), key=int)
        printed_secs = sorted(set(re.findall(r"\b(801-\d{3,6})\b", text)))
        # Exact firm link: printed CRD is an IAPD firm CRD AND that firm's IAPD name is in the index caption.
        firm_links = sorted({c for c in printed_crds if c in firms and name_in_caption(firms[c]["names"], r["respondents"])}, key=int)
        sec_links = sorted({s for s in printed_secs if any(f["sec"] == s and name_in_caption(f["names"], r["respondents"]) for f in firms.values())})
        rows.append({
            "indexId": r["id"], "causeAsIndexed": r["cause_name"].strip(), "issuanceDate": r["date_issued"][:10],
            "respondentAsIndexed": r["respondents"].strip(), "respondentGrain": "firm-linked caption" if firm_links else "unresolved index caption",
            "actionTypesAsIndexed": [a.replace("_", " ") for a in r["actions"]], "entityTypeAsIndexed": r["entity_types"],
            "statuteNote": "Index-tagged Loan Broker; order text cites only the Uniform Securities Act (IC 23-19)" if r["cause_name"] in IUSA_TAGGED_LB else None,
            "documentTitles": files, "textLayer": text_layer,
            "printedCrdCandidateCount": len(printed_crds), "printedSecFileCandidateCount": len(printed_secs),
            "exactIapdFirmCrdLinks": firm_links, "exactIapdSecFileLinks": sec_links,
            "inAcceptedIndianaLens": sorted(set(firm_links) & lens_crds, key=int),
            "profileAttached": False,
        })
    by_action = Counter(a for row in rows for a in row["actionTypesAsIndexed"])
    write("securities-orders.json", {
        "contract": "in-inv-001-securities-orders-v1", "indexUrl": INDEX, "retrievedAt": pages[1]["retrievedAt"],
        "indexRowsAtRetrieval": len(index),
        "filter": "Division index rows dated 2022-01-01..2026-09-29 with entity type Securities/Investment, plus two Loan-Broker-tagged orders whose text cites only the Uniform Securities Act. Dates are the Division index dates.",
        "rowCount": len(rows),
        "entityTagCounts": dict(Counter("securities_investment" if "securities_investment" in r["entityTypeAsIndexed"] else "loan_broker_iusa_cited" for r in rows)),
        "actionLabelCounts": dict(sorted(by_action.items())), "byYear": dict(sorted(Counter(r["issuanceDate"][:4] for r in rows).items())),
        "rowsWithTextLayer": sum(r["textLayer"] for r in rows), "scannedRowsIdentifiersNotAcquired": sum(not r["textLayer"] for r in rows),
        "rowsWithPrintedCrdCandidates": sum(bool(r["printedCrdCandidateCount"]) for r in rows),
        "rowsWithPrintedSecFileCandidates": sum(bool(r["printedSecFileCandidateCount"]) for r in rows),
        "exactFirmCrdLinks": sum(len(r["exactIapdFirmCrdLinks"]) for r in rows),
        "exactSecFileLinks": sum(len(r["exactIapdSecFileLinks"]) for r in rows),
        "exactEnforcementAttachments": 0, "nameOnlyAdverseJoins": 0, "graphWrites": 0,
        "rows": rows,
    })
    print("orders", len(rows), by_action, "text", sum(r["textLayer"] for r in rows), "firm links", [(r["causeAsIndexed"], r["exactIapdFirmCrdLinks"]) for r in rows if r["exactIapdFirmCrdLinks"]])


if __name__ == "__main__":
    _lenses, crds = acquire_lenses()
    acquire_orders(crds)
