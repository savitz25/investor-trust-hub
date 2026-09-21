# TH-SEARCH-R1-019H-P1 — normalized firm-name index preparation packet

**Preparation only. No Production DDL was executed to produce this packet.**
Everything below is either a read-only fact captured from the real,
connected database, or a prepared-but-unexecuted artifact requiring separate
founder/owner authorization before `--apply` is ever run.

## 1. Starting state

- Repo: `savitz25/Investor-Trust-Hub`
- PR #48 head at start of this ticket: `586dee730186c2003802a6e65e3e0a30cecfbfb0` (confirmed via `gh pr view`: open, draft, mergeable)
- `origin/main`: `5f7f363b5479db16dc122a128bb65270476aa196` (confirmed via `git fetch` + `git rev-parse`)
- Neither changed during this ticket; no rebase was performed.
- `DATABASE_URL available: YES` (boolean only; no value printed, no `.env.local` cat, no credential copy).

## 2. R1-019H correctness recap (unchanged by this ticket)

R1-019H's own final report already confirmed: real 60-case holdout 0 wrong / 0 native-structured disagreements after its fix, punctuation/numeric-leading/identifier-precedence proofs all pass, contract/fingerprint unchanged. **This ticket does not touch name-matching semantics anywhere** — no file under `packages/domain/src` or `apps/web/src` was modified. Only new, additive artifacts were added (`docs/qa/th-search-r1-019h/*`, `scripts/th_search_r1_019h_p1_build_indexes.mjs`, `scripts/test_th_search_r1_019h_p1_index_packet.ts`).

## 3. Authoritative normalized expression (Section F)

Read directly from `packages/domain/src/firm-name-match.ts`:

```ts
export function normalizedNameMatchSql(expr: string): string {
  return `btrim(regexp_replace(lower(${expr}), '[^a-z0-9]+', ' ', 'g'))`;
}
```

And its exact call sites in `apps/web/src/lib/ask/execute.ts` (`filtersSql`, WHERE predicate; `listFirms`, exact-match `ORDER BY`) — both apply this transform to `f.display_name` and `f.legal_name`, always AND-ed with the literal clause `f.is_synthetic = false` (line 182, unconditional first element of `clauses`).

The proposed index expressions are this exact string, byte-for-byte — not hand-rederived. `scripts/test_th_search_r1_019h_p1_index_packet.ts` asserts this equality directly against the live `firm-name-match.ts` source text, so any future drift in either file fails the test rather than silently diverging (Section P).

**The WHERE-clause matching predicate is unchanged.** This packet proposes index support for the existing predicate; it does not add, remove, or alter any condition.

## 4. Live existing-index inventory (Section E)

Full detail in `P1-PROD-PREFLIGHT.md`. Summary: `firms_display_name_trgm_idx` / `firms_legal_name_trgm_idx` are GIN `gin_trgm_ops` indexes on the **raw, unwrapped** columns (not expressions, not partial) — this is why they can't serve the normalized predicate. `pg_trgm` 1.6 is installed. No index or index-adjacent object collides with the proposed names. Both raw trigram indexes are `indisvalid`/`indisready` and actively used (`idx_scan` > 2000 each) — confirming they must remain untouched (Section 13/O).

## 5. Full vs. partial index decision (Section G)

**Decision: full (non-partial) expression indexes.**

The application's WHERE clause always includes the literal, unconditional clause `f.is_synthetic = false` — confirmed by reading `filtersSql()` (Section 3) — which normally makes a `WHERE is_synthetic = false` partial index a textbook-safe, planner-provable choice (Postgres proves partial-index applicability very reliably for an exact literal clause present in the query).

However, **live read-only inspection found `is_synthetic = true` count = 0** out of 25,777 rows (`P1-PROD-PREFLIGHT.md`, Table facts). A partial index with that predicate would today be **byte-identical in content and size** to a full index — zero current benefit. Choosing partial anyway would add a dependency (the planner proving the partial predicate holds for every future query that might use this index) for a benefit that does not currently exist. A full expression index gives the identical safety guarantee — it will always be usable by any future query matching the expression, regardless of whether that query happens to also filter `is_synthetic` — with no partial-predicate dependency and no current size cost.

