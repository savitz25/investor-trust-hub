"""Extract Pennsylvania registered securities as issuer/offering evidence only."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

DATE_LINE = re.compile(r"^Registered in PA:\s*(\d{1,2}/\d{1,2}/\d{4})\s+to\s+(\d{1,2}/\d{1,2}/\d{4})(.*)$")


def extract(source: Path, output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    failures = []
    section = ""
    pending: list[str] = []
    with pdfplumber.open(source) as pdf:
        pages = len(pdf.pages)
        for page_no, page in enumerate(pdf.pages, 1):
            for line in (page.extract_text() or "").splitlines():
                line = line.strip()
                if line in {"REGISTERED BY COORDINATION", "REGISTERED BY QUALIFICATION"}:
                    section = line
                    pending.clear()
                    continue
                if line.startswith("Registered Securities as of "):
                    continue
                match = DATE_LINE.match(line)
                if match:
                    if len(pending) < 3:
                        failures.append({"page": page_no, "line": line, "context": pending[:]})
                    else:
                        issuer = " ".join(pending[:-2])
                        location = pending[-2]
                        security = pending[-1]
                        key = hashlib.sha256(f"{section}|{issuer}|{security}|{match.group(1)}".encode()).hexdigest()[:20]
                        rows.append({"source_system": "pa_dobs", "source_dataset": "registered_securities",
                                     "record_key": key, "section": section, "issuer_name_raw": issuer,
                                     "issuer_location_raw": location, "security_type_raw": security,
                                     "registration_start_raw": match.group(1),
                                     "registration_end_raw": match.group(2),
                                     "registration_note_raw": match.group(3).strip(), "source_page": page_no})
                    pending.clear()
                    continue
                if section and line and not line.startswith("Under state law"):
                    pending.append(line)
                    pending = pending[-8:]
    (output / "pa_registered_securities.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    result = {"official_source": "Pennsylvania Department of Banking and Securities",
              "retrieved_at": datetime.now(timezone.utc).isoformat(), "source_file": source.name,
              "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "pages": pages,
              "raw_registration_lines": len(rows) + len(failures), "parsed_rows": len(rows),
              "unique_source_record_keys": len({r["record_key"] for r in rows}),
              "duplicate_keys": len(rows) - len({r["record_key"] for r in rows}),
              "sections": dict(Counter(r["section"] for r in rows)), "parse_failures": failures,
              "native_issuer_id_present": False, "firm_bridges": 0, "new_adviser_identities": 0,
              "target_class": "issuer/offering evidence", "adviser_denominator_delta": 0,
              "production_changed": False}
    (output / "pa_registered_securities_qa.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(extract(args.source, args.out), indent=2))
