"""Acquire dated Rhode Island securities lenses from IAPD and DBR sources.

Firm status classes are filtered by RI regulator jurisdiction, never by address.
Orders remain document observations and are not automatically joined to entities.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/rhode-island/ri-inv-001"
AS_OF = "2026-10-06"
BASE = "https://reports.adviserinfo.sec.gov/reports/CompilationReports/"
STATE_NAME = f"IA_FIRM_STATE_Feed_{AS_OF[5:7]}_{AS_OF[8:10]}_{AS_OF[:4]}.xml.gz"
SEC_NAME = f"IA_FIRM_SEC_Feed_{AS_OF[5:7]}_{AS_OF[8:10]}_{AS_OF[:4]}.xml.gz"
ORDERS_URL = "https://dbr.ri.gov/banking-securities-and-charitable-organizations/securities-and-charities/securities-enforcement"
HEADERS = {"User-Agent": "InvestorTrustHub research contact: public-source acquisition"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_feeds(retrieved: str) -> dict:
    state_url, sec_url = BASE + STATE_NAME, BASE + SEC_NAME
    state_bytes = requests.get(state_url, headers=HEADERS, timeout=60).content
    sec_bytes = requests.get(sec_url, headers=HEADERS, timeout=60).content
    if not state_bytes.startswith(b"\x1f\x8b") or not sec_bytes.startswith(b"\x1f\x8b"):
        raise RuntimeError("IAPD compilation download did not return gzip data")
    with tempfile.TemporaryDirectory(prefix="ri-inv-001-") as td:
        state_path, sec_path = Path(td) / STATE_NAME, Path(td) / SEC_NAME
        state_path.write_bytes(state_bytes)
        sec_path.write_bytes(sec_bytes)
        parser_path = ROOT / "scripts/ohio/census_iapd_oh.py"
        spec = importlib.util.spec_from_file_location("iapd_oh_parser", parser_path)
        if spec is None or spec.loader is None:
            raise RuntimeError("Unable to load existing IAPD compilation parser")
        parser = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(parser)
        parser.CD = "RI"
        state = parser.parse_state(state_path)
        sec = parser.parse_sec(sec_path)

    ia = set(state["_ia_crds"])
    approved = set(state["_ia_approved"])
    current = set(state["_ia_current"])
    era = set(state["_era_crds"])
    era_active = set(state["_era_active"])
    notice = set(sec["_filed_set"])
    principal = set(sec["_principal"])
    return {
        "contract": "ri-inv-001-registration-v1",
        "generatedAt": retrieved,
        "sourceAsOf": AS_OF,
        "retrievedAt": retrieved,
        "stateFeed": {"url": state_url, "file": STATE_NAME, "sha256": sha256(state_bytes), "bytes": len(state_bytes), "filter": "StateRgstn/Rgltr/@Cd=RI"},
        "secFeed": {"url": sec_url, "file": SEC_NAME, "sha256": sha256(sec_bytes), "bytes": len(sec_bytes), "noticeFilter": "NoticeFiled/States/@RgltrCd=RI and @St=FILED", "principalFilter": "SEC compilation MainAddr/@State=RI"},
        "stateIa": {"registrationRows": state["co_state_ia_registration_rows"], "distinctFirmCrds": len(ia), "approvedFirmCrds": len(approved), "approvedFirmCrdIds": sorted(approved, key=int), "currentStatusFirmCrds": len(current), "statusRows": dict(state["status_ia"]), "firmCrds": sorted(ia, key=int)},
        "federalNotice": {"filedFirmCrds": len(notice), "statusRows": dict(sec["notice_status"]), "firmCrds": sorted(notice, key=int)},
        "era": {"registrationRows": state["co_state_era_registration_rows"], "distinctFirmCrds": len(era), "activeFirmCrds": len(era_active), "statusRows": dict(state["status_era"]), "firmCrds": sorted(era, key=int)},
        "principalOffice": {"distinctFirmCrds": len(principal), "firmCrds": sorted(principal, key=int), "note": "Principal office in RI is geography only; it is not RI registration or authority."},
        "exactFirmCrdIntersections": {
            "approvedStateIaAndFiledFederalNotice": sorted(approved & notice, key=int),
            "stateIaAndActiveEra": sorted(ia & era_active, key=int),
            "activeEraAndFiledFederalNotice": sorted(era_active & notice, key=int),
            "principalOfficeAndFiledFederalNotice": sorted(principal & notice, key=int),
        },
        "notAcquired": {"brokerDealerFirmRoster": "NOT_ACQUIRED", "salesAgentRoster": "NOT_ACQUIRED", "providerLevelIarRoster": "NOT_ACQUIRED"},
        "grain": "Each IAPD state IA, federal notice, and ERA set is a firm CRD lens. Principal office is a separate SEC-firm geography lens. No combined adviser total.",
    }


def parse_orders(retrieved: str) -> dict:
    response = requests.get(ORDERS_URL, headers=HEADERS, timeout=60)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    tables = soup.select("table")
    securities = next((table for table in tables if "Securities" in table.get_text(" ", strip=True) and "Name of Action" in table.get_text(" ", strip=True)), None)
    if securities is None:
        raise RuntimeError("Could not identify DBR securities orders table")
    rows = []
    for tr in securities.select("tr"):
        cells = tr.find_all(["td", "th"], recursive=False)
        if len(cells) < 3 or cells[0].name != "td":
            continue
        links = cells[0].find_all("a", href=True)
        if not links:
            continue
        href = requests.compat.urljoin(ORDERS_URL, links[0]["href"])
        rows.append({
            "actionType": cells[0].get_text(" ", strip=True),
            "respondentAsIndexed": cells[1].get_text(" ", strip=True),
            "dateAsIndexed": cells[2].get_text(" ", strip=True),
            "sourceDocument": href,
            "grain": "regulator action document; respondent identity and disposition require document-level review",
        })
    return {
        "contract": "ri-inv-001-orders-v1",
        "generatedAt": retrieved,
        "source": {"authority": "Rhode Island DBR Securities Division", "url": ORDERS_URL, "retrievedAt": retrieved, "sha256": sha256(response.content)},
        "documentRows": len(rows),
        "rows": rows,
        "identityPolicy": "No name-only joins. Order rows are not provider violations, unique entities, or a complete adverse-history census.",
    }


def main() -> None:
    retrieved = datetime.now(timezone.utc).isoformat(timespec="seconds")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "registration-lenses.json").write_text(json.dumps(parse_feeds(retrieved), indent=2) + "\n", encoding="utf-8")
    (OUT / "securities-orders.json").write_text(json.dumps(parse_orders(retrieved), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote Rhode Island IAPD and securities-order evidence to {OUT}")


if __name__ == "__main__":
    main()
