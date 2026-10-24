"""EA-INV-002-INDEX -- Form ADV relational read-path index preparation.

Audits, and where genuinely necessary applies, an index supporting
`filing_uuid = f.id` lookups on the six Form ADV relational-graph tables
joined by apps/web/src/lib/firms/profile-intelligence.ts:

    form_adv_schedule_ab_rows
    form_adv_related_person_rows
    form_adv_private_fund_rows
    form_adv_fund_service_provider_rows
    form_adv_other_office_rows
    form_adv_relying_adviser_rows

IMPORTANT: each of these tables already carries a table-level
`UNIQUE (filing_uuid, <other column>)` constraint (see
database/migrations/0013_adv_relational_graph.sql). Postgres implements a
table UNIQUE constraint as a B-tree index, and a multi-column B-tree index
is fully usable for an equality predicate on any leading prefix of its
columns -- so `WHERE filing_uuid = $1` can already use that index's leading
`filing_uuid` column without needing `source_row_digest` / `source_office_key`
to be specified. This script's --check mode proves that empirically against
the real catalog (never assumed from migration text alone) and only ever
proposes a new CONCURRENTLY index for a table where that assumption turns
out to be wrong.

Modes:
    --check   (default, read-only) audit all six tables, print table /
              existing-index / indexed-columns / serves-filing_uuid decision.
    --apply   (requires --i-understand-this-touches-production) creates a
              CONCURRENTLY index ONLY for tables --check flags as unserved.
              autocommit=True, lock_timeout='5s', no statement_timeout.
              Never falls back to a non-concurrent CREATE INDEX on failure.
    --verify  (read-only) re-inspects the catalog and, where DB access
              allows, runs EXPLAIN (ANALYZE) against a real filing_uuid to
              confirm no avoidable sequential scan and stable row counts.

    python -X utf8 services/ingestion/scripts/adv_relational_filing_uuid_indexes.py --check
    python -X utf8 services/ingestion/scripts/adv_relational_filing_uuid_indexes.py --apply --i-understand-this-touches-production
    python -X utf8 services/ingestion/scripts/adv_relational_filing_uuid_indexes.py --verify
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))
from load_env import find_repo_root, load_local_env  # noqa: E402

TABLES = [
    "form_adv_schedule_ab_rows",
    "form_adv_related_person_rows",
    "form_adv_private_fund_rows",
    "form_adv_fund_service_provider_rows",
    "form_adv_other_office_rows",
    "form_adv_relying_adviser_rows",
]

# Proposed index name, used ONLY if --check finds a table genuinely unserved.
PROPOSED_INDEX_NAME = {t: f"{t}_filing_uuid_idx" for t in TABLES}

EXECUTION_TIME_RE = re.compile(r"Execution Time:\s*([\d.]+)\s*ms")


def inspect_table_indexes(conn, table: str) -> list[dict]:
    """All indexes on public.<table>, each with ordered indexed columns.

    Schema-qualified on both the index and the table (an identically named
    object in another schema never satisfies this). Structural facts only
    -- never a display-formatted `indexdef` string.
    """
    rows = conn.execute(
        """
        SELECT
          c.relname AS index_name,
          i.indisvalid,
          i.indisready,
          i.indisunique,
          (
            SELECT array_agg(a.attname ORDER BY k.ord)
            FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
          ) AS indexed_columns
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_index i ON i.indexrelid = c.oid
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_namespace tn ON tn.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND tn.nspname = 'public'
          AND t.relname = %s
        ORDER BY c.relname
        """,
        (table,),
    ).fetchall()
    return [
        {
            "index_name": r[0],
            "indisvalid": r[1],
            "indisready": r[2],
            "indisunique": r[3],
            "indexed_columns": list(r[4]) if r[4] else [],
        }
        for r in rows
    ]


def table_exists(conn, table: str) -> bool:
    row = conn.execute("SELECT to_regclass('public.' || %s)", (table,)).fetchone()
    return row[0] is not None


def leading_column_serves_filing_uuid(index_info: dict) -> bool:
    cols = index_info["indexed_columns"]
    return bool(cols) and cols[0] == "filing_uuid" and index_info["indisvalid"] and index_info["indisready"]


def audit_table(conn, table: str) -> dict:
    if not table_exists(conn, table):
        return {
            "table": table,
            "table_exists": False,
            "existing_index": False,
            "index_name": None,
            "indexed_columns": None,
            "serves_filing_uuid": False,
            "decision": "BLOCKER_TABLE_MISSING",
        }
    indexes = inspect_table_indexes(conn, table)
    serving = [ix for ix in indexes if leading_column_serves_filing_uuid(ix)]
    invalid_named = [
        ix for ix in indexes if ix["index_name"] == PROPOSED_INDEX_NAME[table] and not (ix["indisvalid"] and ix["indisready"])
    ]
    if invalid_named:
        return {
            "table": table,
            "table_exists": True,
            "existing_index": True,
            "index_name": invalid_named[0]["index_name"],
            "indexed_columns": invalid_named[0]["indexed_columns"],
            "serves_filing_uuid": False,
            "decision": "BLOCKER_INVALID_LEFTOVER_CONCURRENT_BUILD",
        }
    if serving:
        chosen = serving[0]
        return {
            "table": table,
            "table_exists": True,
            "existing_index": True,
            "index_name": chosen["index_name"],
            "indexed_columns": chosen["indexed_columns"],
            "serves_filing_uuid": True,
            "decision": "SKIP_ALREADY_SERVED",
        }
    return {
        "table": table,
        "table_exists": True,
        "existing_index": bool(indexes),
        "index_name": None,
        "indexed_columns": None,
        "serves_filing_uuid": False,
        "decision": "NEEDS_INDEX",
    }


def connection_identity(conn) -> dict:
    row = conn.execute(
        "SELECT current_database(), current_user, inet_server_addr()::text, inet_server_port()"
    ).fetchone()
    return {"database": row[0], "user": row[1], "server_addr": row[2], "server_port": row[3]}


def long_running_transactions(conn) -> list[dict]:
    rows = conn.execute(
        """
        SELECT pid, usename, now() - xact_start AS duration, left(query, 120)
        FROM pg_stat_activity
        WHERE xact_start IS NOT NULL
          AND now() - xact_start > interval '2 minutes'
          AND pid <> pg_backend_pid()
        ORDER BY xact_start
        """
    ).fetchall()
    return [{"pid": r[0], "user": r[1], "duration": str(r[2]), "query": r[3]} for r in rows]


def run_check(conn) -> dict:
    audits = [audit_table(conn, t) for t in TABLES]
    identity = connection_identity(conn)
    long_txns = long_running_transactions(conn)
    needs_index = [a["table"] for a in audits if a["decision"] == "NEEDS_INDEX"]
    blockers = [a["table"] for a in audits if a["decision"].startswith("BLOCKER")]
    return {
        "audits": audits,
        "connection": identity,
        "long_running_transactions": long_txns,
        "needs_index": needs_index,
        "blockers": blockers,
    }


def print_check(result: dict) -> bool:
    print(f"Connected: {result['connection']}")
    if result["long_running_transactions"]:
        print(f"WARNING: {len(result['long_running_transactions'])} transaction(s) open > 2 minutes:")
        for t in result["long_running_transactions"]:
            print(f"  pid={t['pid']} user={t['user']} duration={t['duration']} query={t['query']!r}")
    else:
        print("No transactions open > 2 minutes.")
    print()
    ok = True
    for a in result["audits"]:
        print(f"table={a['table']}")
        print(f"  table_exists={a['table_exists']}")
        print(f"  existing_index={a['existing_index']}")
        print(f"  index_name={a['index_name']}")
        print(f"  indexed_columns={a['indexed_columns']}")
        print(f"  serves_filing_uuid={a['serves_filing_uuid']}")
        print(f"  decision={a['decision']}")
        if a["decision"].startswith("BLOCKER"):
            ok = False
        print()
    if result["blockers"]:
        print(f"FAIL: blockers on {result['blockers']} -- investigate before proceeding.")
        ok = False
    if result["needs_index"]:
        print(f"NEEDS_INDEX: {result['needs_index']}")
    else:
        print("All six tables are already served by an existing valid index (leading column filing_uuid). "
              "No new index is required.")
    return ok


def run_apply(conn, needs_index: list[str]) -> bool:
    if not needs_index:
        print("Nothing to apply -- --check found all six tables already served. No DDL issued.")
        return True
    ok = True
    for i, table in enumerate(needs_index, start=1):
        name = PROPOSED_INDEX_NAME[table]
        print(f"[{i}/{len(needs_index)}] applying {name} on {table} ...", flush=True)
        with conn.cursor() as cur:
            cur.execute("SET lock_timeout = '5s'")
            cur.execute(
                f'CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} ON {table} (filing_uuid)'
            )
        print(f"[{i}/{len(needs_index)}] done: {name}", flush=True)
    return ok


def run_verify(conn) -> bool:
    ok = True

    def check(label: str, cond: bool) -> None:
        nonlocal ok
        print(f"{'PASS' if cond else 'FAIL'} - {label}")
        if not cond:
            ok = False

    audits = {a["table"]: a for a in run_check(conn)["audits"]}
    for table in TABLES:
        a = audits[table]
        check(f"{table}: served by a valid, ready index with filing_uuid as leading column", a["serves_filing_uuid"])
        if not a["serves_filing_uuid"]:
            continue

        sample = conn.execute(
            f"SELECT filing_uuid FROM {table} WHERE filing_uuid IS NOT NULL LIMIT 1"
        ).fetchone()
        if not sample:
            print(f"  (skipped plan check for {table}: table has no rows to sample)")
            continue
        filing_uuid = sample[0]

        before_count = conn.execute(
            f"SELECT count(*) FROM {table} WHERE filing_uuid = %s", (filing_uuid,)
        ).fetchone()[0]

        plan_rows = conn.execute(
            f"EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM {table} WHERE filing_uuid = %s",
            (filing_uuid,),
        ).fetchall()
        plan_text = "\n".join(r[0] for r in plan_rows)
        check(f"{table}: no sequential scan in plan", f"Seq Scan on {table}" not in plan_text)
        check(f"{table}: plan references the serving index ({a['index_name']})", a["index_name"] in plan_text)

        after_count = conn.execute(
            f"SELECT count(*) FROM {table} WHERE filing_uuid = %s", (filing_uuid,)
        ).fetchone()[0]
        check(f"{table}: result count stable across plan check ({before_count})", before_count == after_count)

        m = EXECUTION_TIME_RE.search(plan_text)
        if m:
            print(f"  (informational) execution time: {m.group(1)}ms")

    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Read-only audit (default).")
    parser.add_argument("--apply", action="store_true", help="Apply missing indexes. Requires the confirmation flag.")
    parser.add_argument("--verify", action="store_true", help="Read-only post-apply verification.")
    parser.add_argument("--i-understand-this-touches-production", action="store_true", dest="confirm")
    args = parser.parse_args()

    mode_count = sum([args.check, args.apply, args.verify])
    if mode_count > 1:
        print("Pass exactly one of --check / --apply / --verify.", file=sys.stderr)
        return 2
    if args.apply and not args.confirm:
        print("--apply requires --i-understand-this-touches-production.", file=sys.stderr)
        return 2

    root = find_repo_root(Path(__file__).resolve())
    load_local_env(root)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("PENDING_DB_ACCESS: DATABASE_URL is not configured in this environment. "
              "No credentials were requested; this script must be run later where authorized "
              "database access already exists.", file=sys.stderr)
        return 3

    import psycopg

    if args.apply:
        conn = psycopg.connect(database_url, connect_timeout=30, autocommit=True)
    else:
        conn = psycopg.connect(database_url, connect_timeout=30)
        conn.execute("SET default_transaction_read_only = on")

    try:
        if args.apply:
            check_result = run_check(conn)
            if check_result["blockers"]:
                print(f"BLOCKED: {check_result['blockers']} -- refusing to apply. Investigate first.")
                return 1
            ok = run_apply(conn, check_result["needs_index"])
            return 0 if ok else 1
        if args.verify:
            ok = run_verify(conn)
            return 0 if ok else 1
        # default: --check
        result = run_check(conn)
        ok = print_check(result)
        return 0 if ok else 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
