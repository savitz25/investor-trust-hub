# TH-SEARCH-R1-019H-P1 — Production preflight (read-only, captured 2026-09-21)

No DDL was executed to produce this document. Every fact below came from
read-only `SELECT`/`EXPLAIN` queries against the real, connected Production
database, run with `SET default_transaction_read_only = on`. This document's
own facts (existing index inventory, `pg_trgm`, table size) are still
accurate as of the P1-R1 correction pass — they were not re-derived by hand,
they were re-confirmed live: the deliverable wrapper's own `--check` run
(`P1-R1-PROD-READONLY-CHECK.md`) independently reports the same
`existingRawTrgmIndexes` facts as this document, via its own SQL, and they
agree.

## Connection identity

`current_database() = postgres`, `current_user = postgres`, server port
`5432` (session pooler / direct — not the 6543 transaction-mode pooler).

## Existing indexes on `firms` (exact `pg_get_indexdef`)

| Index | Access method | Definition | Valid / Ready / Live |
| --- | --- | --- | --- |
| `firms_pkey` | btree | `(id)` | true / true / true |
| `firms_slug_key` | btree | `(slug)` | true / true / true |
| `firms_synthetic_idx` | btree | `(is_synthetic)` | true / true / true |
| `firms_display_name_lower_idx` | btree | `(lower(display_name))` | true / true / true |
| `firms_legal_name_lower_idx` | btree | `(lower(legal_name))` | true / true / true |
| `firms_display_name_trgm_idx` | **gin** | `(display_name gin_trgm_ops)` | true / true / true |
| `firms_legal_name_trgm_idx` | **gin** | `(legal_name gin_trgm_ops)` | true / true / true |

None of these seven objects have a partial predicate (`pg_get_expr(indpred, indrelid)` is `NULL` for both trigram indexes). The repository's own migrations do not define the two trigram objects — the live Production catalog is the only authoritative source for them, exactly as this ticket warned.

`firms_display_name_lower_idx` / `firms_legal_name_lower_idx` are existing, **already-working expression btree indexes** on this exact table in this exact database — direct, live proof that Postgres expression indexes function correctly here. They are unrelated to the LIKE-based name search (btree can't serve infix `LIKE '%x%'`) and are not touched by this proposal.

## Trigram index stats

| Index | Size | `idx_scan` | opclass |
| --- | --- | --- | --- |
| `firms_display_name_trgm_idx` | 6152 kB | 2337 | `gin_trgm_ops` |
| `firms_legal_name_trgm_idx` | 6136 kB | 2334 | `gin_trgm_ops` |

Both indexes are **actively used** (non-zero `idx_scan`) by other, non-name-search query paths — confirmed reason they must not be dropped or altered in this ticket (Section O, Retirement Policy).

## `pg_trgm`

Installed, version `1.6`. `hypopg` (hypothetical indexes) is *available* (`pg_available_extensions`) but **not installed** — installing it would be an "extension change," explicitly on this ticket's forbidden list, so it was not installed and not used.

## Table facts

`firms`: table size 5280 kB, `reltuples` estimate 23,622, exact `count(*)` 25,777. **`is_synthetic = true` count: 0** (all 25,777 rows are `is_synthetic = false`) — see `P1-NORMALIZED-INDEX-PACKET.md` Section G for why this drives the full-vs-partial index decision.

## Pre-flight state (Section 9 requirements)

| Check | Result |
| --- | --- |
| Correct database identity | Confirmed (`postgres` / port 5432) |
| `pg_trgm` available | Yes, 1.6 |
| Target table exists | Yes (`public.firms`) |
| Target columns exist | Yes (`display_name`, `legal_name`) |
| Proposed-name collision | None — `firms_display_name_normalized_trgm_v1_idx` / `firms_legal_name_normalized_trgm_v1_idx` do not exist yet |
| Existing raw trigram indexes valid | Yes, both `indisvalid = indisready = true` |
| No invalid proposed-name index exists | Confirmed (none exist yet at all) |
| No `CREATE INDEX` on `firms` in progress | Confirmed, 0 matching `pg_stat_activity` rows |
| No long-running (>2 min) transaction | Confirmed, 0 rows |
| Expression matches `normalizedNameMatchSql()` | Confirmed, see `P1-NORMALIZED-INDEX-PACKET.md` Section F |

**Disk headroom / storage autoscaling behavior could not be established by SQL** (this is a hosting-dashboard-only fact for a managed Postgres instance). Recorded honestly here as an **owner precondition** (Section R), not inferred or assumed.

## What this preflight does NOT establish

This document is a **read-only snapshot**, not a live execution. It does not prove:
- that these exact conditions will still hold at the moment a future owner runs `--apply` (re-run `--check` immediately before `--apply`, same session);
- planner usage of the *proposed* indexes (they do not exist yet — that proof is only possible after a real `CREATE INDEX CONCURRENTLY` completes, which this ticket does not perform);
- available disk headroom (dashboard-only, see above).
