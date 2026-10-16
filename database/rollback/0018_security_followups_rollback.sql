-- rollback_20261016150000_investor.sql
-- Follow-ups to 20261013200000 RLS fail-closed. Founder GO 2026-10-16 11:02 ET. Project ghjhcxfirxnszfnymdxb.
-- Run as postgres. Rollback: (this file) - restores pre-2026-10-16 state
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';
DO $g$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'guard: must run as postgres'; END IF;
  IF to_regclass('public.form_adv_filings') IS NULL OR to_regclass('public.people') IS NULL OR to_regclass('public.trust_request') IS NOT NULL THEN RAISE EXCEPTION 'guard: fingerprint mismatch - wrong project'; END IF;
END $g$;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
-- built-in PUBLIC EXECUTE on functions is a global default; a per-schema REVOKE cannot remove it, so this one is global (functions created by postgres):
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
ALTER FUNCTION public.search_documents_refresh_tsv() RESET search_path;
DO $p$ BEGIN RAISE NOTICE 'followups rollback applied'; END $p$;
COMMIT;
