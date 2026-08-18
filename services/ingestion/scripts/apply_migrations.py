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
    if names[: len(expected_prefix)] != expected_prefix:
        raise SystemExit(f"Task 001 migrations missing or reordered: {names}")
    if names != sorted(names):
        raise SystemExit(f"migrations must stay sorted: {names}")
    required_tokens = {
        "0004_evidence.sql": "evidence_records",
        "0005_canonical_entities.sql": "CREATE TABLE people",
        "0008_search.sql": "search_documents",
        "0010_sec_adv_ingestion.sql": "form_adv_firm_facts",
    }
    for name, token in required_tokens.items():
        text = (root / "database" / "migrations" / name).read_text(encoding="utf-8")
        if token not in text:
            raise SystemExit(f"{name} missing expected token {token}")
    return names


def _split_sql(script: str) -> list[str]:
    statements: list[str] = []
    buf: list[str] = []
    dollar: str | None = None
    i = 0
    while i < len(script):
        ch = script[i]
        if dollar:
            end = script.find(dollar, i)
            if end == -1:
                buf.append(script[i:])
                break
            buf.append(script[i : end + len(dollar)])
            i = end + len(dollar)
            dollar = None
            continue
        if ch == "'":
            end = i + 1
            while end < len(script):
                if script[end] == "'" and (end + 1 >= len(script) or script[end + 1] != "'"):
                    end += 1
                    break
                if script[end] == "'" and script[end + 1] == "'":
                    end += 2
                    continue
                end += 1
            buf.append(script[i:end])
            i = end
            continue
        if ch == "$":
            match_end = script.find("$", i + 1)
            tag = script[i : match_end + 1] if match_end != -1 else "$"
            if match_end != -1 and all(c.isalnum() or c == "_" for c in script[i + 1 : match_end]):
                dollar = tag
                buf.append(tag)
                i = match_end + 1
                continue
        if ch == ";":
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


def apply_with_psycopg(root: Path, database_url: str) -> None:
    import psycopg

    with psycopg.connect(database_url, connect_timeout=20) as conn:
        for path in migration_files(root):
            for statement in _split_sql(path.read_text(encoding="utf-8")):
                conn.execute(statement)
        conn.commit()


def apply_with_psql(root: Path, database_url: str) -> None:
    import shutil
    import subprocess

    if shutil.which("psql") is None:
        apply_with_psycopg(root, database_url)
        return
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
