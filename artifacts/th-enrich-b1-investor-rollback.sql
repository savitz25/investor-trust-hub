\set ON_ERROR_STOP on
-- Founder-only data rollback, from repository root with psql -f.
-- Run before database/rollback/0016_b1_state_adviser_registration_type.sql.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout = '10min';
SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE b1_new_firms (
  firm_crd text NOT NULL,
  business_name text NOT NULL,
  legal_name text NOT NULL
) ON COMMIT DROP;
\copy b1_new_firms FROM 'artifacts/th-enrich-b1-current/iapd_state_new_firm_candidates.csv' CSV HEADER

CREATE TEMP TABLE b1_target_firms ON COMMIT DROP AS
SELECT DISTINCT f.id, n.firm_crd, n.business_name, n.legal_name
FROM source_releases sr
JOIN jurisdiction_registrations j ON j.source_release_id=sr.id
JOIN b1_new_firms n ON n.firm_crd=j.raw->>'firm_crd'
JOIN firms f ON f.id=j.firm_id AND f.slug::text='sec-crd-'||n.firm_crd
JOIN firm_identifiers fi ON fi.firm_id=f.id
                        AND fi.identifier_type='crd' AND fi.identifier_value=n.firm_crd
WHERE sr.source_dataset_id='iapd_state_compilation'
  AND sr.release_label='IA_FIRM_STATE_Feed_09_30_2026'
  AND sr.checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c'
  AND j.raw->>'b1_created_firm'='true';

DO $$
DECLARE release_id uuid; created_count integer; created_registrations integer; fk record; referenced boolean;
BEGIN
  SELECT id, (notes::jsonb->>'created_firms')::integer,
         (notes::jsonb->>'created_firm_registrations')::integer
  INTO STRICT release_id, created_count, created_registrations FROM source_releases
  WHERE source_dataset_id='iapd_state_compilation'
    AND release_label='IA_FIRM_STATE_Feed_09_30_2026'
    AND checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';
  IF (SELECT count(*) FROM b1_new_firms)<>5491
     OR created_count IS NULL OR created_registrations IS NULL
     OR (SELECT count(*) FROM b1_target_firms)<>created_count
     OR (SELECT count(DISTINCT id) FROM b1_target_firms)<>created_count
     OR (SELECT count(*) FROM jurisdiction_registrations WHERE source_release_id=release_id)<>6602
     OR (SELECT count(*) FROM jurisdiction_registrations j JOIN b1_target_firms n ON j.firm_id=n.id
          WHERE j.source_release_id=release_id)<>created_registrations
     OR EXISTS (SELECT 1 FROM b1_target_firms n JOIN firms f ON f.id=n.id
                WHERE f.legal_name<>n.legal_name OR f.display_name<>n.business_name OR f.is_synthetic)
     OR EXISTS (SELECT 1 FROM b1_target_firms n JOIN firm_identifiers fi ON fi.firm_id=n.id
                WHERE fi.identifier_type<>'crd' OR fi.identifier_value<>n.firm_crd)
     OR (SELECT count(*) FROM firm_identifiers fi JOIN b1_target_firms n ON fi.firm_id=n.id)<>created_count
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations j JOIN b1_target_firms n ON j.firm_id=n.id
                WHERE j.source_release_id IS DISTINCT FROM release_id)
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations j WHERE j.source_release_id=release_id
                AND (j.source_dataset_id<>'iapd_state_compilation'
                     OR j.registration_type<>'STATE_REGISTERED_IA' OR j.subject_kind<>'firm'))
     OR EXISTS (SELECT 1 FROM search_documents s JOIN b1_target_firms n
                ON s.entity_kind='firm' AND s.entity_id=n.id) THEN
    RAISE EXCEPTION 'B1 rollback target changed; manual review required';
  END IF;
  -- Every other foreign-key child must be empty for these firms. This prevents
  -- ON DELETE CASCADE / SET NULL from touching later enrichment or user data.
  FOR fk IN
    SELECT c.conrelid::regclass AS child_table, a.attname AS child_column,
           cardinality(c.conkey) AS key_columns
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid='public.firms'::regclass
      AND c.conrelid NOT IN ('public.firm_identifiers'::regclass,
                            'public.jurisdiction_registrations'::regclass)
  LOOP
    IF fk.key_columns<>1 THEN RAISE EXCEPTION 'Unreviewed composite firm FK on %', fk.child_table; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s c JOIN b1_target_firms n ON c.%I=n.id)',
                   fk.child_table, fk.child_column) INTO referenced;
    IF referenced THEN RAISE EXCEPTION 'Firm dependency exists in %', fk.child_table; END IF;
  END LOOP;
END $$;

DELETE FROM jurisdiction_registrations j
USING source_releases sr
WHERE j.source_release_id=sr.id
  AND sr.source_dataset_id='iapd_state_compilation'
  AND sr.release_label='IA_FIRM_STATE_Feed_09_30_2026'
  AND sr.checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c'
  AND j.source_dataset_id='iapd_state_compilation'
  AND j.registration_type='STATE_REGISTERED_IA';

DELETE FROM firms f USING b1_target_firms n WHERE f.id=n.id;

DO $$
DECLARE release_id uuid; fk record; referenced boolean;
BEGIN
  SELECT id INTO STRICT release_id FROM source_releases
  WHERE source_dataset_id='iapd_state_compilation'
    AND release_label='IA_FIRM_STATE_Feed_09_30_2026';
  IF EXISTS (SELECT 1 FROM jurisdiction_registrations WHERE source_release_id=release_id)
     OR EXISTS (SELECT 1 FROM firms f JOIN b1_target_firms n ON f.id=n.id) THEN
    RAISE EXCEPTION 'B1 data rollback recount failed';
  END IF;
  FOR fk IN
    SELECT c.conrelid::regclass AS child_table, a.attname AS child_column,
           cardinality(c.conkey) AS key_columns
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid='public.source_releases'::regclass
  LOOP
    IF fk.key_columns<>1 THEN RAISE EXCEPTION 'Unreviewed composite release FK on %', fk.child_table; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %I=$1)',
                   fk.child_table, fk.child_column) INTO referenced USING release_id;
    IF referenced THEN RAISE EXCEPTION 'Release dependency exists in %', fk.child_table; END IF;
  END LOOP;
END $$;

DELETE FROM source_releases
WHERE source_dataset_id='iapd_state_compilation'
  AND release_label='IA_FIRM_STATE_Feed_09_30_2026'
  AND checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';

COMMIT;
