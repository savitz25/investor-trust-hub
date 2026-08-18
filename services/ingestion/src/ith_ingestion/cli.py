from __future__ import annotations

import argparse
from pathlib import Path

from ith_ingestion.archive import utc_now
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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="InvestorTrustHub ingestion foundation CLI")
    parser.add_argument(
        "--fixture",
        default=str(Path(__file__).resolve().parents[2] / "fixtures" / "proof.txt"),
        help="Local proof fixture (not a regulatory dataset)",
    )
    parser.add_argument("--release", default="dev-proof")
    args = parser.parse_args(argv)

    pipeline = build_dev_pipeline(args.fixture)
    result = pipeline.run(
        PipelineContext(
            source=SourceRef(
                authority_id="synthetic",
                system_id="synthetic_dev",
                dataset_id="synthetic_fixtures",
                release_label=args.release,
            )
        )
    )
    print(result.status.value, result.idempotency_key, result.metrics.as_dict())
    return 0 if result.status.value == "published" else 1


if __name__ == "__main__":
    raise SystemExit(main())
