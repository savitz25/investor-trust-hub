"""Deterministic 50-firm holdout for Task 003 Trust Reports."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402


def _take(selected: list[str], candidates: list[str], n: int) -> None:
    added = 0
    for crd in candidates:
        if crd in selected:
            continue
        selected.append(crd)
        added += 1
        if added >= n:
            return


def main() -> int:
    load_local_env(ROOT)
    import os

    import psycopg

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        rows = conn.execute(
            """
            SELECT
                crd.identifier_value AS crd,
                f.slug,
                f.legal_name,
                f.display_name,
                f.is_synthetic,
                sec.identifier_value AS sec_file_number,
                r.registration_type,
                r.status,
                r.source_status_text,
                b.city,
                b.region,
                b.postal_code,
                b.country,
                adv.organization_form,
                adv.raum_amount,
                rel.release_label,
                rel.retrieved_at IS NOT NULL AS has_retrieved,
                (SELECT count(*) FROM evidence_records e
                  WHERE e.subject_id = f.id AND e.subject_kind = 'firm') AS evidence_count,
                (SELECT count(*) FROM source_snapshots s
                  WHERE s.subject_id = f.id AND s.subject_kind = 'firm') AS snapshot_count,
                obs.observed,
                sd.indexable
            FROM firms f
            JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
            LEFT JOIN firm_identifiers sec ON sec.firm_id = f.id AND sec.identifier_type = 'sec_file_number'
            LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind = 'firm'
            LEFT JOIN branches b ON b.firm_id = f.id AND b.is_main_office
            LEFT JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
            LEFT JOIN source_releases rel ON rel.id = adv.source_release_id
            LEFT JOIN firm_source_observations obs
              ON obs.firm_id = f.id AND obs.source_release_id = adv.source_release_id
            LEFT JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
            WHERE f.is_synthetic = false
            """
        ).fetchall()
        cols = [
            "crd",
            "slug",
            "legal_name",
            "display_name",
            "is_synthetic",
            "sec_file_number",
            "registration_type",
            "status",
            "source_status_text",
            "city",
            "region",
            "postal_code",
            "country",
            "organization_form",
            "raum_amount",
            "release_label",
            "has_retrieved",
            "evidence_count",
            "snapshot_count",
            "observed",
            "indexable",
        ]
        firms = [dict(zip(cols, row, strict=True)) for row in rows]

    def crds(pred) -> list[str]:
        return sorted(str(item["crd"]) for item in firms if pred(item))

    selected: list[str] = []
    _take(selected, crds(lambda f: f["status"] == "registered" and f["region"] == "NY"), 3)
    _take(selected, crds(lambda f: f["status"] == "registered" and f["region"] == "CA"), 3)
    _take(selected, crds(lambda f: f["status"] == "registered" and f["region"] == "TX"), 2)
    _take(selected, crds(lambda f: f["status"] == "registered" and f["region"] == "FL"), 2)
    _take(selected, crds(lambda f: f["region"] == "NJ"), 2)
    _take(selected, crds(lambda f: f["region"] == "PA"), 2)
    _take(selected, crds(lambda f: f["region"] == "MA"), 2)
    _take(selected, crds(lambda f: f["region"] in {"VT", "WY", "ND", "SD", "MT", "AK", "RI", "DE", "ME", "NH"}), 3)
    _take(selected, crds(lambda f: f["registration_type"] == "exempt_reporting_adviser"), 6)
    _take(selected, crds(lambda f: f["status"] == "pending"), 3)
    _take(selected, crds(lambda f: not f["region"]), 4)
    _take(selected, crds(lambda f: f["country"] not in {None, "US"} or f["country"] == "ZZ"), 2)
    _take(selected, crds(lambda f: not f["sec_file_number"]), 1)
    raum = [item for item in firms if item["raum_amount"] is not None]
    raum.sort(key=lambda item: float(item["raum_amount"]), reverse=True)
    _take(selected, [str(item["crd"]) for item in raum[:3]], 2)
    _take(selected, [str(item["crd"]) for item in reversed(raum[-3:])], 2)
    long_names = crds(lambda f: len(f["legal_name"] or "") > 60 or any(ch in (f["legal_name"] or "") for ch in "&,'"))
    _take(selected, long_names, 3)
    leftover = sorted(
        (str(item["crd"]) for item in firms if str(item["crd"]) not in selected),
        key=lambda crd: hashlib.sha256(f"task-003:{crd}".encode("ascii")).hexdigest(),
    )
    for crd in leftover:
        if len(selected) >= 50:
            break
        selected.append(crd)

    by_crd = {str(item["crd"]): item for item in firms}
    records = []
    for crd in selected[:50]:
        firm = by_crd[crd]
        checks = {
            "route": (firm["slug"] or "") == f"sec-crd-{crd}",
            "name": bool(firm["legal_name"] or firm["display_name"]),
            "crd": str(firm["crd"]) == crd,
            "classification": firm["registration_type"]
            in {"registered_investment_adviser", "exempt_reporting_adviser"}
            and not (
                firm["registration_type"] == "exempt_reporting_adviser"
                and firm["status"] == "registered"
            ),
            "pending_distinct": not (
                firm["status"] == "pending" and firm["registration_type"] != "registered_investment_adviser"
            ),
            "evidence": int(firm["evidence_count"] or 0) > 0,
            "snapshot": int(firm["snapshot_count"] or 0) > 0,
            "release": bool(firm["release_label"]),
            "not_synthetic": firm["is_synthetic"] is False,
            "no_zz_as_state": firm["region"] != "ZZ",
        }
        result = "PASS" if all(checks.values()) else "FAIL"
        records.append(
            {
                "crd": crd,
                "slug": firm["slug"],
                "type": "ERA"
                if firm["registration_type"] == "exempt_reporting_adviser"
                else "PENDING"
                if firm["status"] == "pending"
                else "RIA",
                "state": firm["region"] or "UNKNOWN",
                "name": firm["display_name"] or firm["legal_name"],
                "checks": {key: ("PASS" if ok else "FAIL") for key, ok in checks.items()},
                "result": result,
            }
        )
    passed = sum(1 for item in records if item["result"] == "PASS")
    report = {"sample_size": len(records), "passed": passed, "records": records}
    out = ROOT / "data" / "reports" / "task-003-50-firm-qa.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print("CRD | Type | State | Name | Result")
    for item in records:
        print(f"{item['crd']} | {item['type']} | {item['state']} | {(item['name'] or '')[:48]} | {item['result']}")
    print(f"RESULT {passed}/{len(records)}")
    return 0 if passed == len(records) else 2


if __name__ == "__main__":
    raise SystemExit(main())
