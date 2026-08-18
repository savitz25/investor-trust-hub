"""Measure firm-search query time against the configured database."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_env import load_local_env  # noqa: E402


def main() -> int:
    load_local_env(ROOT)
    import os

    import psycopg

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL missing")
        return 1
    cases = [
        (
            "exact_crd",
            "SELECT slug FROM firms f JOIN firm_identifiers i ON i.firm_id=f.id AND i.identifier_type='crd' WHERE i.identifier_value=%s",
            ("105958",),
        ),
        (
            "name_prefix",
            "SELECT slug FROM firms WHERE is_synthetic=false AND lower(display_name) LIKE lower(%s) ORDER BY display_name LIMIT 20",
            ("vanguard%",),
        ),
        (
            "name_trgm",
            "SELECT slug FROM firms WHERE is_synthetic=false AND display_name %% %s ORDER BY similarity(display_name, %s) DESC LIMIT 20",
            ("capital", "capital"),
        ),
    ]
    results = []
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        for name, sql, params in cases:
            started = time.perf_counter()
            rows = conn.execute(sql, params).fetchall()
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            results.append({"name": name, "ms": elapsed, "rows": len(rows)})
    out = ROOT / "data" / "reports" / "task-003-search-perf.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
