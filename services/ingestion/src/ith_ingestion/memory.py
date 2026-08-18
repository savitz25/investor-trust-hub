from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from ith_ingestion.checksum import verify_checksum
from ith_ingestion.errors import ValidationError
from ith_ingestion.types import (
    ChecksumResult,
    DownloadedArtifact,
    NormalizedRecord,
    ParsedRecord,
    PublishPlan,
    ResolutionDecision,
    SourceRef,
)


class MemoryDownloader:
    def __init__(self, artifact: DownloadedArtifact) -> None:
        self.artifact = artifact

    def download(self, source: SourceRef) -> DownloadedArtifact:
        del source
        return self.artifact


class FileChecksummer:
    def checksum(self, artifact: DownloadedArtifact, expected: str | None) -> ChecksumResult:
        return verify_checksum(artifact.local_path, expected)


class MemoryArchiver:
    def __init__(self) -> None:
        self.archived: list[str] = []

    def archive(self, artifact: DownloadedArtifact, source: SourceRef) -> str:
        uri = f"archive://{source.dataset_id}/{source.release_label}/{artifact.local_path}"
        self.archived.append(uri)
        return uri


class IdentityParser:
    """Treat each non-empty line as a record. Harmless development parser."""

    def parse(self, artifact: DownloadedArtifact) -> Sequence[ParsedRecord]:
        records: list[ParsedRecord] = []
        with open(artifact.local_path, encoding="utf-8") as handle:
            for index, line in enumerate(handle, start=1):
                value = line.strip()
                if not value or value.startswith("#"):
                    continue
                records.append(
                    ParsedRecord(
                        source_record_identifier=f"line-{index}",
                        payload={"value": value, "line": index},
                    )
                )
        return records


class RequiredFieldValidator:
    def validate(self, records: Sequence[ParsedRecord]) -> Sequence[ParsedRecord]:
        issues: list[str] = []
        valid: list[ParsedRecord] = []
        for record in records:
            if not record.source_record_identifier:
                issues.append("missing source_record_identifier")
                continue
            if "value" not in record.payload:
                issues.append(f"{record.source_record_identifier}: missing value")
                continue
            valid.append(record)
        if issues and not valid:
            raise ValidationError("no valid records", issues)
        return valid


class PassthroughNormalizer:
    transform_version = "task-001-foundation"

    def normalize(self, records: Sequence[ParsedRecord]) -> Sequence[NormalizedRecord]:
        normalized: list[NormalizedRecord] = []
        for record in records:
            value = str(record.payload["value"])
            normalized.append(
                NormalizedRecord(
                    source_record_identifier=record.source_record_identifier,
                    subject_kind="other",
                    natural_key=value,
                    fields={"value": value},
                    raw_value=dict(record.payload),
                    transform_version=self.transform_version,
                )
            )
        return normalized


class ConservativeResolver:
    """Never merge uncertain identities. Prefer no match."""

    def resolve(self, records: Sequence[NormalizedRecord]) -> Sequence[ResolutionDecision]:
        return [
            ResolutionDecision(
                natural_key=record.natural_key,
                entity_id=None,
                method="no_match_create_new",
                confidence=1.0,
                create_new=True,
            )
            for record in records
        ]


class MemoryStager:
    def __init__(self) -> None:
        self.staged: PublishPlan | None = None

    def stage(self, plan: PublishPlan) -> PublishPlan:
        self.staged = plan
        return plan


class MemoryPublisher:
    def __init__(self) -> None:
        self.published_keys: set[str] = set()
        self.records_by_key: dict[str, list[str]] = {}

    def already_published(self, idempotency_key: str) -> bool:
        return idempotency_key in self.published_keys

    def publish(self, plan: PublishPlan, idempotency_key: str) -> int:
        if idempotency_key in self.published_keys:
            return 0
        keys = [record.natural_key for record in plan.records]
        self.records_by_key[idempotency_key] = keys
        self.published_keys.add(idempotency_key)
        return len(keys)


class MemoryRollbacker:
    def __init__(self, publisher: MemoryPublisher) -> None:
        self.publisher = publisher

    def rollback(self, idempotency_key: str) -> None:
        self.publisher.published_keys.discard(idempotency_key)
        self.publisher.records_by_key.pop(idempotency_key, None)


class MemoryProvenanceRecorder:
    def __init__(self) -> None:
        self.events: list[tuple[str, int, datetime]] = []

    def record(self, plan: PublishPlan, run_id: str) -> None:
        self.events.append((run_id, len(plan.records), datetime.now(UTC)))
