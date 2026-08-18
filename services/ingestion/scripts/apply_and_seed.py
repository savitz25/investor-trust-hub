from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from apply_migrations import (  # noqa: E402
    _split_sql,
    apply_with_psycopg,
    migration_status,
    validate_migration_set,
)
from load_env import load_local_env  # noqa: E402


def main() -> int:
    load_local_env(ROOT)
    import os

    include_synthetic = "--include-synthetic" in sys.argv
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1
    print("connecting", flush=True)
    print("migrations", ", ".join(validate_migration_set(ROOT)), flush=True)
    apply_with_psycopg(ROOT, dsn)
    print("migrations_applied", flush=True)
    status = migration_status(ROOT, dsn)
    print("missing migrations:", ", ".join(status["missing"]) or "0", flush=True)
    import psycopg

    seeds = [
        ROOT / "database/seed/0001_source_registry.sql",
        ROOT / "database/seed/0003_sec_adv_datasets.sql",
    ]
    if include_synthetic:
        seeds.insert(1, ROOT / "database/seed/0002_synthetic_fixtures.sql")
        print("including synthetic fixtures (is_synthetic=true, not official)", flush=True)
    else:
        print("omitting synthetic fixtures (production-safe)", flush=True)

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        conn.execute("SET statement_timeout = 0")
        for seed in seeds:
            for statement in _split_sql(seed.read_text(encoding="utf-8")):
                conn.execute(statement)
        conn.commit()
        count = conn.execute(
            "select count(*) from source_datasets where id in ('sec_ia_ria','sec_ia_era')"
        ).fetchone()[0]
        synthetic = conn.execute("select count(*) from firms where is_synthetic").fetchone()[0]
    print("sec_adv_datasets", count, flush=True)
    print("synthetic_firms", synthetic, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
