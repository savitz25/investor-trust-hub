-- =============================================================================
-- MIGRATION: 20261013200000_investor_rls_fail_closed
-- Project: Investor-Trust-Hub (ref ghjhcxfirxnszfnymdxb).  Drafted 2026-10-13 by Grok Bot (TrustHub Supabase Security).
-- Audit: network-rls-audit-20261013/audit.md.  Capture: read-only catalog SELECT 2026-10-13 (raw/catalog/investor_tables.txt).
-- DRAFT - NOT APPLIED.  Requires Founder GO.  Rehearse on a branch first.  Do NOT `supabase db push`.
-- Run as postgres, single session, psql -v ON_ERROR_STOP=1:
--   SET mth.rls_fail_closed_target = 'branch';            -- preview branch / restored copy
--   SET mth.rls_fail_closed_target = 'ghjhcxfirxnszfnymdxb';  -- production
-- NOTE: system_identifier 7666007964130682852 is NOT unique on its own (care and investor share it);
--       the guard also requires a project-specific table fingerprint.
-- CI only: the migration runner sets mth.rls_fail_closed_ci = 'investor_trust_hub' in the same
-- session when MTH_RLS_FAIL_CLOSED_CI is exactly that value AND current_database() is
-- investor_trust_hub. Without that setting the guards below are unchanged and still refuse.
-- =============================================================================
-- What it does (all-or-nothing, idempotent):
--   * ENABLE ROW LEVEL SECURITY on all 55 tables (no FORCE: owner postgres pg-Pool/psycopg paths keep bypass).
--   * REVOKE ALL (arwdDxtm) FROM anon, authenticated, PUBLIC.  service_role untouched (BYPASSRLS).
--   * No column grants / policies: audit found NO table read by the public site via anon.
--   * Default privileges and SECURITY DEFINER views/functions are NOT changed (see audit.md residual risks).
-- Rollback: rollback_20261013200000.sql (restores the captured ACLs exactly).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '300s';

