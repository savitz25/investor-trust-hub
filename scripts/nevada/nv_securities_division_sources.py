"""NV-INV-001 — Nevada Securities Division framework from NRS chapter 90 and the Division site access record.

Inputs:
  data/raw/nevada/nv-inv-001/nrs-090.html   NRS chapter 90 from the Nevada Legislature (gitignored raw capture)
Outputs (committed):
  data/nevada/nv-inv-001/nrs-90-framework.json         section headings and short verbatim definitions
  data/nevada/nv-inv-001/securities-division-access.json  what nvsos.gov answered; no bypass was attempted

Standard library only.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "nevada" / "nv-inv-001" / "nrs-090.html"
OUT = ROOT / "data" / "nevada" / "nv-inv-001"
NRS_URL = "https://www.leg.state.nv.us/nrs/NRS-090.html"
NRS_RETRIEVED = "2026-09-25T18:56:13Z"
NRS_SHA = "9d9ecee38688fa796a99051cc5acc88e260dd2b1c169c359bb4a514cc7867213"

SECTIONS = {
    "90.215": "“Administrator” defined.",
    "90.230": "“Division” defined.",
    "90.310": "Licensing of broker-dealers, sales representatives and transfer agents.",
    "90.330": "Licensing of investment advisers and representatives of investment advisers.",
    "90.345": "Investment advisers to certain private funds exempt from licensing.",
    "90.620": "Investigations and subpoenas.",
    "90.630": "Enforcement.",
}


def need(cond: bool, msg: str) -> None:
    if not cond:
        raise SystemExit(f"NV-INV-001 sources: {msg}")


def main() -> None:
    raw = RAW.read_bytes()
    need(hashlib.sha256(raw).hexdigest() == NRS_SHA, "NRS chapter 90 capture is not the recorded one")
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw.decode("windows-1252", errors="replace")))
    text = re.sub(r"\s+", " ", text)

    def section(num: str, head: str, n: int) -> str:
        key = f"NRS {num} {head}"
        first = text.find(key)
        need(first >= 0, f"NRS {num} heading")
        body = text.rfind(key)  # the first hit is the chapter table of contents; the section itself comes last
        need(body > first, f"NRS {num} body")
        return text[body + len(key): body + len(key) + n].strip()

    administrator = section("90.215", SECTIONS["90.215"], 200)
    division = section("90.230", SECTIONS["90.230"], 200)
    need(administrator.startswith("“Administrator” means the Deputy of Securities appointed pursuant to NRS 225.060"), "administrator text")
    need(division.startswith("“Division” means the Securities Division of the Office of the Secretary of State."), "division text")
    need("unless licensed or exempt from licensing under this chapter" in section("90.330", SECTIONS["90.330"], 300), "90.330 text")
    need("unless licensed or exempt from licensing under this chapter" in section("90.310", SECTIONS["90.310"], 300), "90.310 text")
    need("provides advice solely to one or more qualifying private funds" in section("90.345", SECTIONS["90.345"], 300), "90.345 text")
    need("The Administrator may make an investigation" in section("90.620", SECTIONS["90.620"], 120), "90.620 text")
    need("NRS 90.310 or 90.330" in section("90.630", SECTIONS["90.630"], 700), "90.630 text")

    framework = {
        "contract": "investor-nv-nrs90-framework-v1",
        "ticket": "NV-INV-001",
        "source": {
            "title": "NRS Chapter 90 — Securities (Uniform Securities Act)",
            "publisher": "Nevada Legislature, Legislative Counsel Bureau",
            "url": NRS_URL,
            "retrievedAt": NRS_RETRIEVED,
            "sha256": NRS_SHA,
            "bytes": len(raw),
        },
        "definitions": {
            "Administrator": "the Deputy of Securities appointed pursuant to NRS 225.060 (NRS 90.215)",
            "Division": "the Securities Division of the Office of the Secretary of State (NRS 90.230)",
        },
        "sections": [{"nrs": k, "heading": v} for k, v in SECTIONS.items()],
        "readings": {
            "licensing_term": "NRS 90.310 and 90.330 say 'licensed'; the IAPD STATE feed records the same credential as StateRgstn with status APPROVED. The page quotes both and does not convert either into an endorsement.",
            "iar_is_person": "NRS 90.330 licenses investment advisers and representatives of investment advisers separately.",
            "bd_and_sales_rep": "NRS 90.310 licenses broker-dealers and sales representatives; transfer agents are a separate class in the same section.",
            "private_fund_exemption": "NRS 90.345 exempts certain private-fund advisers from licensing; ERA reporting is not licensing.",
            "enforcement_powers": "NRS 90.620 (investigations and subpoenas) and NRS 90.630 (enforcement orders) are the Administrator's powers. A power is not an acquired action.",
        },
    }
    access = {
        "contract": "investor-nv-securities-division-access-v1",
        "ticket": "NV-INV-001",
        "checkedAt": "2026-09-25T18:55:00Z",
        "host": "www.nvsos.gov",
        "pagesTried": [
            "https://www.nvsos.gov/sos/licensing/securities",
            "https://www.nvsos.gov/sos/licensing/securities/enforcement",
            "https://www.nvsos.gov/sos/licensing/securities/enforcement-actions",
            "https://www.nvsos.gov/sos/licensing/securities/administrative-orders",
            "https://www.nvsos.gov/sos/licensing/securities/investor-alerts",
            "https://www.nvsos.gov/",
        ],
        "result": "REJECTED_BY_BOT_DEFENSE",
        "detail": "Every page answered with an Imperva Incapsula 'Request unsuccessful' interstitial (about 1 KB, NOINDEX) to a plain HTTP client, and a normal Chrome session received the same interstitial. No bypass, alternate fetcher, cache or mirror was used.",
        "searchIndexObservation": "A web search lists Securities Division news releases about cease-and-desist and consent orders on www.nvsos.gov/Home/Components/News/News/<id>. They sit behind the same bot defense and were not read.",
        "enforcementListingsAcquired": 0,
        "otherRegulatorsSubstituted": False,
        "notSubstituted": [
            "Nevada Financial Institutions Division",
            "Nevada Gaming Control Board",
            "Nevada Mortgage Lending Division",
            "Nevada Attorney General consumer cases",
        ],
        "upgradePath": "A Founder manual save of the Securities Division enforcement pages into data/raw/nevada/nv-inv-001/, then a bounded index pass.",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "nrs-90-framework.json").write_text(json.dumps(framework, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    (OUT / "securities-division-access.json").write_text(json.dumps(access, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print("ok", len(framework["sections"]), access["result"])


if __name__ == "__main__":
    main()
