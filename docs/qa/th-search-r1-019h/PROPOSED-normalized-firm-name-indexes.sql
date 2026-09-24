-- TH-SEARCH-R1-019H-P1-R1 -- proposed normalized firm-name indexes.
--
-- PREPARATION ONLY. This file is not executed by anything in this ticket.
-- Apply exactly once, ONE statement at a time, via the reviewed autocommit
-- wrapper (scripts/th_search_r1_019h_p1_build_indexes.mjs) after separate
-- founder/owner authorization -- never via the repository's ordinary
-- transactional migration runner, and never inside a transaction block
-- (CREATE INDEX CONCURRENTLY cannot run inside one).
--
-- P1-R1 correction: deliberately NO "IF NOT EXISTS". A same-name object
-- appearing between preflight and CREATE (e.g. a leftover partial-execution
-- artifact) must cause the CREATE itself to fail loudly, never be silently
-- skipped by IF NOT EXISTS while preflight had already treated a "valid but
-- wrong" same-name index as an unrelated pass. The wrapper's pre-apply
-- collision rule (Section 2) additionally requires BOTH proposed names to be
-- completely ABSENT before --apply is ever attempted, regardless of the
-- existing object's own validity -- so in the wrapper's own intended use,
-- IF NOT EXISTS would never even have a chance to fire; removing it closes
-- the gap for any future caller who runs this SQL by another path.
--
-- Expression matches packages/domain/src/firm-name-match.ts
-- normalizedNameMatchSql() BYTE-FOR-BYTE:
--   btrim(regexp_replace(lower(<column>), '[^a-z0-9]+', ' ', 'g'))
-- This is the exact predicate apps/web/src/lib/ask/execute.ts's filtersSql()
-- already evaluates against firms.display_name and firms.legal_name for
-- every name-search query. No WHERE-clause/matching semantics change.
--
-- FULL (non-partial) expression indexes, not partial WHERE is_synthetic =
-- false: live read-only inspection on 2026-09-21 found 0 of 25,777 firms
-- rows have is_synthetic = true. A partial index would be byte-identical in
-- size/content to a full index today, while adding a dependency on
-- PostgreSQL proving the partial predicate holds for every future query
-- shape that might use this index. A full expression index gives the
-- identical safety guarantee with no such dependency and no current size
-- cost. See P1-NORMALIZED-INDEX-PACKET.md Section G for the full reasoning.
--
-- Access method / opclass: GIN + gin_trgm_ops, matching the existing
-- (non-expression) firms_display_name_trgm_idx / firms_legal_name_trgm_idx,
-- which already prove this access method and opclass work correctly for
-- LIKE '%...%' infix matching against this exact table in this exact
-- database. pg_trgm 1.6 is already installed (verified live, read-only).
--
-- The existing raw-column trigram indexes (firms_display_name_trgm_idx,
-- firms_legal_name_trgm_idx) and the existing lower()-expression btree
-- indexes (firms_display_name_lower_idx, firms_legal_name_lower_idx) are
-- NOT touched, dropped, or replaced by this proposal. They remain in place
-- during build, verification, and benchmarking. Retirement is explicitly
-- out of scope for this ticket -- see P1-NORMALIZED-INDEX-PACKET.md
-- Section O (Retirement Policy).

CREATE INDEX CONCURRENTLY firms_display_name_normalized_trgm_v1_idx
ON public.firms
USING gin ((btrim(regexp_replace(lower(display_name), '[^a-z0-9]+', ' ', 'g'))) gin_trgm_ops);

CREATE INDEX CONCURRENTLY firms_legal_name_normalized_trgm_v1_idx
ON public.firms
USING gin ((btrim(regexp_replace(lower(legal_name), '[^a-z0-9]+', ' ', 'g'))) gin_trgm_ops);
