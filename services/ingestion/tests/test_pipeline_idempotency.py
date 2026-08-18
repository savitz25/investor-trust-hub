from pathlib import Path

import pytest

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
from ith_ingestion.types import DownloadedArtifact, ResolutionDecision, RunStatus, SourceRef


def _pipeline(path: Path) -> tuple[IngestionPipeline, MemoryPublisher]:
    artifact = DownloadedArtifact(
        uri=str(path),
        local_path=str(path),
        retrieved_at=utc_now(),
    )
    publisher = MemoryPublisher()
    pipeline = IngestionPipeline(
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
    return pipeline, publisher


def test_same_release_does_not_duplicate(tmp_path: Path) -> None:
    fixture = tmp_path / "proof.txt"
    fixture.write_text("SYN-PROOF-A\nSYN-PROOF-B\n", encoding="utf-8")
    pipeline, publisher = _pipeline(fixture)
    context = PipelineContext(
        source=SourceRef("synthetic", "synthetic_dev", "synthetic_fixtures", "rel-1")
    )
    first = pipeline.run(context)
    second = pipeline.run(context)
    assert first.status == RunStatus.PUBLISHED
    assert first.metrics.records_published == 2
    assert second.already_published is True
    assert second.metrics.records_published == 0
    assert publisher.records_by_key[context.idempotency_key] == ["SYN-PROOF-A", "SYN-PROOF-B"]


def test_resolver_refuses_low_confidence_merge() -> None:
    with pytest.raises(ValueError, match="low-confidence"):
        ResolutionDecision(
            natural_key="x",
            entity_id="existing",
            method="fuzzy_name",
            confidence=0.4,
            create_new=False,
        )
