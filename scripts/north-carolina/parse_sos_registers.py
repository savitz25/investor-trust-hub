#!/usr/bin/env python3
"""Parse official NC SOS Securities registers (IA / IAR / BD / AG)."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "north-carolina" / "nc-inv-001" / "raw"
OUT = ROOT / "data" / "north-carolina" / "nc-inv-001"
AS_OF_RE = re.compile(r"current as of\s+(\d{1,2}/\d{1,2}/\d{2,4})", re.I)
# Row starts with a CRD of 1-7 digits followed by a letter (name).
ROW_RE = re.compile(r"(?<!\d)(\d{1,7})\s+([A-Z][A-Za-z0-9&.,'\-/ ]{2,})", re.M)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def parse_register(path: Path, kind: str) -> dict:
    text = pdf_text(path)
    as_of = None
    m = AS_OF_RE.search(text)
    if m:
        raw = m.group(1)
        parts = raw.split("/")
        year = int(parts[2])
        if year < 100:
            year += 2000
        as_of = f"{year:04d}-{int(parts[0]):02d}-{int(parts[1]):02d}"
    crds: list[str] = []
    missing = 0
    for match in ROW_RE.finditer(text):
        crds.append(match.group(1).lstrip("0") or "0")
    # Header words like "CRD Number" should not produce IDs; filter tiny non-CRDs that
    # appear only as page numbers by requiring uniqueness later.
    distinct = sorted(set(crds), key=lambda x: int(x))
    return {
        "kind": kind,
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "sourceAsOf": as_of,
        "rows": len(crds),
        "distinct_crds": len(distinct),
        "missing_crd": missing,
        "sample": distinct[:8],
        "crds": distinct,
        "header_snippet": text[:400].replace("\n", " | "),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    files = [
        ("IA", RAW / "Register_of_NC_IAs.pdf"),
        ("IAR", RAW / "Register_of_NC_IARs.pdf"),
        ("BD", RAW / "Register_of_NC_BDs.pdf"),
        ("AG", RAW / "Register_of_NC_AGs.pdf"),
    ]
    summary = {"retrievedAt": retrieved, "registers": {}}
    for kind, path in files:
        print("PARSE", kind, path.name, flush=True)
        parsed = parse_register(path, kind)
        crds = parsed.pop("crds")
        summary["registers"][kind] = parsed
        (OUT / f"sos-{kind.lower()}-crds.json").write_text(
            json.dumps({"kind": kind, "sourceAsOf": parsed["sourceAsOf"], "crds": crds}, indent=2),
            encoding="utf-8",
        )
        print(kind, parsed["sourceAsOf"], "rows", parsed["rows"], "distinct", parsed["distinct_crds"], flush=True)
    (OUT / "sos-register-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "header_snippet"} for k, v in summary["registers"].items()}, indent=2))


if __name__ == "__main__":
    main()
