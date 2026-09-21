# TH-SEARCH-R1-019H-P1-R1 — Production read-only `--check` (Section 9)

**Only `--check` was ever run against Production. `--apply` was never run. No DDL was executed.**

Command (from the worktree root, `DATABASE_URL` loaded via Node's native `--env-file`, no secret value printed or echoed anywhere):

```
node --env-file=apps/web/.env.local scripts/th_search_r1_019h_p1_build_indexes.mjs --check
```

## Result: zero blockers

Full receipt (credential-free — host/port/database identity only, no connection string): `receipts/p1r1-check-final.json`. Summary:

| Check | Result |
| --- | --- |
| Connection identity | `postgres` / port 5432 (session pooler) |
| `pg_trgm` installed | true, |
| `public.firms` exists | true |
| **Both proposed index names absent** | true — `firms_display_name_normalized_trgm_v1_idx` and `firms_legal_name_normalized_trgm_v1_idx` both return zero matching objects (Section 2's collision rule) |
| Existing raw trigram indexes valid/ready/live | true for both `firms_display_name_trgm_idx` / `firms_legal_name_trgm_idx`, access method `gin`, opclass `gin_trgm_ops` |
| In-progress `CREATE INDEX` on `firms` | none |
| Long-running (>2 min) transaction | none |
| Both normalized expressions parse | true |
| **Blockers** | **0** |

This exactly matches the ticket's expected Section 9 outcome.

## Two real defects this live run found and fixed (mocks alone did not catch either)

This is precisely why the ticket required an actual read-only run against Production rather than trusting static/mocked tests alone.

### 1. Missing `pg_am` join

The first `--check` attempt (before this fix) threw a Postgres error: `missing FROM-clause entry for table "am"`. The rewritten `describeIndex()` query selected `am.amname AS access_method` but the P1→P1-R1 rewrite had dropped the `JOIN pg_am am ON am.oid = c.relam` line from the `FROM` clause. Fixed by restoring the join. This is a pure SQL-correctness bug — it would have made `--check`, `--verify`, and `--apply`'s post-create validation all fail outright, safely (an error, not a false pass), but it needed a real database round-trip to surface at all.

### 2. `opclasses` returned as an unparsed array-literal string, not a JS array

After fixing (1), `--check` ran but `describeIndex()`'s `opclasses` field came back as the literal string `"{gin_trgm_ops}"`, not the JS array `["gin_trgm_ops"]` the strict validator (`strictlyValidateIndex`) expects. Root cause: `node-postgres` has a built-in type parser for the `text[]` OID but not for `name[]` (the type of `pg_opclass.opcname`, and therefore of the un-cast `array_agg(opc.opcname)`). Every one of this ticket's own mock-based tests (Sections D–H) supplied `opclasses` as an already-correct JS array by construction, so they could not have caught this — only a real query against the real database, returning the real driver-level type, exposed it. Left uncorrected, `strictlyValidateIndex` would have compared `"{gin_trgm_ops}".length` (14) against the expected length (1) and **always failed even a perfectly correct index** — the opposite of the fail-closed behavior intended: a false negative that would have blocked a legitimate, correctly-built index from ever passing `--verify`.

Fixed by explicitly casting: `array_agg(opc.opcname ORDER BY k.ord)::text[]`. Re-ran `--check` after the fix; the receipt now shows `opclasses` as a proper two-element-tolerant array (`["gin_trgm_ops"]`) for both existing raw trigram indexes, confirmed directly in the live JSON output before it was written to the receipt.

## Consequence for the hash lock

Both fixes changed `scripts/th_search_r1_019h_p1_build_indexes.mjs`'s bytes, so its SHA256 changed again after this live-check round — see `P1-NORMALIZED-INDEX-PACKET.md` Section 8 for the final, post-live-check hash. The proposed SQL file's own hash was not affected by either fix (only the wrapper's query/parsing logic changed, not the DDL it proposes).
