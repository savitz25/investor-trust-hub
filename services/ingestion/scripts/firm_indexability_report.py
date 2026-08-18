"""Dry-run / apply the firm indexability gate. Mass apply requires --all-eligible."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ith_ingestion.wave_select import (  # noqa: E402
    ALGORITHM_VERSION,
    WAVE_1_ID,
    WAVE_1_SIZE,
    sample_crds_for_qa,
    select_wave,
    summarize_wave,
)
from load_env import load_local_env  # noqa: E402

US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI",
    "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN",
    "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH",
    "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA",
    "WI", "WV", "WY",
}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Firm Trust Report indexability operator tool")
    parser.add_argument("--apply", action="store_true", help="Write search_documents.indexable")
    parser.add_argument("--all-eligible", action="store_true", help="Required to mark every eligible firm")
    parser.add_argument("--wave", action="store_true", help="Select a deterministic wave (use --wave-size)")
    parser.add_argument("--wave-size", type=int, default=None, help=f"Wave size (Wave 1 default {WAVE_1_SIZE})")
    parser.add_argument("--wave-id", default=WAVE_1_ID)
    parser.add_argument("--crds", default="", help="Comma-separated CRD allowlist")
    parser.add_argument("--limit", type=int, default=None, help="Legacy slug-order cap; prefer --wave-size")
    parser.add_argument("--rollback", action="store_true", help="Set indexable=false for a wave manifest")
    parser.add_argument("--manifest", default="", help="Manifest path for apply/rollback")
    return parser.parse_args(argv)


def _classify(registration_type: str | None, status: str | None) -> str | None:
    if registration_type == "exempt_reporting_adviser":
        return "exempt_reporting_adviser"
    if registration_type == "registered_investment_adviser" and status == "pending":
        return "pending_120_day"
    if registration_type == "registered_investment_adviser" and status == "registered":
        return "reported_as_registered"
    return None


def _eligible_row(row: dict) -> tuple[list[str], str | None]:
    codes: list[str] = []
    if not row["crd"]:
        codes.append("missing_crd")
    elif not str(row["crd"]).isdigit():
        codes.append("malformed_crd")
    if not (row["legal_name"] or row["display_name"]):
        codes.append("missing_name")
    classification = _classify(row["registration_type"], row["status"])
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
    return codes, classification


def _manifest_dir() -> Path:
    path = ROOT / "data" / "reports" / "waves"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _write_manifest(payload: dict, path: Path) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    load_local_env(ROOT)
    args = parse_args(sys.argv[1:] if argv is None else argv)
    import os

    import psycopg

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1

    crd_allowlist = {part.strip() for part in args.crds.split(",") if part.strip()} or None
    wave_size = args.wave_size
    if args.wave and wave_size is None:
        wave_size = WAVE_1_SIZE
    want_wave = args.wave or wave_size is not None

    if args.apply and not args.rollback and not want_wave and crd_allowlist is None and not args.all_eligible:
        print(
            "Refusing --apply without --wave-size, --crds, or --all-eligible. "
            "Mass-enabling every eligible firm requires --all-eligible."
        )
        return 2

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
    eligible: list[dict] = []
    reasons: dict[str, int] = {}
    official = 0
    currently_indexable = 0
    geo = 0
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        rows = conn.execute(sql).fetchall()
        cols = [
            "id", "slug", "is_synthetic", "legal_name", "display_name", "crd",
            "sec_file_number", "registration_type", "status", "city", "region",
            "postal_code", "organization_form", "website", "raum_amount",
            "dataset_kind", "release_label", "observed", "evidence_count",
            "snapshot_count", "indexable",
        ]
        for raw in rows:
            row = dict(zip(cols, raw, strict=True))
            official += 1
            codes, classification = _eligible_row(row)
            if row["indexable"]:
                currently_indexable += 1
            if not codes:
                if (row["region"] or "") in US_STATES:
                    geo += 1
                else:
                    codes.append("missing_usable_us_state")
                eligible.append(
                    {
                        "id": str(row["id"]),
                        "crd": str(row["crd"] or ""),
                        "slug": row["slug"] or "",
                        "classification": classification,
                        "region": row["region"] or "",
                        "release_label": row["release_label"] or "",
                    }
                )
            for code in codes:
                if code != "missing_usable_us_state" or not (row["legal_name"] or row["display_name"]):
                    reasons[code] = reasons.get(code, 0) + 1

        if args.rollback:
            manifest_path = Path(args.manifest) if args.manifest else _manifest_dir() / f"{args.wave_id}.json"
            if not manifest_path.exists():
                print(f"Manifest not found: {manifest_path}")
                return 1
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            crds = [str(item) for item in manifest.get("crds", [])]
            if args.apply:
                conn.execute(
                    """
                    UPDATE search_documents sd
                    SET indexable = false, updated_at = now()
                    FROM firms f
                    JOIN firm_identifiers crd
                      ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
                    WHERE sd.entity_id = f.id
                      AND sd.entity_kind = 'firm'
                      AND crd.identifier_value = ANY(%s)
                    """,
                    (crds,),
                )
                conn.commit()
            report = {
                "rollback": True,
                "applied": args.apply,
                "wave_id": manifest.get("wave_id"),
                "crd_count": len(crds),
                "manifest": str(manifest_path),
            }
            print(json.dumps(report, indent=2))
            return 0

        selected = list(eligible)
        if crd_allowlist is not None:
            selected = [item for item in selected if item["crd"] in crd_allowlist]
        if want_wave:
            selected = select_wave(selected, wave_size if wave_size is not None else WAVE_1_SIZE)
        elif args.limit is not None:
            selected = sorted(selected, key=lambda item: item["slug"])[: args.limit]

        ineligible_selected = 0
        wave_ids = [item["id"] for item in selected]
        if args.apply:
            if args.all_eligible and not want_wave and crd_allowlist is None:
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
                    ([item["id"] for item in eligible],),
                )
            else:
                conn.execute(
                    """
                    UPDATE search_documents
                    SET indexable = true, updated_at = now()
                    WHERE entity_kind = 'firm' AND entity_id = ANY(%s::uuid[])
                    """,
                    (wave_ids,),
                )
            conn.commit()

    summary = summarize_wave(selected)
    class_counts = {
        "reported_as_registered": 0,
        "pending_120_day": 0,
        "exempt_reporting_adviser": 0,
    }
    for item in eligible:
        key = item.get("classification")
        if key in class_counts:
            class_counts[key] += 1
    releases = sorted({item["release_label"] for item in selected if item.get("release_label")})
    manifest = {
        "wave_id": args.wave_id,
        "algorithm": ALGORITHM_VERSION,
        "created_at": datetime.now(UTC).isoformat(),
        "source_release": releases[0] if len(releases) == 1 else releases,
        "eligible_universe": len(eligible),
        "selected_count": summary["selected_count"],
        "remaining_noindex": official - (currently_indexable if not args.apply else summary["selected_count"]),
        "classes": summary["classes"],
        "state_distribution": summary["state_distribution"],
        "missing_state": summary["missing_state"],
        "duplicate_crds": summary["duplicate_crds"],
        "ineligible_selected": ineligible_selected,
        "qa_sample_crds": sample_crds_for_qa(selected, 30),
        "crds": summary["crds"],
        "applied": args.apply,
        "all_eligible": args.all_eligible,
    }
    manifest_path = Path(args.manifest) if args.manifest else _manifest_dir() / f"{args.wave_id}.json"
    if want_wave or crd_allowlist is not None:
        _write_manifest(manifest, manifest_path)

    report = {
        "total_official_firms": official,
        "trust_report_eligible": len(eligible),
        "trust_report_ineligible": official - len(eligible),
        "indexable_eligible": len(eligible),
        "geo_discovery_eligible": geo,
        "currently_indexable": currently_indexable,
        "applied": args.apply,
        "wave": want_wave,
        "wave_id": args.wave_id if want_wave else None,
        "wave_size": summary["selected_count"] if want_wave or crd_allowlist else 0,
        "algorithm": ALGORITHM_VERSION if want_wave else None,
        "classes": class_counts,
        "wave_classes": summary["classes"] if want_wave else {},
        "missing_state": summary["missing_state"] if want_wave else None,
        "duplicate_crds": summary["duplicate_crds"],
        "ineligible_selected": ineligible_selected,
        "manifest": str(manifest_path) if want_wave or crd_allowlist else None,
        "qa_sample_crds": manifest["qa_sample_crds"] if want_wave else [],
        "reasons": dict(sorted(reasons.items())),
    }
    out = ROOT / "data" / "reports" / "task-003-indexability.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
