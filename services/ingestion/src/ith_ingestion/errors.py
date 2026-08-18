from __future__ import annotations


class IngestionError(Exception):
    """Base ingestion failure."""


class ChecksumMismatchError(IngestionError):
    pass


class ValidationError(IngestionError):
    def __init__(self, message: str, issues: list[str] | None = None) -> None:
        super().__init__(message)
        self.issues = issues or []


class DuplicateReleaseError(IngestionError):
    pass


class ResolutionError(IngestionError):
    pass


class PublishError(IngestionError):
    pass