CREATE TEMP TABLE _mth_rls_capture (relname text PRIMARY KEY, pre_acl text NOT NULL) ON COMMIT DROP;
INSERT INTO _mth_rls_capture (relname, pre_acl) VALUES
    ('branches', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('disclosure_events', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('evidence_records', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('field_provenance', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('firm_identifiers', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('firm_source_observations', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('firms', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_documents', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_filings', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_firm_facts', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_fund_service_provider_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_historical_firm_candidates', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_other_office_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_owner_entities', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_private_fund_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_related_person_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_relying_adviser_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_reported_attributes', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_schedule_ab_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_successor_links', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('form_adv_withdrawals', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('ingestion_quarantine', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('ingestion_run_events', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('ingestion_runs', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('issuer_identifiers', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('issuers', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('jurisdiction_registrations', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('people', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('person_firm_associations', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('person_identifiers', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('product_identifiers', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('products', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('registration_status_history', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('registrations', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('regulatory_action_documents', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('regulatory_actions', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('regulatory_filings', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('schema_migrations', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('search_documents', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('source_authorities', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('source_datasets', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('source_releases', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('source_snapshots', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('source_systems', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_ab', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_docs', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_filing_lookup', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_filings', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_funds', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_offices', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_rel', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_relying', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_sp', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_adv_w', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'),
    ('stg_sec_adv_rows', '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}');

CREATE FUNCTION pg_temp.mth_acl_norm(a aclitem[]) RETURNS text[] LANGUAGE sql IMMUTABLE AS $f$
  SELECT coalesce(array_agg(x ORDER BY x), '{}')
  FROM (SELECT format('%s>%s:%s:%s', x.grantor::regrole,
                      CASE x.grantee WHEN 0 THEN 'PUBLIC' ELSE x.grantee::regrole::text END,
                      x.privilege_type, x.is_grantable) AS x
        FROM aclexplode(a) x) s
$f$;

DO $guard$
DECLARE
  v_target text := current_setting('mth.rls_fail_closed_target', true);
  v_sysid bigint;
  v_prod_sysid constant bigint := 7666007964130682852;  -- ghjhcxfirxnszfnymdxb, captured 2026-10-13
  v_missing int; v_bad text;
BEGIN
  -- Explicit CI ephemeral opt-in only. A real database without this setting still refuses below.
  IF current_setting('mth.rls_fail_closed_ci', true) = 'investor_trust_hub' THEN
    IF current_database() <> 'investor_trust_hub' THEN
      RAISE EXCEPTION 'guard: CI setting mth.rls_fail_closed_ci is present but database is %', current_database();
    END IF;
    SELECT system_identifier INTO v_sysid FROM pg_control_system();
    IF v_sysid = v_prod_sysid THEN
      RAISE EXCEPTION 'guard: CI skip refused on production system_identifier';
    END IF;
    PERFORM set_config('mth.rls_fail_closed_skip', '1', true);
    RAISE NOTICE 'investor_rls_fail_closed: skipped on explicit CI ephemeral database';
    RETURN;
  END IF;
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'guard: must run as postgres (got %)', current_user; END IF;
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'guard: unexpected database %', current_database(); END IF;
  IF current_setting('server_version_num')::int < 170000 THEN RAISE EXCEPTION 'guard: expected PostgreSQL 17+'; END IF;
  -- project fingerprint (Investor-Trust-Hub)
  IF to_regclass('public.form_adv_filings') IS NULL OR to_regclass('public.form_adv_fund_service_provider_rows') IS NULL OR to_regclass('public.people') IS NULL THEN RAISE EXCEPTION 'guard: fingerprint tables missing - this is not Investor-Trust-Hub'; END IF;
  IF to_regclass('public.pbj_staffing_day') IS NOT NULL OR to_regclass('public.trust_request') IS NOT NULL OR to_regclass('public.lender_cfpb_complaints') IS NOT NULL THEN RAISE EXCEPTION 'guard: foreign-project table present - this is not Investor-Trust-Hub'; END IF;
  IF to_regnamespace('move_v2') IS NOT NULL THEN RAISE EXCEPTION 'guard: schema move_v2 present - this is the Move database'; END IF;

  SELECT system_identifier INTO v_sysid FROM pg_control_system();
  IF v_target IS NULL OR v_target = '' THEN
    RAISE EXCEPTION 'guard: set mth.rls_fail_closed_target first (''ghjhcxfirxnszfnymdxb'' or ''branch'')';
  ELSIF v_target = 'ghjhcxfirxnszfnymdxb' THEN
    IF v_sysid <> v_prod_sysid THEN RAISE EXCEPTION 'guard: target says prod but system_identifier % <> %', v_sysid, v_prod_sysid; END IF;
  ELSIF v_target = 'branch' THEN
    NULL;  -- branches may clone sysid; fingerprint + captured-state checks still apply
  ELSE
    RAISE EXCEPTION 'guard: unknown mth.rls_fail_closed_target %', v_target;
  END IF;

  SELECT count(*) INTO v_missing
  FROM _mth_rls_capture c
  LEFT JOIN pg_class k ON k.relname = c.relname AND k.relnamespace = 'public'::regnamespace
  WHERE k.oid IS NULL OR k.relkind <> 'r' OR k.relispartition
     OR pg_get_userbyid(k.relowner) <> 'postgres' OR k.relforcerowsecurity;
  IF v_missing > 0 THEN RAISE EXCEPTION 'guard: % of 55 tables missing / not owned by postgres / wrong kind / FORCE RLS', v_missing; END IF;

  SELECT string_agg(c.relname, ', ') INTO v_bad
  FROM _mth_rls_capture c
  JOIN pg_class k ON k.relname = c.relname AND k.relnamespace = 'public'::regnamespace
  WHERE NOT (
        (NOT k.relrowsecurity AND pg_temp.mth_acl_norm(k.relacl) = pg_temp.mth_acl_norm(c.pre_acl::aclitem[]))
     OR (k.relrowsecurity AND NOT EXISTS (SELECT 1 FROM aclexplode(k.relacl) a
           WHERE a.grantee = 0 OR a.grantee IN ('anon'::regrole, 'authenticated'::regrole))));
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'guard: state drift since 2026-10-13 capture on: %', v_bad; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies pp JOIN _mth_rls_capture c ON c.relname = pp.tablename WHERE pp.schemaname='public') THEN
    RAISE EXCEPTION 'guard: policies exist on captured tables (capture had 0) - re-audit';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute a JOIN _mth_rls_capture c ON a.attrelid = ('public.'||quote_ident(c.relname))::regclass
             WHERE a.attnum > 0 AND a.attacl IS NOT NULL) THEN
    RAISE EXCEPTION 'guard: column ACLs exist on captured tables (capture had none) - re-audit';
  END IF;
END
$guard$;

DO $fix$
DECLARE r record;
BEGIN
  IF current_setting('mth.rls_fail_closed_skip', true) = '1' THEN
    RAISE NOTICE 'investor_rls_fail_closed: privilege changes skipped on explicit CI ephemeral database';
    RETURN;
  END IF;
  FOR r IN SELECT relname FROM _mth_rls_capture ORDER BY relname LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, PUBLIC', r.relname);
  END LOOP;
END
$fix$;

DO $post$
DECLARE r record; p text;
  privs constant text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'];
BEGIN
  IF current_setting('mth.rls_fail_closed_skip', true) = '1' THEN
    RAISE NOTICE 'investor_rls_fail_closed: post-checks skipped on explicit CI ephemeral database';
    RETURN;
  END IF;
  FOR r IN SELECT k.oid, k.relname, k.relrowsecurity, k.relforcerowsecurity, k.relacl
           FROM _mth_rls_capture cap JOIN pg_class k ON k.relname = cap.relname AND k.relnamespace = 'public'::regnamespace LOOP
    IF NOT r.relrowsecurity THEN RAISE EXCEPTION 'post: RLS not enabled on %', r.relname; END IF;
    IF r.relforcerowsecurity THEN RAISE EXCEPTION 'post: unexpected FORCE RLS on %', r.relname; END IF;
    IF EXISTS (SELECT 1 FROM aclexplode(r.relacl) a WHERE a.grantee = 0 OR a.grantee IN ('anon'::regrole,'authenticated'::regrole)) THEN
      RAISE EXCEPTION 'post: anon/authenticated/PUBLIC still in relacl of %', r.relname; END IF;
    FOREACH p IN ARRAY privs LOOP
      IF has_table_privilege('anon', r.oid, p) OR has_table_privilege('authenticated', r.oid, p) THEN
        RAISE EXCEPTION 'post: anon/authenticated still has % on %', p, r.relname; END IF;
      IF NOT has_table_privilege('service_role', r.oid, p) THEN RAISE EXCEPTION 'post: service_role lost % on %', p, r.relname; END IF;
      IF NOT has_table_privilege('postgres', r.oid, p) THEN RAISE EXCEPTION 'post: postgres lost % on %', p, r.relname; END IF;
    END LOOP;
    IF has_any_column_privilege('anon', r.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
       OR has_any_column_privilege('authenticated', r.oid, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
      RAISE EXCEPTION 'post: column privilege remains on %', r.relname; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_policies pp JOIN _mth_rls_capture c ON c.relname = pp.tablename WHERE pp.schemaname='public') THEN
    RAISE EXCEPTION 'post: unexpected policies'; END IF;
  RAISE NOTICE 'investor_rls_fail_closed: post-checks passed for 55 tables';
END
$post$;

INSERT INTO schema_migrations (filename)
VALUES ('0017_rls_fail_closed.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
