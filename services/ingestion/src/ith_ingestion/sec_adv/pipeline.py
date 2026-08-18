from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from time import perf_counter

from ith_ingestion.archive import utc_now
from ith_ingestion.errors import IngestionError
from ith_ingestion.sec_adv import (
    PARSER_VERSION,
    PIPELINE_VERSION,
    TRANSFORM_VERSION,
)
from ith_ingestion.sec_adv.discover import discover_latest, parse_filename_date
from ith_ingestion.sec_adv.download import materialize_release_file
from ith_ingestion.sec_adv.models import (
    DiscoveredFile,
    NormalizedFirm,
    QuarantineItem,
    ReleaseFile,
    ReleaseReport,
)
from ith_ingestion.sec_adv.normalize import normalize_rows
from ith_ingestion.sec_adv.parse import parse_csv
from ith_ingestion.sec_adv.quality import distribution, evaluate_quality
from ith_ingestion.sec_adv.store import CanonicalStore, MemoryCanonicalStore, PublishCounts


def idempotency_key(release_label: str) -> str:
    return f"sec-adv:{release_label}:{TRANSFORM_VERSION}"


def _discover_from_local(fixture_dir: Path) -> dict[str, DiscoveredFile]:
    files: dict[str, DiscoveredFile] = {}
    mapping = {"ria": "ria.csv", "era": "era.csv"}
    for kind, name in mapping.items():
        path = fixture_dir / name
        if not path.exists():
            raise IngestionError(f"missing fixture {path}")
        published = parse_filename_date(path.name) or utc_now().date()
        files[kind] = DiscoveredFile(
            dataset_kind=kind,  # type: ignore[arg-type]
            dataset_id="sec_ia_ria" if kind == "ria" else "sec_ia_era",
            title=f"fixture {kind}",
            url=path.resolve().as_uri(),
            filename=path.name,
            published_on=published,
            release_label="fixture-task-002",
        )
    return files


def _copy_local_csv(discovered: DiscoveredFile, archive_root: Path, source_csv: Path) -> ReleaseFile:
    from ith_ingestion.checksum import sha256_file

    dest_dir = archive_root / discovered.release_label / discovered.dataset_kind
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / source_csv.name
    dest.write_bytes(source_csv.read_bytes())
    retrieved = utc_now()
    digest = sha256_file(dest)
    return ReleaseFile(
        discovered=discovered,
        local_zip="",
        local_csv=str(dest),
        csv_filename=dest.name,
        zip_bytes=0,
        csv_bytes=dest.stat().st_size,
        zip_sha256="",
        csv_sha256=digest,
        retrieved_at=retrieved,
    )


def run_sec_adv(
    *,
    latest: bool = False,
    dry_run: bool = True,
    publish: bool = False,
    fixture_dir: Path | None = None,
    archive_root: Path | None = None,
    store: CanonicalStore | None = None,
    report_path: Path | None = None,
    synthetic: bool | None = None,
    previous_total: int | None = None,
    ria_csv: Path | None = None,
    era_csv: Path | None = None,
    release_label: str | None = None,
) -> ReleaseReport:
    started = perf_counter()
    timings: dict[str, float] = {}
    archive_root = archive_root or Path("data/raw/sec/form-adv")
    store = store or MemoryCanonicalStore()
    is_fixture = fixture_dir is not None
    if synthetic is None:
        synthetic = is_fixture

    mark = perf_counter()
    if ria_csv is not None and era_csv is not None:
        label = release_label or "local-csv"
        discovered = {
            "ria": DiscoveredFile(
                "ria",
                "sec_ia_ria",
                "local RIA CSV",
                Path(ria_csv).resolve().as_uri(),
                Path(ria_csv).name,
                utc_now().date(),
                label,
            ),
            "era": DiscoveredFile(
                "era",
                "sec_ia_era",
                "local ERA CSV",
                Path(era_csv).resolve().as_uri(),
                Path(era_csv).name,
                utc_now().date(),
                label,
            ),
        }
        local_csvs = {"ria": Path(ria_csv), "era": Path(era_csv)}
    elif fixture_dir is not None:
        discovered = _discover_from_local(fixture_dir)
        local_csvs = None
    elif latest:
        discovered = discover_latest()
        local_csvs = None
    else:
        raise IngestionError("specify --latest, --fixture-dir, or both --ria-csv and --era-csv")
    timings["discover"] = perf_counter() - mark

    release_label = release_label or max(item.release_label for item in discovered.values())
    key = idempotency_key(release_label)
    if store.already_published(key) and publish:
        report = ReleaseReport(
            release_label=release_label,
            transform_version=TRANSFORM_VERSION,
            retrieved_at=utc_now().isoformat(),
            source={"release": release_label, "already_published": True},
            records={},
            publish={"already_published": True},
            quality={},
            distribution={},
            performance={"total_seconds": round(perf_counter() - started, 3)},
            already_published=True,
            dry_run=False,
        )
        _write_report(report, report_path)
        return report

    mark = perf_counter()
    files: dict[str, ReleaseFile] = {}
    parsed_rows: dict[str, list] = {}
    for kind, item in discovered.items():
        if local_csvs is not None:
            files[kind] = _copy_local_csv(item, archive_root, local_csvs[kind])
        elif fixture_dir is not None:
            files[kind] = _copy_local_csv(item, archive_root, fixture_dir / f"{kind}.csv")
        else:
            files[kind] = materialize_release_file(item, archive_root)
        _, rows = parse_csv(files[kind].local_csv, kind)  # type: ignore[arg-type]
        parsed_rows[kind] = rows
    timings["download_parse"] = perf_counter() - mark

    mark = perf_counter()
    all_parsed = [*parsed_rows.get("ria", []), *parsed_rows.get("era", [])]
    normalized, quarantine = normalize_rows(all_parsed)
    evaluate_quality(
        ria_rows=len(parsed_rows.get("ria", [])),
        era_rows=len(parsed_rows.get("era", [])),
        normalized=normalized,
        quarantine=quarantine,
        previous_total=previous_total,
    )
    timings["validate_normalize"] = perf_counter() - mark

    counts = PublishCounts()
    if publish and not dry_run:
        mark = perf_counter()
        try:
            counts = store.publish(
                release_label=release_label,
                firms=normalized,
                quarantine=quarantine,
                synthetic=synthetic,
            )
            store.mark_published(key)
        except Exception:
            store.rollback(key)
            raise
        timings["publish"] = perf_counter() - mark
    else:
        counts = _plan_counts(normalized, quarantine)

    report = build_report(
        release_label=release_label,
        files=files,
        normalized=normalized,
        quarantine=quarantine,
        counts=counts,
        dry_run=dry_run or not publish,
        timings=timings,
        total_seconds=perf_counter() - started,
    )
    _write_report(report, report_path)
    return report


