"""Dry-run / apply the Task 003 firm indexability gate against the configured database."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402

US_STATES = {
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DC",
    "DE",
    "FL",
    "GA",
    "HI",
    "IA",
    "ID",
    "IL",
    "IN",
    "KS",
    "KY",
    "LA",
    "MA",
    "MD",
    "ME",
    "MI",
    "MN",
    "MO",
    "MS",
    "MT",
    "NC",
    "ND",
    "NE",
    "NH",
    "NJ",
    "NM",
    "NV",
    "NY",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VA",
    "VT",
    "WA",
    "WI",
    "WV",
    "WY",
}


def main() -> int:
    load_local_env(ROOT)
    import os

    import psycopg

    apply = "--apply" in sys.argv
    wave = "--wave" in sys.argv
    limit = None
    crd_allowlist: set[str] | None = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
            i += 2
            continue
        if args[i].startswith("--crds="):
            crd_allowlist = {part.strip() for part in args[i].split("=", 1)[1].split(",") if part.strip()}
            i += 1
            continue
        i += 1
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1

    sql = """
        SELECT
            f.id,
            f.slug,
            f.is_synthetic,
            f.legal_name,
            f.display_name,
            crd.identifier_value AS crd,
            sec.identifier_value AS sec_file_number,
            r.registration_type,
            r.status,
            b.city,
            b.region,
            b.postal_code,
            adv.organization_form,
            adv.website,
            adv.raum_amount,
            adv.dataset_kind,
            rel.release_label,
            obs.observed,
            (SELECT count(*) FROM evidence_records e
              WHERE e.subject_id = f.id AND e.subject_kind = 'firm') AS evidence_count,
            (SELECT count(*) FROM source_snapshots s
              WHERE s.subject_id = f.id AND s.subject_kind = 'firm') AS snapshot_count,
            sd.indexable
        FROM firms f
        LEFT JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
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
    eligible_ids: list[str] = []
    eligible_meta: list[dict[str, str]] = []
    reasons: dict[str, int] = {}
    classes = {"reported_as_registered": 0, "pending_120_day": 0, "exempt_reporting_adviser": 0}
    geo = 0
    trust = 0
    official = 0
    currently_indexable = 0
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        rows = conn.execute(sql).fetchall()
        cols = [
            "id",
            "slug",
            "is_synthetic",
            "legal_name",
            "display_name",
            "crd",
            "sec_file_number",
            "registration_type",
            "status",
            "city",
            "region",
            "postal_code",
            "organization_form",
            "website",
            "raum_amount",
            "dataset_kind",
            "release_label",
            "observed",
            "evidence_count",
            "snapshot_count",
            "indexable",
        ]
        for raw in rows:
            row = dict(zip(cols, raw, strict=True))
            official += 1
            codes: list[str] = []
            if not row["crd"]:
                codes.append("missing_crd")
            elif not str(row["crd"]).isdigit():
                codes.append("malformed_crd")
            if not (row["legal_name"] or row["display_name"]):
                codes.append("missing_name")
            classification = None
            if row["registration_type"] == "exempt_reporting_adviser":
                classification = "exempt_reporting_adviser"
            elif row["registration_type"] == "registered_investment_adviser" and row["status"] == "pending":
                classification = "pending_120_day"
            elif row["registration_type"] == "registered_investment_adviser" and row["status"] == "registered":
                classification = "reported_as_registered"
            if not classification:
                codes.append("missing_classification")
            if row["observed"] is not True:
                codes.append("missing_observation")
            if not row["release_label"]:
                codes.append("missing_source_release")
            if int(row["evidence_count"] or 0) < 1:
                codes.append("missing_evidence")
            if int(row["snapshot_count"] or 0) < 1:
                codes.append("missing_snapshot")
            extra = any(
                [
                    row["city"],
                    (row["region"] or "") in US_STATES,
                    row["postal_code"],
                    row["sec_file_number"],
                    row["organization_form"],
                    row["raum_amount"] is not None,
                    row["website"],
                ]
            )
            if not extra:
                codes.append("insufficient_consumer_content")
            if not codes:
                trust += 1
                eligible_ids.append(str(row["id"]))
                eligible_meta.append(
                    {"id": str(row["id"]), "crd": str(row["crd"] or ""), "slug": row["slug"] or ""}
                )
                if classification:
                    classes[classification] += 1
                if (row["region"] or "") in US_STATES:
                    geo += 1
                else:
                    codes.append("missing_usable_us_state")
            for code in codes:
                if code != "missing_usable_us_state" or not extra:
                    reasons[code] = reasons.get(code, 0) + 1
            if row["indexable"]:
                currently_indexable += 1
        wave_ids = list(eligible_ids)
        if crd_allowlist is not None:
            wave_ids = [item["id"] for item in eligible_meta if item["crd"] in crd_allowlist]
        if limit is not None:
            ordered = sorted(eligible_meta, key=lambda item: item["slug"])
            if crd_allowlist is not None:
                ordered = [item for item in ordered if item["crd"] in crd_allowlist]
            wave_ids = [item["id"] for item in ordered[:limit]]
        if apply:
            if wave or crd_allowlist is not None or limit is not None:
                conn.execute(
                    """
                    UPDATE search_documents
                    SET indexable = true, updated_at = now()
                    WHERE entity_kind = 'firm' AND entity_id = ANY(%s::uuid[])
                    """,
                    (wave_ids,),
                )
            else:
                conn.execute(
                    """
                    UPDATE search_documents sd
                    SET indexable = (sd.entity_id = ANY(%s::uuid[])),
                        updated_at = now()
                    WHERE sd.entity_kind = 'firm'
                      AND EXISTS (
                        SELECT 1 FROM firms f
                        WHERE f.id = sd.entity_id AND f.is_synthetic = false
                      )
                    """,
                    (eligible_ids,),
                )
            conn.commit()

    report = {
        "total_official_firms": official,
        "trust_report_eligible": trust,
        "trust_report_ineligible": official - trust,
        "indexable_eligible": trust,
        "geo_discovery_eligible": geo,
        "currently_indexable": currently_indexable,
        "applied": apply,
        "wave": wave,
        "wave_size": len(wave_ids) if apply or wave or limit or crd_allowlist else 0,
        "classes": classes,
        "reasons": dict(sorted(reasons.items())),
    }
    out = ROOT / "data" / "reports" / "task-003-indexability.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
