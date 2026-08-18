"""Apply versioned SQL migrations in order. Does not invent schema."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def migration_files(root: Path) -> list[Path]:
    return sorted((root / "database" / "migrations").glob("*.sql"))


def validate_migration_set(root: Path) -> list[str]:
    files = migration_files(root)
    if not files:
        raise SystemExit("no migrations found")
    names = [path.name for path in files]
    expected_prefix = [
        "0001_extensions.sql",
        "0002_source_registry.sql",
        "0003_ingestion.sql",
        "0004_evidence.sql",
        "0005_canonical_entities.sql",
        "0006_registrations_relationships.sql",
        "0007_filings_disclosures.sql",
        "0008_search.sql",
        "0009_future_user_rls.sql",
    ]
    if names != expected_prefix:
        raise SystemExit(f"unexpected migration set: {names}")
    required_tokens = {
        "0004_evidence.sql": "evidence_records",
        "0005_canonical_entities.sql": "CREATE TABLE people",
        "0008_search.sql": "search_documents",
    }
    for name, token in required_tokens.items():
        text = (root / "database" / "migrations" / name).read_text(encoding="utf-8")
        if token not in text:
            raise SystemExit(f"{name} missing expected token {token}")
    return names


def apply_with_psql(root: Path, database_url: str) -> None:
    import subprocess

    for path in migration_files(root):
        completed = subprocess.run(
            ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
            check=False,
        )
        if completed.returncode != 0:
            raise SystemExit(f"migration failed: {path.name}")


def main() -> int:
    root = Path(__file__).resolve().parents[3]
    names = validate_migration_set(root)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url or "--check-only" in sys.argv:
        print("migrations ok:", ", ".join(names))
        return 0
    apply_with_psql(root, database_url)
    print("applied", ", ".join(names))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
