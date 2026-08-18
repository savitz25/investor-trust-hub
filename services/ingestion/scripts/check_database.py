"""Harmless production connectivity check. Never prints secrets."""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from apply_migrations import migration_status, validate_migration_set  # noqa: E402
from load_env import load_local_env, redact_database_url  # noqa: E402


def main() -> int:
    load_local_env(ROOT)
    import os

    dsn = os.environ.get("DATABASE_URL") or os.environ.get("INGESTION_DATABASE_URL")
    if not dsn:
        print("BLOCKED — PRODUCTION DATABASE CREDENTIALS REQUIRED")
        print("DATABASE_URL / INGESTION_DATABASE_URL is not set")
        return 1
    parsed = urlparse(dsn)
    host = parsed.hostname or ""
    print("target_host", host)
    print("target_port", parsed.port)
    print("target_user", parsed.username)
    print("target_db", (parsed.path or "").lstrip("/"))
    print("redacted_dsn", redact_database_url(dsn))
    print("sslmode_required", "sslmode=require" in dsn or "supabase" in host)
    if host in {"localhost", "127.0.0.1"}:
        print("NOTE: host is local, not a cloud production database")

    import psycopg

    try:
        with psycopg.connect(dsn, connect_timeout=30) as conn:
            row = conn.execute(
                "SELECT version(), current_database(), current_user, now(), current_setting('ssl')"
            ).fetchone()
    except Exception as exc:
        print("CONNECT_FAIL", type(exc).__name__)
        return 2

    print("CONNECT_OK")
    print("version", row[0])
    print("current_database", row[1])
    print("current_user", row[2])
    print("now", row[3])
    print("ssl", row[4])
    print("migrations_on_disk", ", ".join(validate_migration_set(ROOT)))
    try:
        status = migration_status(ROOT, dsn)
        print("expected migrations", ", ".join(status["expected"]))
        print("applied migrations", ", ".join(status["applied"]) or "(none)")
        print("missing migrations", ", ".join(status["missing"]) or "0")
        print("duplicate migration rows", ", ".join(status["duplicate"]) or "0")
    except Exception as exc:
        print("schema_migrations_unreadable", type(exc).__name__)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
