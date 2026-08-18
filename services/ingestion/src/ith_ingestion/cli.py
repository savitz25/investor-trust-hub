from __future__ import annotations

import argparse
import json
from pathlib import Path

from ith_ingestion.archive import utc_now
from ith_ingestion.env import load_local_env
from ith_ingestion.memory import (
    ConservativeResolver,
    FileChecksummer,
    IdentityParser,
    MemoryArchiver,
    MemoryDownloader,
    MemoryProvenanceRecorder,
    MemoryPublisher,
    MemoryRollbacker,
    MemoryStager,
    PassthroughNormalizer,
    RequiredFieldValidator,
)
from ith_ingestion.pipeline import IngestionPipeline, PipelineContext
from ith_ingestion.sec_adv.discover import discover_latest
from ith_ingestion.sec_adv.fixtures import write_standard_fixtures
from ith_ingestion.sec_adv.pipeline import run_sec_adv
from ith_ingestion.sec_adv.store import MemoryCanonicalStore
from ith_ingestion.types import DownloadedArtifact, SourceRef


def build_dev_pipeline(local_path: str) -> IngestionPipeline:
    artifact = DownloadedArtifact(
        uri=f"file://{local_path}",
        local_path=local_path,
        retrieved_at=utc_now(),
        content_type="text/plain",
    )
    publisher = MemoryPublisher()
    return IngestionPipeline(
        downloader=MemoryDownloader(artifact),
        checksummer=FileChecksummer(),
        archiver=MemoryArchiver(),
        parser=IdentityParser(),
        validator=RequiredFieldValidator(),
        normalizer=PassthroughNormalizer(),
        resolver=ConservativeResolver(),
        stager=MemoryStager(),
        publisher=publisher,
        rollbacker=MemoryRollbacker(publisher),
        provenance=MemoryProvenanceRecorder(),
    )


def _store(publish: bool):
    if not publish:
        return MemoryCanonicalStore()
    from ith_ingestion.sec_adv.postgres import PostgresCanonicalStore

    return PostgresCanonicalStore()


def main(argv: list[str] | None = None) -> int:
    load_local_env()
    parser = argparse.ArgumentParser(description="InvestorTrustHub ingestion CLI")
    sub = parser.add_subparsers(dest="command")

    proof = sub.add_parser("proof", help="Task 001 local proof fixture")
    proof.add_argument(
        "--fixture",
        default=str(Path(__file__).resolve().parents[2] / "fixtures" / "proof.txt"),
    )
    proof.add_argument("--release", default="dev-proof")

    sec = sub.add_parser("sec-adv", help="SEC Form ADV / IARD firm ingestion")
    sec_sub = sec.add_subparsers(dest="sec_command", required=True)
    sec_sub.add_parser("discover", help="Locate the latest official SEC RIA/ERA zips")

    ingest = sec_sub.add_parser("ingest", help="Parse, validate, and optionally publish")
    ingest.add_argument("--latest", action="store_true")
    ingest.add_argument("--dry-run", action="store_true")
    ingest.add_argument("--publish", action="store_true")
    ingest.add_argument("--fixture-dir", type=Path)
    ingest.add_argument("--ria-csv", type=Path)
    ingest.add_argument("--era-csv", type=Path)
    ingest.add_argument("--release-label", type=str)
    ingest.add_argument("--archive-dir", type=Path, default=Path("data/raw/sec/form-adv"))
    ingest.add_argument("--report", type=Path, default=Path("data/reports/sec-adv-latest.json"))

    sec_sub.add_parser("report", help="Print the latest written report")
    write_fix = sec_sub.add_parser("write-fixtures", help="Regenerate committed parser fixtures")
    write_fix.add_argument("--dir", type=Path, default=Path("services/ingestion/fixtures/sec_adv"))

    args = parser.parse_args(argv)
    if args.command in {None, "proof"}:
        fixture = getattr(args, "fixture", str(Path(__file__).resolve().parents[2] / "fixtures" / "proof.txt"))
        release = getattr(args, "release", "dev-proof")
        pipeline = build_dev_pipeline(fixture)
        result = pipeline.run(
            PipelineContext(
                source=SourceRef(
                    authority_id="synthetic",
                    system_id="synthetic_dev",
                    dataset_id="synthetic_fixtures",
                    release_label=release,
                )
            )
        )
        print(result.status.value, result.idempotency_key, result.metrics.as_dict())
        return 0 if result.status.value == "published" else 1

    if args.sec_command == "discover":
        latest = discover_latest()
        payload = {
            kind: {**item.__dict__, "published_on": item.published_on.isoformat()}
            for kind, item in latest.items()
        }
        print(json.dumps(payload, indent=2, default=str))
        return 0
    if args.sec_command == "write-fixtures":
        write_standard_fixtures(args.dir)
        print(f"wrote fixtures to {args.dir}")
        return 0
    if args.sec_command == "report":
        path = Path("data/reports/sec-adv-latest.json")
        if not path.exists():
            print("no report at", path)
            return 1
        print(path.read_text(encoding="utf-8"))
        return 0

    dry_run = args.dry_run or not args.publish
    report = run_sec_adv(
        latest=args.latest,
        dry_run=dry_run,
        publish=args.publish,
        fixture_dir=args.fixture_dir,
        archive_root=args.archive_dir,
        store=_store(args.publish),
        report_path=args.report,
        synthetic=args.fixture_dir is not None,
        ria_csv=args.ria_csv,
        era_csv=args.era_csv,
        release_label=args.release_label,
    )
    print(json.dumps(report.as_dict(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
