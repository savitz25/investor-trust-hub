"""Deterministic 25-firm raw-vs-production QA for the official SEC release."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from ith_ingestion.sec_adv.normalize import normalize_row  # noqa: E402
from ith_ingestion.sec_adv.parse import parse_csv  # noqa: E402
from load_env import load_local_env  # noqa: E402

RIA_CSV = ROOT / (
    "data/raw/sec/form-adv/2026-08-03/ria/"
    "IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640308.CSV"
)
ERA_CSV = ROOT / (
    "data/raw/sec/form-adv/2026-08-03/era/"
    "IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640309.CSV"
)
RELEASE = "2026-08-03"


def _money(value: object) -> str | None:
    if value is None:
        return None
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return str(value)


def _norm_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _select_sample(normalized: list) -> list:
    by_crd = {firm.crd: firm for firm in normalized}
    selected: list[str] = []

    def take(predicate, n: int = 1) -> None:
        leftover = [firm for firm in normalized if firm.crd not in selected and predicate(firm)]
        leftover.sort(key=lambda firm: firm.crd)
        for firm in leftover[:n]:
            selected.append(firm.crd)

    take(lambda f: f.dataset_kind == "ria" and (f.main_office.get("region") or "") == "NY", 2)
    take(lambda f: f.dataset_kind == "ria" and (f.main_office.get("region") or "") == "CA", 2)
    take(lambda f: f.dataset_kind == "ria" and (f.main_office.get("region") or "") == "TX", 2)
    take(lambda f: f.dataset_kind == "ria" and (f.main_office.get("region") or "") == "FL", 2)
    take(
        lambda f: f.dataset_kind == "ria"
        and (f.main_office.get("region") or "") in {"VT", "WY", "ND", "SD", "MT", "AK", "RI", "DE", "ME", "NH"},
        2,
    )
    take(lambda f: f.dataset_kind == "era" and (f.main_office.get("region") or "") == "NY", 1)
    take(lambda f: f.dataset_kind == "era" and (f.main_office.get("region") or "") == "CA", 1)
    take(lambda f: f.dataset_kind == "era", 4)
    take(
        lambda f: not (f.main_office.get("region") or "").strip()
        or (f.main_office.get("country") or "").upper() not in {"", "US", "USA", "UNITED STATES"},
        2,
    )
    take(lambda f: not f.sec_file_number, 1)
    take(lambda f: f.sec_current_status_text.lower() == "120-day approval", 1)
    ria_with_raum = [f for f in normalized if f.dataset_kind == "ria" and f.raum_amount]
    ria_with_raum.sort(key=lambda f: float(f.raum_amount or 0), reverse=True)
    for firm in ria_with_raum[:2]:
        if firm.crd not in selected:
            selected.append(firm.crd)
    for firm in reversed(ria_with_raum[-2:]):
        if firm.crd not in selected:
            selected.append(firm.crd)
    forms = sorted({(f.organization_form or "") for f in normalized if f.organization_form})
    for form in forms[:3]:
        take(lambda f, current=form: f.organization_form == current, 1)
    statuses = sorted({f.sec_current_status_text for f in normalized if f.sec_current_status_text})
    for status in statuses[:3]:
        take(lambda f, current=status: f.sec_current_status_text == current, 1)

    remaining = [firm.crd for firm in normalized if firm.crd not in selected]
    remaining.sort(key=lambda crd: hashlib.sha256(f"{RELEASE}:{crd}".encode("ascii")).hexdigest())
    for crd in remaining:
        if len(selected) >= 25:
            break
        selected.append(crd)
    return [by_crd[crd] for crd in selected[:25]]


def _compare(firm, row: dict) -> dict[str, str]:
    results: dict[str, str] = {}
    checks = {
        "identity": _norm_text(row.get("crd")) == firm.crd
        and _norm_text(row.get("legal_name")) == firm.legal_name,
        "registration": _norm_text(row.get("registration_type")) == firm.registration_type
        and _norm_text(row.get("source_status_text")) == firm.sec_current_status_text,
        "address": _norm_text(row.get("address_line_1")) == _norm_text(firm.main_office.get("line1"))
        and _norm_text(row.get("city")) == _norm_text(firm.main_office.get("city"))
        and _norm_text(row.get("region")) == _norm_text(firm.main_office.get("region"))
        and _norm_text(row.get("postal_code")) == _norm_text(firm.main_office.get("postal_code")),
        "evidence": int(row.get("evidence_count") or 0) > 0,
        "raw_snapshot": int(row.get("snapshot_count") or 0) > 0,
        "not_synthetic": row.get("is_synthetic") is False,
        "search_exists": row.get("search_slug") is not None,
        "search_not_indexable": row.get("indexable") is False,
        "source_release": _norm_text(row.get("release_label")) == RELEASE,
        "source_dataset": _norm_text(row.get("source_dataset_id"))
        == ("sec_ia_ria" if firm.dataset_kind == "ria" else "sec_ia_era"),
    }
    if firm.sec_file_number:
        checks["sec_file"] = _norm_text(row.get("sec_file_number")) == firm.sec_file_number
    else:
        checks["sec_file"] = not row.get("sec_file_number")
    if firm.raum_amount:
        checks["raum"] = _money(row.get("raum_amount")) == firm.raum_amount
    if not all(checks.values()):
        results["result"] = "FAIL"
    else:
        results["result"] = "PASS"
    results.update({key: "PASS" if ok else "FAIL" for key, ok in checks.items()})
    return results


def main() -> int:
    load_local_env(ROOT)
    import os

    import psycopg

    if not RIA_CSV.exists() or not ERA_CSV.exists():
        print("official archived CSVs missing")
        return 1
    _, ria_rows = parse_csv(str(RIA_CSV), "ria")
    _, era_rows = parse_csv(str(ERA_CSV), "era")
    normalized = []
    for row in [*ria_rows, *era_rows]:
        result = normalize_row(row)
        if hasattr(result, "crd"):
            normalized.append(result)
    sample = _select_sample(normalized)
    crds = [firm.crd for firm in sample]
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("INGESTION_DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        rows = conn.execute(
            """
            SELECT
                i.identifier_value AS crd,
                f.legal_name,
                sec.identifier_value AS sec_file_number,
                r.registration_type,
                r.status,
                r.source_status_text,
                b.address_line_1,
                b.city,
                b.region,
                b.postal_code,
                b.country,
                rel.release_label,
                adv.source_dataset_id,
                rel.retrieved_at,
                f.is_synthetic,
                sd.slug AS search_slug,
                sd.indexable,
                adv.raum_amount,
                (SELECT count(*) FROM evidence_records e
                  WHERE e.subject_id = f.id AND e.subject_kind = 'firm') AS evidence_count,
                (SELECT count(*) FROM source_snapshots s
                  WHERE s.subject_id = f.id AND s.subject_kind = 'firm') AS snapshot_count
            FROM firm_identifiers i
            JOIN firms f ON f.id = i.firm_id
            LEFT JOIN firm_identifiers sec
              ON sec.firm_id = f.id AND sec.identifier_type = 'sec_file_number'
            LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind = 'firm'
            LEFT JOIN branches b ON b.firm_id = f.id AND b.is_main_office
            LEFT JOIN form_adv_firm_facts adv ON adv.firm_id = f.id
            LEFT JOIN source_releases rel ON rel.id = adv.source_release_id
            LEFT JOIN search_documents sd ON sd.entity_id = f.id AND sd.entity_kind = 'firm'
            WHERE i.identifier_type = 'crd' AND i.identifier_value = ANY(%s)
            """,
            (crds,),
        ).fetchall()
        colnames = [
            "crd",
            "legal_name",
            "sec_file_number",
            "registration_type",
            "status",
            "source_status_text",
            "address_line_1",
            "city",
            "region",
            "postal_code",
            "country",
            "release_label",
            "source_dataset_id",
            "retrieved_at",
            "is_synthetic",
            "search_slug",
            "indexable",
            "raum_amount",
            "evidence_count",
            "snapshot_count",
        ]
        by_crd = {row[0]: dict(zip(colnames, row, strict=True)) for row in rows}

    records = []
    for firm in sample:
        prod = by_crd.get(firm.crd)
        if not prod:
            record = {
                "crd": firm.crd,
                "type": firm.dataset_kind.upper(),
                "state": firm.main_office.get("region") or "UNKNOWN",
                "name": firm.legal_name,
                "result": "FAIL",
                "detail": "missing from production",
            }
            records.append(record)
            continue
        comparison = _compare(firm, prod)
        records.append(
            {
                "crd": firm.crd,
                "type": firm.dataset_kind.upper(),
                "state": firm.main_office.get("region") or prod.get("region") or "UNKNOWN",
                "name": firm.legal_name,
                "identity": comparison["identity"],
                "registration": comparison["registration"],
                "address": comparison["address"],
                "evidence": comparison["evidence"],
                "raw_snapshot": comparison["raw_snapshot"],
                "sec_file": comparison["sec_file"],
                "source_release": comparison["source_release"],
                "search_not_indexable": comparison["search_not_indexable"],
                "not_synthetic": comparison["not_synthetic"],
                "result": comparison["result"],
            }
        )

    passed = sum(1 for item in records if item["result"] == "PASS")
    report = {
        "release": RELEASE,
        "sample_size": len(records),
        "passed": passed,
        "failed": len(records) - passed,
        "acceptance": f"{passed}/{len(records)}",
        "records": records,
    }
    out = ROOT / "data" / "reports" / "task-002-1-25-firm-qa.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print("CRD | Type | State | Name | Identity | Registration | Address | Evidence | Raw Snapshot | Result")
    for item in records:
        name = (item["name"] or "")[:48]
        print(
            f"{item['crd']} | {item['type']} | {item['state']} | {name} | "
            f"{item.get('identity', 'FAIL')} | {item.get('registration', 'FAIL')} | "
            f"{item.get('address', 'FAIL')} | {item.get('evidence', 'FAIL')} | "
            f"{item.get('raw_snapshot', 'FAIL')} | {item['result']}"
        )
    print(f"RESULT {passed}/{len(records)}")
    return 0 if passed == 25 else 2


if __name__ == "__main__":
    raise SystemExit(main())
