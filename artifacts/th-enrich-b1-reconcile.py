"""Compare two official IAPD/OFR snapshots by native identity and status."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree.ElementTree import iterparse

STATES = ("CA", "TX", "AZ", "WA")
OFR_FILES = ("Firms_Branches_AI_Monthly.zip", "Firms_Branches_JZ_Monthly.zip")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def iapd(path: Path) -> tuple[dict[str, dict[str, str]], int, dict[str, int]]:
    by_state: dict[str, dict[str, str]] = {state: {} for state in STATES}
    firms = 0
    duplicate = Counter()
    with gzip.open(path, "rb") as stream:
        for _, firm in iterparse(stream, events=("end",)):
            if firm.tag != "Firm":
                continue
            firms += 1
            info = firm.find("Info")
            crd = (info.get("FirmCrdNb") or "").strip() if info is not None else ""
            regs = firm.find("StateRgstn/Rgltrs")
            if regs is not None:
                for reg in regs.findall("Rgltr"):
                    state = (reg.get("Cd") or "").upper()
                    if state not in STATES:
                        continue
                    if not crd.isdecimal():
                        raise ValueError(f"missing native CRD for {state}")
                    if crd in by_state[state]:
                        duplicate[state] += 1
                    by_state[state][crd] = (reg.get("St") or "").upper()
            firm.clear()
    return by_state, firms, dict(duplicate)


def ofr(directory: Path) -> tuple[dict[str, dict[str, str]], dict[str, dict]]:
    rows = {}
    files = {}
    for name in OFR_FILES:
        path = directory / name
        with zipfile.ZipFile(path) as archive:
            raw = archive.read(archive.namelist()[0]).decode("utf-8-sig", errors="replace")
        parsed = list(csv.DictReader(io.StringIO(raw)))
        files[name] = {"sha256": digest(path), "rows": len(parsed)}
        for row in parsed:
            license_number = row["LICENSE NUMBER"].strip()
            if license_number in rows:
                raise ValueError(f"duplicate OFR license {license_number}")
            rows[license_number] = row
    return rows, files


def compare(args: argparse.Namespace) -> dict:
    old, old_firms, old_dup = iapd(args.prior_iapd)
    new, new_firms, new_dup = iapd(args.current_iapd)
    states = {}
    for state in STATES:
        left, right = old[state], new[state]
        old_approved = {crd for crd, status in left.items() if status == "APPROVED"}
        new_approved = {crd for crd, status in right.items() if status == "APPROVED"}
        added = new_approved - old_approved
        removed = old_approved - new_approved
        states[state] = {
            "old_statuses": dict(Counter(left.values())),
            "new_statuses": dict(Counter(right.values())),
            "old_approved": len(old_approved), "new_approved": len(new_approved),
            "newly_approved_native_crds": len(added),
            "no_longer_approved_native_crds": len(removed),
            "added_reason": dict(Counter("new_feed_crd" if crd not in left else f"status_{left[crd]}_to_APPROVED" for crd in added)),
            "removed_reason": dict(Counter("missing_from_feed" if crd not in right else f"status_APPROVED_to_{right[crd]}" for crd in removed)),
            "added_crds": sorted(added, key=int), "removed_crds": sorted(removed, key=int),
        }
    old_ofr, old_files = ofr(args.prior_ofr)
    new_ofr, new_files = ofr(args.current_ofr)
    old_keys, new_keys = set(old_ofr), set(new_ofr)
    report = {
        "prior_iapd": {"file": args.prior_iapd.name, "sha256": digest(args.prior_iapd), "firm_rows": old_firms, "duplicate_state_crds": old_dup},
        "current_iapd": {"file": args.current_iapd.name, "sha256": digest(args.current_iapd), "firm_rows": new_firms, "duplicate_state_crds": new_dup},
        "states": states,
        "prior_ofr": {"files": old_files, "unique_licenses": len(old_keys), "license_types": dict(Counter(r["LICENSE TYPE"] for r in old_ofr.values()))},
        "current_ofr": {"files": new_files, "unique_licenses": len(new_keys), "license_types": dict(Counter(r["LICENSE TYPE"] for r in new_ofr.values()))},
        "ofr_added_licenses": sorted(new_keys - old_keys),
        "ofr_removed_licenses": sorted(old_keys - new_keys),
        "ofr_stable_licenses": len(old_keys & new_keys),
        "ofr_status_column_present": False,
        "production_changed": False,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prior-iapd", type=Path, required=True)
    parser.add_argument("--current-iapd", type=Path, required=True)
    parser.add_argument("--prior-ofr", type=Path, required=True)
    parser.add_argument("--current-ofr", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    report = compare(parser.parse_args())
    print(json.dumps({"states": {state: {k: v for k, v in row.items() if not k.endswith("crds")} for state, row in report["states"].items()},
                      "prior_ofr": report["prior_ofr"], "current_ofr": report["current_ofr"],
                      "ofr_added": len(report["ofr_added_licenses"]), "ofr_removed": len(report["ofr_removed_licenses"])}, indent=2))
