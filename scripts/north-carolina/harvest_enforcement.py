#!/usr/bin/env python3
"""Catalog NC SOS Criminal Enforcement & Administrative Actions from the year HTML."""
from __future__ import annotations

import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "data" / "north-carolina" / "nc-inv-001" / "raw" / "admin_action.html"
OUT = ROOT / "data" / "north-carolina" / "nc-inv-001" / "enforcement-coverage.json"

CRD_RE = re.compile(r"\bCRD\s*(?:#|No\.?|Number)?\s*[:#]?\s*(\d{1,7})\b", re.I)


def classify(text: str) -> dict:
    t = text.lower()
    summary = bool(re.search(r"summary (?:order|cease)|temporary \(summary\)|temporary order to summarily", t))
    final = bool(re.search(r"final order", t))
    criminal = bool(re.search(r"\b(plead guilty|pleaded guilty|pled guilty|indicted|indictment|convicted|conviction|sentenced|prison|guilty plea|federal charges|arrest)\b", t))
    admin = bool(re.search(r"cease and desist|final order|consent order|revoke|suspension|administrative", t))
    ia = bool(re.search(r"investment adviser(?! representative)", t))
    iar = bool(re.search(r"investment adviser representative|\biar\b", t))
    bd = bool(re.search(r"broker-?dealer|securities dealer", t))
    agent = bool(re.search(r"salesman|securities agent|registration as a salesman", t))
    return {
        "summary_cease_desist": summary,
        "final_administrative_order": final and not criminal,
        "criminal": criminal,
        "administrative": admin and not criminal,
        "ia": ia,
        "iar": iar,
        "bd": bd,
        "agent": agent,
        "crd": [m.group(1) for m in CRD_RE.finditer(text)],
    }


class ActionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.year = None
        self.in_p = False
        self.buf = []
        self.rows = []
        self.capture = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div" and attrs.get("class") == "actionPartial" and attrs.get("id"):
            self.year = attrs["id"]
            self.capture = True
        if tag == "p" and self.capture:
            self.in_p = True
            self.buf = []
        if tag == "a" and self.in_p:
            href = attrs.get("href")
            if href:
                self.buf.append(f" [href={href}] ")

    def handle_endtag(self, tag):
        if tag == "div" and self.capture:
            self.capture = False
            self.year = None
        if tag == "p" and self.in_p:
            text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if text and self.year:
                self.rows.append({"year": int(self.year), "text": text, **classify(text)})
            self.in_p = False
            self.buf = []

    def handle_data(self, data):
        if self.in_p:
            self.buf.append(data)


def main() -> None:
    html = HTML.read_text(encoding="utf-8", errors="replace")
    parser = ActionParser()
    parser.feed(html)
    rows = parser.rows
    years = sorted({r["year"] for r in rows})
    bounded = [r for r in rows if 2022 <= r["year"] <= 2026]
    crd_docs = [r for r in rows if r["crd"]]
    payload = {
        "source": "https://www.sosnc.gov/divisions/securities/admin_action",
        "sha256": hashlib.sha256(HTML.read_bytes()).hexdigest(),
        "yearMin": min(years) if years else None,
        "yearMax": max(years) if years else None,
        "documents": len(rows),
        "documents_2022_2026": len(bounded),
        "summary_cease_desist": sum(1 for r in rows if r["summary_cease_desist"]),
        "final_administrative_order": sum(1 for r in rows if r["final_administrative_order"]),
        "criminal": sum(1 for r in rows if r["criminal"]),
        "administrative": sum(1 for r in rows if r["administrative"]),
        "ia_mentions": sum(1 for r in rows if r["ia"]),
        "iar_mentions": sum(1 for r in rows if r["iar"]),
        "bd_mentions": sum(1 for r in rows if r["bd"]),
        "agent_mentions": sum(1 for r in rows if r["agent"]),
        "exact_crd_documents": len(crd_docs),
        "exact_crd_attachments": 0,
        "pdfsDownloaded": 0,
        "mixed_universe": True,
        "summary_ne_final": True,
        "charge_ne_conviction": True,
        "catalog_status": "ACQUIRED_YEAR_HTML_CATALOG",
        "unique_matters": None,
        "ia_enforcement_documents": None,
        "iar_enforcement_documents": None,
        "bd_enforcement_documents": None,
        "agent_enforcement_documents": None,
        "reason_class_null": "HTML catalog is mixed securities-class. Mentions of IA/IAR/BD/agent are keyword observations, not a complete class census. Unique matter IDs are not consistently published.",
        "year_counts": {str(y): sum(1 for r in rows if r["year"] == y) for y in years},
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in payload.items() if k != "year_counts"}, indent=2))
    print("years", payload["year_counts"])


if __name__ == "__main__":
    main()
