-- migration_20261016150000_investor_security_followups.sql
-- Follow-ups to 20261013200000 RLS fail-closed. Founder GO 2026-10-16 11:02 ET. Project ghjhcxfirxnszfnymdxb.
-- Run as postgres. Rollback: rollback_20261016150000_investor.sql
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '60s';
DO $g$ BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'guard: must run as postgres'; END IF;
  IF to_regclass('public.form_adv_filings') IS NULL OR to_regclass('public.people') IS NULL OR to_regclass('public.trust_request') IS NOT NULL THEN RAISE EXCEPTION 'guard: fingerprint mismatch - wrong project'; END IF;
END $g$;
-- 1. Default privileges: new public objects created by postgres no longer auto-grant to anon/authenticated (functions: also PUBLIC).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
-- built-in PUBLIC EXECUTE on functions is a global default; a per-schema REVOKE cannot remove it, so this one is global (functions created by postgres):
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- 3. Fixed search_path on advisor-flagged functions.
ALTER FUNCTION public.search_documents_refresh_tsv() SET search_path = public, pg_temp;
DO $p$ DECLARE bad text; BEGIN
  SELECT string_agg(a.grantee::regrole::text||':'||d.defaclobjtype::text,',') INTO bad FROM pg_default_acl d, aclexplode(d.defaclacl) a
   WHERE d.defaclrole='postgres'::regrole AND ((d.defaclnamespace='public'::regnamespace AND a.grantee::regrole::text IN ('__none__')) OR (d.defaclnamespace=0 AND d.defaclobjtype='f' AND a.grantee=0) OR (d.defaclnamespace='public'::regnamespace AND a.grantee::regrole::text IN ('anon','authenticated')));
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'post: default privileges still grant %', bad; END IF;
  SELECT string_agg(p.oid::regprocedure::text,',') INTO bad FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.oid::regprocedure::text IN ('search_documents_refresh_tsv()') AND NOT coalesce(p.proconfig::text,'') LIKE '%search_path=%';
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'post: search_path not set on %', bad; END IF;
  SELECT string_agg(relname,',') INTO bad FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (NULL) AND (has_table_privilege('anon',oid,'SELECT') OR has_table_privilege('anon',oid,'INSERT') OR has_table_privilege('authenticated',oid,'SELECT') OR NOT coalesce(reloptions::text,'') LIKE '%security_invoker=true%');
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'post: view still exposed %', bad; END IF;
  
  RAISE NOTICE 'followups post-checks passed';
END $p$;
COMMIT;
