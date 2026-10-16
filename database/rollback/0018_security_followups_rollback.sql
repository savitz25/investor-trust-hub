-- rollback_20261016150000_investor.sql
-- Follow-ups to 20261013200000 RLS fail-closed. Founder GO 2026-10-16 11:02 ET. Project ghjhcxfirxnszfnymdxb.
-- Run as postgres. Rollback: (this file) - restores pre-2026-10-16 state
-- CI only: grants are skipped when mth.rls_fail_closed_ci = 'investor_trust_hub' AND
-- current_database() is investor_trust_hub AND the production system_identifier is absent.
-- Without that setting the guard below is unchanged and still refuses.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';
DO $g$
DECLARE
  v_sysid bigint;
BEGIN
  IF current_setting('mth.rls_fail_closed_ci', true) = 'investor_trust_hub' THEN
    IF current_database() <> 'investor_trust_hub' THEN
      RAISE EXCEPTION 'guard: CI setting mth.rls_fail_closed_ci is present but database is %', current_database();
    END IF;
    SELECT system_identifier INTO v_sysid FROM pg_control_system();
    IF v_sysid = 7666007964130682852 THEN
      RAISE EXCEPTION 'guard: CI skip refused on production system_identifier';
    END IF;
    PERFORM set_config('mth.rls_fail_closed_skip', '1', true);
    RAISE NOTICE 'followups rollback: skipped on explicit CI ephemeral database';
    RETURN;
  END IF;
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'guard: must run as postgres'; END IF;
  IF to_regclass('public.form_adv_filings') IS NULL OR to_regclass('public.people') IS NULL OR to_regclass('public.trust_request') IS NOT NULL THEN RAISE EXCEPTION 'guard: fingerprint mismatch - wrong project'; END IF;
END $g$;
-- built-in PUBLIC EXECUTE on functions is a global default. A per-schema REVOKE cannot remove it, so this one is global (functions created by postgres).
DO $apply$
BEGIN
  IF current_setting('mth.rls_fail_closed_skip', true) = '1' THEN
    RAISE NOTICE 'followups rollback: privilege restore skipped on explicit CI ephemeral database';
    RETURN;
  END IF;
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated';
  EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO PUBLIC';
  EXECUTE 'ALTER FUNCTION public.search_documents_refresh_tsv() RESET search_path';
END
$apply$;
DO $p$ BEGIN RAISE NOTICE 'followups rollback applied'; END $p$;
DELETE FROM schema_migrations
WHERE filename = '0018_security_followups.sql';
COMMIT;
