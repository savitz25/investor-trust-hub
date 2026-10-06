# EA-INV-002-INDEX — Form ADV relational read-path index preparation

**Preparation-only artifact. No DDL has been run anywhere — not production, not
dev/staging. No live database access was available in this environment; every
runtime result below is `PENDING_DB_ACCESS` until this is run where authorized
access exists. Do not apply anything without explicit sign-off from whoever
owns production schema changes.**

## A. Corrected premise

EA-INV-002 (PR #49) stated "no usable `filing_uuid` index was found in
migration history." That was checked only for explicit `CREATE INDEX`
statements naming `filing_uuid`, and missed that all six tables already carry
a table-level `UNIQUE (filing_uuid, <other column>)` constraint —
`database/migrations/0013_adv_relational_graph.sql`. PostgreSQL implements a
table `UNIQUE` constraint as a B-tree index, and a multi-column B-tree index
is fully usable for an equality predicate on any **leading prefix** of its
columns. `WHERE filing_uuid = $1` can already use that index's leading
`filing_uuid` column without needing the second column — this is standard,
universal B-tree behavior, not a Postgres quirk.

So the correct expectation, subject to live verification, is that **none of
the six tables need a new index** — each is already served by its existing
`UNIQUE (filing_uuid, ...)` constraint. This runbook and its script exist to
*prove that empirically against the real catalog* rather than assume it from
migration text, and to apply a targeted `CREATE INDEX CONCURRENTLY` only for
any table where that assumption turns out to be wrong.

## B. Migration execution model (as found)

`services/ingestion/scripts/apply_migrations.py`'s `apply_with_psycopg`:

```python
with psycopg.connect(database_url, connect_timeout=30, keepalives=1, keepalives_idle=30) as conn:
    conn.execute("SET statement_timeout = 0")
    ...
    for path in migration_files(root):
        ...
        for statement in _split_sql(path.read_text(encoding="utf-8")):
            conn.execute(statement)
        applied_now.append(path.name)
    conn.commit()
```

Default `autocommit=False`. **Every pending migration file's every statement
runs inside one single shared transaction across the whole batch**, committed
once at the very end — even more strongly transactional than a per-file
transaction. `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block
at all (Postgres raises `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a
transaction block`), so it categorically cannot go through this runner. This
also explains why migration `0013_adv_relational_graph.sql` itself is held
behind `APPLY_MIGRATION_0013=1` in `HOLD_UNTIL_EXPLICIT` — it still goes
through the same transactional runner, just gated by an env var, not a
different execution path.

A separate, distinctly-named, `autocommit=True` script is required — the
same shape established for `contractor-trust-hub`'s `EA-CT-001-INDEX`.

## C. Six-table index audit

Structural finding from `database/migrations/0013_adv_relational_graph.sql`
(verified: every `UNIQUE (filing_uuid, ...)` constraint below is the *only*
place each table's name and that exact clause co-occur):

| Table | Existing index | Constraint (auto-creates a B-tree index) | Leading column | Serves `filing_uuid = f.id`? |
| --- | --- | --- | --- | --- |
| `form_adv_schedule_ab_rows` | YES | `UNIQUE (filing_uuid, source_row_digest)` | `filing_uuid` | YES (leftmost-prefix) |
| `form_adv_related_person_rows` | YES | `UNIQUE (filing_uuid, source_row_digest)` | `filing_uuid` | YES |
| `form_adv_private_fund_rows` | YES | `UNIQUE (filing_uuid, source_row_digest)` | `filing_uuid` | YES |
| `form_adv_fund_service_provider_rows` | YES | `UNIQUE (filing_uuid, source_row_digest)` | `filing_uuid` | YES |
| `form_adv_other_office_rows` | YES | `UNIQUE (filing_uuid, source_office_key)` | `filing_uuid` | YES |
| `form_adv_relying_adviser_rows` | YES | `UNIQUE (filing_uuid, source_row_digest)` | `filing_uuid` | YES |

Exact constraint/index *names* are Postgres's auto-generated default
(`<table>_filing_uuid_<col2>_key`) unless renamed post-creation — the
`--check` script below determines the real, current name empirically via
catalog introspection rather than assuming the default, and independently
re-derives every column above from `pg_index`/`pg_attribute`, not from the
migration file text.

This audit is a **static** finding from schema text. It does not by itself
prove the constraint was successfully created in the target database (e.g. if
migration 0013 were only partially applied) — that is exactly what `--check`
verifies live before any decision is made.

## D. Indexes required

**None are expected**, pending live `--check` confirmation. All six tables
already have a valid, usable index whose leading column is `filing_uuid`.

If a live `--check` run ever disagrees with this static analysis for a
specific table (e.g. the constraint is missing, invalid, or not-ready in the
real database), the script proposes exactly one new index for that table and
no others:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS <table>_filing_uuid_idx
ON <table> (filing_uuid);
```

No speculative compound indexes are proposed for any table.

## E. Proposed SQL (conditional — only for a table `--check` flags `NEEDS_INDEX`)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_schedule_ab_rows_filing_uuid_idx
ON form_adv_schedule_ab_rows (filing_uuid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_related_person_rows_filing_uuid_idx
ON form_adv_related_person_rows (filing_uuid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_private_fund_rows_filing_uuid_idx
ON form_adv_private_fund_rows (filing_uuid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_fund_service_provider_rows_filing_uuid_idx
ON form_adv_fund_service_provider_rows (filing_uuid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_other_office_rows_filing_uuid_idx
ON form_adv_other_office_rows (filing_uuid);

CREATE INDEX CONCURRENTLY IF NOT EXISTS form_adv_relying_adviser_rows_filing_uuid_idx
ON form_adv_relying_adviser_rows (filing_uuid);
```

The apply script (`services/ingestion/scripts/adv_relational_filing_uuid_indexes.py`,
`--apply`) only ever issues the statements for tables its own fresh `--check`
pass flags `NEEDS_INDEX` — it never runs all six unconditionally, and prints
"Nothing to apply" and issues no DDL at all if the list is empty (the
expected outcome).

## F. Pre-apply checks (`--check`, read-only, default mode, safe anytime)

Run: `python -X utf8 services/ingestion/scripts/adv_relational_filing_uuid_indexes.py --check`

Per table, via `pg_class`/`pg_namespace`/`pg_index`/`pg_attribute` (schema-
qualified to `public` on both the index and the table — never a display-
formatted `indexdef` string):

1. Table exists (`to_regclass('public.<table>')`).
2. Every existing index on the table, with its ordered indexed columns.
3. Whether any existing, valid (`indisvalid`), ready (`indisready`) index has
   `filing_uuid` as its first indexed column → `serves_filing_uuid`.
4. Whether an object already exists under the *proposed* name
   (`<table>_filing_uuid_idx`) that is invalid/not-ready — a leftover failed
   `CONCURRENTLY` build. This is a hard **BLOCKER**, never a silent no-op;
   `--apply` refuses to proceed while any blocker exists.
5. Connected database/server/user identity.
6. Transactions open longer than 2 minutes (`pg_stat_activity`) — informational,
   flagged for awareness before ever running `--apply`.

Fails closed: any `BLOCKER_*` decision on any table stops `--apply` outright.

## G. Post-apply verification plan (`--verify`, read-only)

Run: `python -X utf8 services/ingestion/scripts/adv_relational_filing_uuid_indexes.py --verify`

Per table:

1. Re-confirms `serves_filing_uuid` via the same catalog inspection as `--check`.
2. Samples one real `filing_uuid` value from the table.
3. Runs `EXPLAIN (ANALYZE, FORMAT TEXT)` for `SELECT * FROM <table> WHERE filing_uuid = <sample>`.
4. **PASS/FAIL, exits non-zero on any failure**: no `Seq Scan on <table>` in
   the plan; the plan references the serving index by name; a plain row-count
   query for the same predicate returns the same count before and after the
   `EXPLAIN` (data-result stability, not just plan shape).
5. Execution time is parsed and printed **informationally only** — plan shape
   is the hard gate, never a fixed-millisecond cutoff.

## H. Reconciliation command (unchanged, preserved)

`services/ingestion/scripts/reconcile_adv_relational.py` already computes,
read-only, every count EA-INV-002 asked for and more: Schedule A/B rows by
grain (person/organization, direct/indirect, executive/control), identity
confidence totals, `is_current` breakdowns, owner-entity publication flags,
OwnerID/name collisions, related-person/fund/service-provider/office/relying-
adviser counts, and ADV-W/CRS/Part 2A coverage. Run it later, once authorized
DB access exists, exactly as-is:

```bash
python services/ingestion/scripts/reconcile_adv_relational.py
```

It writes `data/reports/inv-nat-002b-reconcile.json` and prints the same JSON
to stdout. Nothing in this ticket modifies that script.

## I. Rollback

```sql
DROP INDEX CONCURRENTLY IF EXISTS <index_name>;
```

Also non-transactional — run via the same one-off autocommit connection shape
`--apply` uses, never through the standard transactional runner.

- **When appropriate**: a newly applied index is found to add unacceptable
  write/vacuum overhead, or a `CONCURRENTLY` build failed/was cancelled and
  left an invalid index that must be cleared before retrying.
- **Effect if absent**: none to correctness. Every one of these six tables'
  existing `UNIQUE (filing_uuid, ...)` constraint remains regardless — the
  new index (if ever applied) is pure query-planner optimization layered on
  top of an already-present usable index, not new identity or safety logic.

## Hard boundaries respected

No production DDL executed. No schema applied anywhere (including dev/
staging). No production writes. No re-ingestion. No identity mutation. No
publication-policy change. No `HIGH_CONFIDENCE` → `CONFIRMED` promotion. No
`REVIEW_REQUIRED` publication. No new credentials or secrets requested or
added. No merge, no deploy.
