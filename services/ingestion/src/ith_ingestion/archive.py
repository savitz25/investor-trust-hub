from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path


def archive_artifact(local_path: str | Path, archive_dir: str | Path, release_label: str) -> str:
    source = Path(local_path)
    destination_dir = Path(archive_dir) / release_label
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / source.name
    if destination.exists():
        return str(destination)
    shutil.copy2(source, destination)
    return str(destination)


def utc_now() -> datetime:
    return datetime.now(UTC)
