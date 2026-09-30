"""Derive CA/TX/AZ/WA approved adviser lenses from the owned IAPD state feed.

Read-only with respect to the database. CRD stays the firm identity; a state
registration is an overlay on that identity, never a new firm.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.etree.ElementTree import iterparse

STATES = ("CA", "TX", "AZ", "WA")


def build(source: Path, out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    records: list[dict[str, str]] = []
    statuses: dict[str, Counter[str]] = defaultdict(Counter)
    all_firms = 0
    with gzip.open(source, "rb") as stream:
        for _, firm in iterparse(stream, events=("end",)):
            if firm.tag != "Firm":
                continue
            all_firms += 1
            info = firm.find("Info")
            crd = (info.get("FirmCrdNb") or "").strip() if info is not None else ""
            registrations = firm.find("StateRgstn/Rgltrs")
            if registrations is not None:
                for regulator in registrations.findall("Rgltr"):
                    state = (regulator.get("Cd") or "").upper()
                    if state not in STATES:
                        continue
                    status = (regulator.get("St") or "").upper()
                    statuses[state][status] += 1
                    if status == "APPROVED" and crd.isdecimal():
                        records.append({
                            "source_system": "iapd",
                            "source_dataset": "iapd_state_compilation",
                            "firm_crd": crd,
                            "registration_state": state,
                            "registration_status": status,
                            "registration_date": regulator.get("Dt") or "",
                            "business_name": info.get("BusNm") or "" if info is not None else "",
                            "legal_name": info.get("LegalNm") or "" if info is not None else "",
                        })
            firm.clear()
    records.sort(key=lambda r: (r["registration_state"], int(r["firm_crd"])))
    with (out / "iapd_approved_state_advisers.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(records[0]) if records else [])
        writer.writeheader()
        writer.writerows(records)
    counts = Counter(r["registration_state"] for r in records)
    duplicate_keys = sum(n - 1 for n in Counter((r["registration_state"], r["firm_crd"]) for r in records).values() if n > 1)
    result = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "source_file": source.name,
        "source_sha256": digest,
        "source_grain": "IAPD firm CRD with state registration observations",
        "output_grain": "one approved state registration per state and firm CRD",
        "firm_records_read": all_firms,
        "approved_rows": dict(counts),
        "status_distribution": {s: dict(statuses[s]) for s in STATES},
        "duplicate_state_crd_keys": duplicate_keys,
        "distinct_firm_crds_across_slices": len({r["firm_crd"] for r in records}),
        "new_firm_identities": 0,
        "reason": "Existing national IAPD firm CRD is retained; this is a derived lens only.",
        "production_changed": False,
    }
    (out / "iapd_approved_state_advisers_qa.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.source, args.out), indent=2))