def _plan_counts(normalized: list[NormalizedFirm], quarantine: list[QuarantineItem]) -> PublishCounts:
    return PublishCounts(
        firms_inserted=len({firm.crd for firm in normalized}),
        identifiers_created=len({firm.crd for firm in normalized})
        + len({firm.sec_file_number for firm in normalized if firm.sec_file_number}),
        registrations_upserted=len(normalized),
        locations_upserted=len(normalized),
        evidence_created=len(normalized) * 7,
        snapshots_created=len({firm.crd for firm in normalized}),
        observations_created=len(normalized),
        facts_upserted=len(normalized),
        search_documents_upserted=len({firm.crd for firm in normalized}),
        quarantined=len(quarantine),
    )


def build_report(
    *,
    release_label: str,
    files: dict[str, ReleaseFile],
    normalized: list[NormalizedFirm],
    quarantine: list[QuarantineItem],
    counts: PublishCounts,
    dry_run: bool,
    timings: dict[str, float],
    total_seconds: float,
) -> ReleaseReport:
    ria = [firm for firm in normalized if firm.dataset_kind == "ria"]
    era = [firm for firm in normalized if firm.dataset_kind == "era"]
    ria_crds = {firm.crd for firm in ria}
    era_crds = {firm.crd for firm in era}
    reasons = Counter(item.reason_code for item in quarantine)
    source_meta = {
        kind: {
            "dataset": file.discovered.dataset_id,
            "title": file.discovered.title,
            "url": file.discovered.url,
            "filename": file.discovered.filename,
            "csv_filename": file.csv_filename,
            "bytes_zip": file.zip_bytes,
            "bytes_csv": file.csv_bytes,
            "sha256_zip": file.zip_sha256,
            "sha256_csv": file.csv_sha256,
            "retrieved_at": file.retrieved_at.isoformat(),
            "published_on": file.discovered.published_on.isoformat(),
        }
        for kind, file in files.items()
    }
    return ReleaseReport(
        release_label=release_label,
        transform_version=TRANSFORM_VERSION,
        retrieved_at=utc_now().isoformat(),
        source={
            "catalog": "https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers",
            "parser_version": PARSER_VERSION,
            "pipeline_version": PIPELINE_VERSION,
            "files": source_meta,
        },
        records={
            "ria_source_rows": len(ria),
            "era_source_rows": len(era),
            "total_normalized": len(normalized),
            "unique_crds": len(ria_crds | era_crds),
            "duplicate_crds_quarantined": reasons.get("duplicate_crd", 0),
            "overlap_ria_era": len(ria_crds & era_crds),
        },
        publish=counts.as_dict(),
        quality={
            "quarantined_rows": len(quarantine),
            "rejection_reasons": dict(reasons),
            "null_sec_file_numbers": sum(1 for firm in normalized if not firm.sec_file_number),
            "malformed_crds": reasons.get("malformed_crd", 0),
            "missing_crds": reasons.get("missing_crd", 0),
        },
        distribution=distribution(normalized),
        performance={**{key: round(value, 3) for key, value in timings.items()}, "total_seconds": round(total_seconds, 3)},
        dry_run=dry_run,
    )


def _write_report(report: ReleaseReport, report_path: Path | None) -> None:
    if report_path is None:
        return
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report.as_dict(), indent=2), encoding="utf-8")
