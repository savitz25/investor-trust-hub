"""Compatibility wrapper so operator scripts can import load_local_env."""

from __future__ import annotations

import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from ith_ingestion.env import (  # noqa: E402
    find_repo_root,
    load_local_env,
    redact_database_url,
    resolve_database_url,
)

__all__ = [
    "find_repo_root",
    "load_local_env",
    "redact_database_url",
    "resolve_database_url",
]
