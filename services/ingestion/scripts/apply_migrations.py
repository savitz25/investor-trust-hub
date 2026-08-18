"""Apply versioned SQL migrations in order. Does not invent schema."""

from __future__ import annotations

import os
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
from load_env import find_repo_root, load_local_env  # noqa: E402


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
        "0011_firm_research_search.sql": "search_documents_slug_idx",
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


def _applied_filenames(conn) -> list[str]:
    try:
        rows = conn.execute("SELECT filename FROM schema_migrations ORDER BY filename").fetchall()
        return [row[0] for row in rows]
    except Exception:
        conn.rollback()
        return []


def apply_with_psycopg(root: Path, database_url: str) -> list[str]:
    import psycopg

    applied_now: list[str] = []
    with psycopg.connect(database_url, connect_timeout=30, keepalives=1, keepalives_idle=30) as conn:
        conn.execute("SET statement_timeout = 0")
        already = set(_applied_filenames(conn))
        for path in migration_files(root):
            if path.name in already:
                print(f"skip {path.name} (already in schema_migrations)", flush=True)
                continue
            print(f"apply {path.name}", flush=True)
            for statement in _split_sql(path.read_text(encoding="utf-8")):
                conn.execute(statement)
            applied_now.append(path.name)
        conn.commit()
    return applied_now


def _status_from_names(root: Path, applied: list[str]) -> dict[str, list[str]]:
    expected = [path.name for path in migration_files(root)]
    counts: dict[str, int] = {}
    for name in applied:
        counts[name] = counts.get(name, 0) + 1
    duplicates = [name for name, count in counts.items() if count > 1]
    missing = [name for name in expected if name not in set(applied)]
    extra = [name for name in applied if name not in set(expected)]
    return {
        "expected": expected,
        "applied": applied,
        "missing": missing,
        "duplicate": duplicates,
        "extra": extra,
    }


def migration_status(root: Path, database_url: str) -> dict[str, list[str]]:
    try:
        import psycopg
    except ImportError:
        return _migration_status_psql(root, database_url)
    with psycopg.connect(database_url, connect_timeout=30) as conn:
        applied = _applied_filenames(conn)
    return _status_from_names(root, applied)


def _migration_status_psql(root: Path, database_url: str) -> dict[str, list[str]]:
    import shutil
    import subprocess

    if shutil.which("psql") is None:
        raise ImportError("psycopg and psql are both unavailable")
    completed = subprocess.run(
        [
            "psql",
            database_url,
            "-v",
            "ON_ERROR_STOP=1",
            "-t",
            "-A",
            "-c",
            "SELECT filename FROM schema_migrations ORDER BY filename",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise SystemExit(completed.stderr or "schema_migrations query failed")
    applied = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    return _status_from_names(root, applied)


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
    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    names = validate_migration_set(root)
    database_url = os.environ.get("DATABASE_URL")
    if "--check-only" in sys.argv or not database_url:
        print("migrations ok:", ", ".join(names))
        return 0
    if "--status" in sys.argv:
        status = migration_status(root, database_url)
        print("expected migrations:", ", ".join(status["expected"]) or "(none)")
        print("applied migrations:", ", ".join(status["applied"]) or "(none)")
        print("missing migrations:", ", ".join(status["missing"]) or "0")
        print("duplicate migration rows:", ", ".join(status["duplicate"]) or "0")
        return 1 if status["missing"] or status["duplicate"] else 0
    try:
        applied_now = apply_with_psycopg(root, database_url)
    except ImportError:
        apply_with_psql(root, database_url)
        applied_now = names
    print("applied", ", ".join(applied_now) if applied_now else "(none; already current)")
    status = migration_status(root, database_url)
    print("expected migrations:", ", ".join(status["expected"]))
    print("applied migrations:", ", ".join(status["applied"]))
    print("missing migrations:", ", ".join(status["missing"]) or "0")
    print("duplicate migration rows:", ", ".join(status["duplicate"]) or "0")
    if status["missing"] or status["duplicate"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
