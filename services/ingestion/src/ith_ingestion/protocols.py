from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

from ith_ingestion.types import (
    ChecksumResult,
    DownloadedArtifact,
    NormalizedRecord,
    ParsedRecord,
    PublishPlan,
    ResolutionDecision,
    SourceRef,
)


class Downloader(Protocol):
    def download(self, source: SourceRef) -> DownloadedArtifact: ...


class Checksummer(Protocol):
    def checksum(self, artifact: DownloadedArtifact, expected: str | None) -> ChecksumResult: ...


class Archiver(Protocol):
    def archive(self, artifact: DownloadedArtifact, source: SourceRef) -> str: ...


class Parser(Protocol):
    def parse(self, artifact: DownloadedArtifact) -> Sequence[ParsedRecord]: ...


class Validator(Protocol):
    def validate(self, records: Sequence[ParsedRecord]) -> Sequence[ParsedRecord]: ...


class Normalizer(Protocol):
    def normalize(self, records: Sequence[ParsedRecord]) -> Sequence[NormalizedRecord]: ...


class Resolver(Protocol):
    def resolve(self, records: Sequence[NormalizedRecord]) -> Sequence[ResolutionDecision]: ...


class Stager(Protocol):
    def stage(self, plan: PublishPlan) -> PublishPlan: ...


class Publisher(Protocol):
    def already_published(self, idempotency_key: str) -> bool: ...

    def publish(self, plan: PublishPlan, idempotency_key: str) -> int: ...


class Rollbacker(Protocol):
    def rollback(self, idempotency_key: str) -> None: ...


class ProvenanceRecorder(Protocol):
    def record(self, plan: PublishPlan, run_id: str) -> None: ...
