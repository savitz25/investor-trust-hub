from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class StageName(StrEnum):
    DOWNLOAD = "download"
    CHECKSUM = "checksum"
    ARCHIVE = "archive"
    PARSE = "parse"
    VALIDATE = "validate"
    NORMALIZE = "normalize"
    RESOLVE = "resolve"
    STAGE = "stage"
    PUBLISH = "publish"
    ROLLBACK = "rollback"
    PROVENANCE = "provenance"


class RunStatus(StrEnum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    CHECKSUM = "checksum"
    ARCHIVING = "archiving"
    PARSING = "parsing"
    VALIDATING = "validating"
    NORMALIZING = "normalizing"
    RESOLVING = "resolving"
    STAGING = "staging"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass(frozen=True)
class SourceRef:
    authority_id: str
    system_id: str
    dataset_id: str
    release_label: str


@dataclass
class DownloadedArtifact:
    uri: str
    local_path: str
    retrieved_at: datetime
    content_type: str | None = None
    byte_size: int | None = None


@dataclass
class ChecksumResult:
    algorithm: str
    hex_digest: str
    expected: str | None = None

    @property
    def matches(self) -> bool:
        if self.expected is None:
            return True
        return self.hex_digest.lower() == self.expected.lower()


@dataclass
class ParsedRecord:
    source_record_identifier: str
    payload: Mapping[str, Any]


@dataclass
class NormalizedRecord:
    source_record_identifier: str
    subject_kind: str
    natural_key: str
    fields: Mapping[str, Any]
    raw_value: Mapping[str, Any]
    transform_version: str


@dataclass
class ResolutionDecision:
    natural_key: str
    entity_id: str | None
    method: str
    confidence: float
    create_new: bool

    def __post_init__(self) -> None:
        if not 0 <= self.confidence <= 1:
            raise ValueError("confidence must be between 0 and 1")
        if self.confidence < 0.95 and self.entity_id and not self.create_new:
            # Prefer no match to the wrong match.
            raise ValueError("refusing low-confidence identity merge")


@dataclass
class PublishPlan:
    records: list[NormalizedRecord] = field(default_factory=list)
    resolutions: list[ResolutionDecision] = field(default_factory=list)


@dataclass
class IngestionMetrics:
    records_seen: int = 0
    records_valid: int = 0
    records_published: int = 0
    records_skipped_duplicate: int = 0
    errors: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "records_seen": self.records_seen,
            "records_valid": self.records_valid,
            "records_published": self.records_published,
            "records_skipped_duplicate": self.records_skipped_duplicate,
            "errors": self.errors,
        }


@dataclass
class IngestionResult:
    run_id: str
    status: RunStatus
    idempotency_key: str
    metrics: IngestionMetrics
    error: str | None = None
    already_published: bool = False
