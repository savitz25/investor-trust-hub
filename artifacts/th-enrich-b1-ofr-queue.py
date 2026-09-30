"""Read the already-owned OFR snapshot to materialize the unresolved ID queue."""
from __future__ import annotations

import csv
import io
import json
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OFR = Path.home() / "investor-trust-hub/data/raw/florida/ofr"
OUT = ROOT / "artifacts/th-enrich-b1/ofr_unresolved_licenses.csv"
rows = []
for name in ("Firms_Branches_AI_Monthly.zip", "Firms_Branches_JZ_Monthly.zip"):
    with zipfile.ZipFile(OFR / name) as archive:
        source = archive.read(archive.namelist()[0]).decode("utf-8-sig", errors="replace")
        rows.extend(csv.DictReader(io.StringIO(source)))
assert len(rows) == len({r["LICENSE NUMBER"] for r in rows}) == 11463
with zipfile.ZipFile(OFR / "Associated_Persons_Monthly.zip") as archive:
    associated = list(csv.DictReader(io.StringIO(
        archive.read(archive.namelist()[0]).decode("utf-8-sig", errors="replace"))))
assert associated == []
with OUT.open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(["ofr_license_number", "license_type", "affiliation", "primary_address_state", "reason"])
    writer.writerows((r["LICENSE NUMBER"], r["LICENSE TYPE"], r["AFFILIATION"], r["PRIM STATE"],
                      "no official OFR-to-CRD identifier in owned extract") for r in rows)
report = {"rows": len(rows), "unique_licenses": len({r["LICENSE NUMBER"] for r in rows}),
          "license_types": dict(Counter(r["LICENSE TYPE"] for r in rows)),
          "affiliation": dict(Counter(r["AFFILIATION"] for r in rows)),
          "primary_address_states": dict(Counter(r["PRIM STATE"] for r in rows)),
          "exact_firm_bridges": 0, "unresolved_firm_licenses": len(rows),
          "associated_person_data_rows": len(associated),
          "production_changed": False}
(ROOT / "docs/TH-ENRICH-2026-09-30-B1-ofr-qa.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print("PASS: OFR owned 11,463 unique licenses, zero exact CRD bridges")
