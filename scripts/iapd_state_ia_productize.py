#!/usr/bin/env python3
"""Dry-run productization for acquired OR/AZ/WA IAPD feeds.

--apply always refuses. This ticket does not authorize production ingest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "ingestion" / "src"))

from ith_ingestion.iapd_state_ia.normalize import normalize_observations  # noqa: E402
from ith_ingestion.iapd_state_ia.parse import parse_compilation  # noqa: E402

STATE_FEED = "IA_FIRM_STATE_Feed_09_10_2026.xml.gz"
SEC_FEED = "IA_FIRM_SEC_Feed_09_10_2026.xml.gz"
SOURCE_AS_OF = "2026-09-10"
RETRIEVED_AT = "2026-09-16T18:30:00Z"
EXPECTED_REFERENCE = {"OR": 337, "AZ": 678, "WA": 600}
COMMITTED_OR_APPROVED = 335


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--compilation",
        type=Path,
        help="Directory that already contains the acquired IA_FIRM_STATE and IA_FIRM_SEC gzip files. Required. Not searched for and not downloaded.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "ea-inv-iapd-or-az-wa" / "dry-run-receipt.json")
    args = parser.parse_args()
    if args.apply:
        print("REFUSED: --apply is not authorized. No production ingest, schema change, or firm insert.", file=sys.stderr)
        return 2
    if not (args.dry_run or args.check):
        print("Pass --dry-run or --check. --apply is refused.", file=sys.stderr)
        return 2
    if args.compilation is None:
        print(
            "REFUSED: --compilation is required. Pass the directory that already holds the acquired feeds. Nothing is downloaded or auto-discovered.",
            file=sys.stderr,
        )
        return 2

    state_feed = args.compilation / STATE_FEED
    sec_feed = args.compilation / SEC_FEED
    if not state_feed.is_file() or not sec_feed.is_file():
        print(f"BLOCKED: acquired compilation not found at {args.compilation}", file=sys.stderr)
        return 3

    rows = parse_compilation(state_feed, sec_feed, source_as_of=SOURCE_AS_OF, retrieved_at=RETRIEVED_AT)
    first = normalize_observations(rows, existing_firm_crds=None)
    second = normalize_observations(rows, existing_firm_crds=None)
    idempotent = [obs.fingerprint for obs in first.observations] == [obs.fingerprint for obs in second.observations]

    status_counts = {}
    approved = {}
    for state in ("OR", "AZ", "WA"):
        counts = Counter(
            obs.status
            for obs in first.observations
            if obs.jurisdiction == state and obs.registration_class == "state_ia" and obs.disposition == "READY_INTERNAL"
        )
        status_counts[state] = dict(counts)
        approved[state] = counts.get("APPROVED", 0)

    receipt = {
        "ticket": "EA-INV-IAPD-OR-AZ-WA-PRODUCTIZE-PREP",
        "mode": "dry-run",
        "production_ingest": False,
        "production_db_mutation": False,
        "public_eligibility": "internal_only",
        "destination": "state_registration_observations",
        "firm_create": False,
        "firm_match": "NOT_EVALUATED_NO_LOCAL_FIRM_IDENTIFIER_EXTRACT",
        "compilation": {
            "state_feed": STATE_FEED,
            "sec_feed": SEC_FEED,
            "state_sha256": sha256_file(state_feed),
            "sec_sha256": sha256_file(sec_feed),
            "source_as_of": SOURCE_AS_OF,
            "retrieved_at": RETRIEVED_AT,
        },
        "expected_reference_approved_state_ia": EXPECTED_REFERENCE,
        "reference_note": "337/678/600 are Evidence Activation references. They are not forced.",
        "committed_oregon_census_approved_distinct_crd": COMMITTED_OR_APPROVED,
        "state_ia_status_counts": status_counts,
        "approved_state_ia_ready_internal": approved,
        "drift_vs_expected_reference": {state: approved[state] - EXPECTED_REFERENCE[state] for state in approved},
        "idempotent_second_run": idempotent,
        "ledger": first.as_dict(),
    }
    # Drop the full excluded list from the committed receipt if huge; keep counts.
    receipt["ledger"]["excluded_count"] = len(receipt["ledger"]["excluded"])
    receipt["ledger"]["excluded_reasons"] = {}
    for item in receipt["ledger"]["excluded"]:
        reason = item["reason"]
        receipt["ledger"]["excluded_reasons"][reason] = receipt["ledger"]["excluded_reasons"].get(reason, 0) + 1
    del receipt["ledger"]["excluded"]

    if args.dry_run:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {args.out}")
    print(json.dumps({
        "state_ia_status_counts": status_counts,
        "approved_state_ia_ready_internal": approved,
        "drift_vs_expected_reference": receipt["drift_vs_expected_reference"],
        "idempotent_second_run": idempotent,
        "firm_match": receipt["firm_match"],
    }, indent=2))
    return 0 if idempotent else 1


if __name__ == "__main__":
    raise SystemExit(main())
