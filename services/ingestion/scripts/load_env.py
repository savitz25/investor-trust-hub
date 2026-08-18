"""Load env.local.txt / env.local without printing values."""

from __future__ import annotations

import os
from pathlib import Path


def load_local_env(root: Path | None = None) -> None:
    root = root or Path.cwd()
    for name in ("env.local", "env.local.txt", ".env.local", ".env"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if not text or text.startswith("#") or "=" not in text:
                continue
            key, value = text.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)
        break
    if not os.environ.get("INGESTION_DATABASE_URL") and os.environ.get("DATABASE_URL"):
        os.environ["INGESTION_DATABASE_URL"] = os.environ["DATABASE_URL"]
