from __future__ import annotations

import hashlib
from pathlib import Path

from ith_ingestion.errors import ChecksumMismatchError
from ith_ingestion.types import ChecksumResult


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def verify_checksum(
    path: str | Path,
    expected: str | None = None,
    *,
    algorithm: str = "sha256",
) -> ChecksumResult:
    if algorithm != "sha256":
        raise ValueError(f"unsupported checksum algorithm: {algorithm}")
    result = ChecksumResult(
        algorithm=algorithm,
        hex_digest=sha256_file(path),
        expected=expected,
    )
    if not result.matches:
        raise ChecksumMismatchError(
            f"checksum mismatch for {path}: expected {expected}, got {result.hex_digest}"
        )
    return result
