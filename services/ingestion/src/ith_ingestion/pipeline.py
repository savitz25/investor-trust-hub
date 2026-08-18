from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

from ith_ingestion.errors import IngestionError
from ith_ingestion.protocols import (
    Archiver,
    Checksummer,
    Downloader,
    Normalizer,
    Parser,
    ProvenanceRecorder,
    Publisher,
    Resolver,
    Rollbacker,
    Stager,
    Validator,
)
from ith_ingestion.types import (
    IngestionMetrics,
    IngestionResult,
    PublishPlan,
    RunStatus,
    SourceRef,
)


@dataclass
class PipelineContext:
    source: SourceRef
    expected_checksum: str | None = None
    pipeline_version: str = "0.1.0"
    transform_version: str = "task-001-foundation"

    @property
    def idempotency_key(self) -> str:
        return (
            f"{self.source.system_id}:{self.source.dataset_id}:"
            f"{self.source.release_label}:{self.transform_version}"
        )


@dataclass
class IngestionPipeline:
    downloader: Downloader
    checksummer: Checksummer
    archiver: Archiver
    parser: Parser
    validator: Validator
    normalizer: Normalizer
    resolver: Resolver
    stager: Stager
    publisher: Publisher
    rollbacker: Rollbacker
    provenance: ProvenanceRecorder
    metrics: IngestionMetrics = field(default_factory=IngestionMetrics)

    def run(self, context: PipelineContext) -> IngestionResult:
        run_id = str(uuid4())
        key = context.idempotency_key
        metrics = IngestionMetrics()

        if self.publisher.already_published(key):
            return IngestionResult(
                run_id=run_id,
                status=RunStatus.PUBLISHED,
                idempotency_key=key,
                metrics=metrics,
                already_published=True,
            )

        try:
            artifact = self.downloader.download(context.source)
            self.checksummer.checksum(artifact, context.expected_checksum)
            self.archiver.archive(artifact, context.source)
            parsed = list(self.parser.parse(artifact))
            metrics.records_seen = len(parsed)
            valid = list(self.validator.validate(parsed))
            metrics.records_valid = len(valid)
            normalized = list(self.normalizer.normalize(valid))
            resolutions = list(self.resolver.resolve(normalized))
            plan = self.stager.stage(
                PublishPlan(records=list(normalized), resolutions=list(resolutions))
            )
            published = self.publisher.publish(plan, key)
            metrics.records_published = published
            if published == 0 and self.publisher.already_published(key):
                metrics.records_skipped_duplicate = metrics.records_valid
            self.metrics = metrics
            self.provenance.record(plan, run_id)
            return IngestionResult(
                run_id=run_id,
                status=RunStatus.PUBLISHED,
                idempotency_key=key,
                metrics=metrics,
            )
        except IngestionError as exc:
            metrics.errors += 1
            self.metrics = metrics
            self.rollbacker.rollback(key)
            return IngestionResult(
                run_id=run_id,
                status=RunStatus.FAILED,
                idempotency_key=key,
                metrics=metrics,
                error=str(exc),
            )