This is not a decision based on size alone (the ticket's explicit caution): it is based on the *combination* of (a) zero current size benefit from partial and (b) a full index being strictly more robust to any future query shape. If synthetic firm rows are ever added later, both choices remain correct for today's queries; only a full index also remains correct for a hypothetical future query that omits the `is_synthetic` filter.

## 6. Proposed indexes (Section H)

Exactly two, minimum access paths, no speculative compound indexes:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS firms_display_name_normalized_trgm_v1_idx
ON firms
USING gin ((btrim(regexp_replace(lower(display_name), '[^a-z0-9]+', ' ', 'g'))) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS firms_legal_name_normalized_trgm_v1_idx
ON firms
USING gin ((btrim(regexp_replace(lower(legal_name), '[^a-z0-9]+', ' ', 'g'))) gin_trgm_ops);
```

Full text with header commentary: `PROPOSED-normalized-firm-name-indexes.sql` (this directory).

Access method/opclass: GIN + `gin_trgm_ops` — identical to the existing raw trigram indexes, which already prove this access method and opclass work correctly for `LIKE '%...%'` against this exact table in this exact database (Section 4). `lower()`, `regexp_replace()`, and `btrim()` are all Postgres built-in `IMMUTABLE` functions, satisfying the hard requirement for expression indexes.

**Existing raw trigram indexes are not dropped, altered, or reused for this proposal** — they remain in place unconditionally during build, verification, and benchmarking (Section 13/O).

## 7/8/9. DDL safety, session/connection safety, pre-flight (Sections 7–9)

All implemented in `scripts/th_search_r1_019h_p1_build_indexes.mjs` (not executed):
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS`, one statement at a time, never inside an explicit transaction (no `BEGIN`/`COMMIT` anywhere in the wrapper — verified by `test_th_search_r1_019h_p1_index_packet.ts`).
- Refuses port `6543` (transaction-mode pooler); requires `5432` (session pooler or direct).
- `--check` (default) is read-only and safe to run anytime; `--apply` requires `--i-understand-this-touches-production`; `--verify` is read-only.
- Hash-locks the exact proposal file (`EXPECTED_SQL_SHA256`, Section I) — any edit to the SQL file, even whitespace, causes `--apply` to refuse rather than silently applying a changed proposal.
- Statement allowlist: only `CREATE INDEX CONCURRENTLY IF NOT EXISTS ... ON firms USING gin (...)` is accepted; anything else (including `DROP`/`REINDEX`/`VACUUM`/`ANALYZE`/`ALTER TABLE`/`ALTER SYSTEM`/`CREATE EXTENSION`/`SET`) is refused before any connection is even made.
- Preflight (`runPreflight`) proves every item in Section 9's list against the live catalog immediately before `--apply` proceeds, and fails closed (refuses to apply) if any blocker is found — including a leftover invalid same-named index (never auto-dropped) or a concurrent `CREATE INDEX` already in flight.
- Storage headroom: **not inferable from SQL**, recorded honestly in `P1-PROD-PREFLIGHT.md` as an owner precondition (Section R) rather than assumed.

**This wrapper was never executed in this ticket** — not even `--check` — per the ticket's explicit instruction. It was syntax-checked only (`node --check`, no connection attempted). The equivalent read-only inventory in Sections 4–5 above and in `P1-PROD-PREFLIGHT.md` was produced by a separate, ad hoc read-only script, not by this deliverable wrapper.

## 10. Disposable/local rehearsal — genuinely unavailable in this environment

**Honest limitation, not fabricated evidence.** This environment has no Docker (`docker: command not found`), no local PostgreSQL binaries (`postgres`/`initdb`/`pg_ctlcluster` all absent), and no embedded/in-process Postgres npm dependency in this repository (`pglite`, `pg-mem`, `testcontainers` — none present). The one available alternative the ticket names, `hypopg` (hypothetical indexes), is present in `pg_available_extensions` on the real database but **is not installed**, and installing it would be an "extension change" — explicitly on this ticket's own forbidden list (Section 7/16). Installing it was therefore correctly not done.

Given this, the "before/after planner proof" this section asks for could not be produced by literal `EXPLAIN` before-and-after a real index build, and is not fabricated here. Two substitutes stand in its place, both genuinely obtained:
1. **Structural proof of the mechanism**: this exact database already has working expression indexes (`firms_display_name_lower_idx` / `firms_legal_name_lower_idx`, btree on `lower(column)`) — direct, live evidence that Postgres expression indexes are created and usable in this exact environment. GIN `gin_trgm_ops` expression indexes use the identical "match the query's expression against the index's expression" mechanism, just a different access method/opclass, one already proven correct for `LIKE '%...%'` via the existing raw trigram indexes (Section 4).
2. **The wrapper's own `--verify` mode is the actual before/after proof**, deferred to the point it becomes technically possible: immediately after a real `CREATE INDEX CONCURRENTLY` completes (owner-run, future, separately authorized), `--verify` re-runs `EXPLAIN (ANALYZE, BUFFERS)` for the same five query classes captured in Section 11 below and asserts no `Seq Scan` and a plan reference to the new index name, exactly mirroring the acceptance gate in Section 12.

## 11. Production baseline evidence (Section M) — captured fresh, 2026-09-21

Read-only `EXPLAIN (ANALYZE, BUFFERS)` against the real, connected database, `SET default_transaction_read_only = on`, no DDL:

| Query class | Plan shape | Execution time | Planning time | Buffers |
| --- | --- | --- | --- | --- |
| Cincinnati (punctuation variant) | Seq Scan | 268.610 ms | 0.846 ms | shared hit=660 |
| `1 NORTH WEALTH SERVICES, LLC` (numeric-leading) | Seq Scan | 266.229 ms | 0.107 ms | shared hit=660 |
| `ASSET MANAGEMENT` (broad, 1,279 rows) | Seq Scan | 262.510 ms | 0.101 ms | shared hit=660 |
| Ordinary stable firm (`Fisher Investments`) | Seq Scan | 270.621 ms | 0.102 ms | shared hit=660 |
| Genuine miss | Seq Scan | 266.702 ms | 0.104 ms | shared hit=660 |

Every case: constant ~262–271 ms regardless of selectivity, `Buffers: shared hit=660` (fully cached — the table is 5.3 MB, comfortably in memory). **This confirms the cost is CPU-bound (running the `lower()`/`regexp_replace()`/`btrim()` chain against all 25,777 rows), not I/O-bound** — consistent with, and re-confirming, R1-019H-R1's original finding. No future indexed performance is claimed here; the indexes do not exist yet.

## 12. Future performance acceptance gate (Section N) — defined before building

To be checked only after a future, separately-authorized owner actually runs `--apply` and `--verify`:

- **A.** No `Seq Scan` on `firms` for the five representative query classes in Section 11 above, unless the planner demonstrably picks one because it is cheaper for a genuinely broad, low-selectivity query (documented with the actual plan, not assumed).
- **B.** Punctuation/numeric-leading correctness unchanged — re-run the exact Cincinnati and `1 NORTH WEALTH SERVICES, LLC` proofs from R1-019H-R1 and confirm identical CRD results.
- **C.** No wrong identities — re-run against the same real controls R1-019H-R1 used.
- **D.** The frozen 60-case holdout from R1-019H-R1 (`0 wrong`, `0 native/structured disagreements`) re-run unchanged.
- **E.** Latency materially improves from the current ~265–275 ms hot path — comparative, not a fabricated hard millisecond threshold this environment can't support.
- **F.** No material regression compared with the original raw-`ILIKE` baseline (~13–112 ms, `Bitmap Index Scan`/`BitmapOr`) that R1-019H-R1 captured before the normalized-expression change.

## 13. Retirement policy (Section O)

**No retirement action in this ticket.** `firms_display_name_trgm_idx` / `firms_legal_name_trgm_idx` remain in place, unconditionally, through build, verification, and benchmarking — confirmed still actively used by other query paths (`idx_scan` > 2000 each, Section 4). Whether they are still needed after the normalized indexes are live, benchmarked, and holdout-verified is an explicit, separate, later decision — not decided or even proposed here.

## 14. Tests / mutations (Section P)

`scripts/test_th_search_r1_019h_p1_index_packet.ts` — 29 tests, all passing (verified via a scratchpad-only temporary vitest config pointed at this one file, since this repo's committed `vitest.config.ts` include-glob intentionally doesn't cover `scripts/*.ts`; the committed config was not modified). Covers: expression byte-for-byte lock against `normalizedNameMatchSql()` (plus a mutation guard proving a regex/flag drift would be caught), exactly 2 `CREATE INDEX CONCURRENTLY` statements and nothing else, zero `DROP`/`REINDEX`/`VACUUM`/`ANALYZE`/`ALTER`, zero data writes, no duplicate index names, wrapper hash-lock consistency, no explicit transaction wrapper, session-pooler-only refusal, fail-closed on an existing invalid proposed-name index and on an in-progress `CREATE INDEX`, one-at-a-time apply with per-index verification, no automatic retry/cleanup, and a credential-free receipt (host/port/database identity only, never the connection string). Does not modify or weaken any existing R1-019H test.

## 15. Artifacts (Section Q)

- `docs/qa/th-search-r1-019h/P1-NORMALIZED-INDEX-PACKET.md` (this file)
- `docs/qa/th-search-r1-019h/PROPOSED-normalized-firm-name-indexes.sql`
- `docs/qa/th-search-r1-019h/P1-PROD-PREFLIGHT.md`
- `scripts/th_search_r1_019h_p1_build_indexes.mjs`
- `scripts/test_th_search_r1_019h_p1_index_packet.ts`

SHA256 hashes:
- Proposed SQL: `c2e518bc7c3494d18a8e74798092f399f756f65153056984ffa3000b99a30293`
- Build wrapper: `b8a570277c1524c2904716c7352797aa64ae39bcddba94a43549d684e46896b4`

## 16. Owner preconditions (Section R)

Before any future execution:
1. Explicit founder/owner authorization naming this exact packet (by these SHA256 hashes).
2. Storage headroom / autoscaling confirmation — dashboard-only, not establishable by SQL (Section 9).
3. Re-run `--check` in the same session immediately before `--apply` (catalog state can change between this packet's preparation and future execution).
4. A maintenance/low-traffic window is not strictly required (`CREATE INDEX CONCURRENTLY` never blocks normal reads/writes, only briefly at start/end), but coordinating with whoever owns Production change windows is still an owner decision, not this packet's to make.
5. After `--apply` succeeds, run `--verify` and the full acceptance gate (Section 12) before treating this as done.
