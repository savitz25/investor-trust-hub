\set ON_ERROR_STOP on
-- Founder-only execution, from repository root with psql -f. Never run in preflight.
-- Requires 0016_b1_state_adviser_registration_type.sql to be applied first.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL statement_timeout = '10min';
SET LOCAL lock_timeout = '10s';

CREATE TEMP TABLE b1_registrations (
  source_system text NOT NULL,
  source_dataset text NOT NULL,
  firm_crd text NOT NULL,
  registration_state text NOT NULL,
  registration_status text NOT NULL,
  registration_date text NOT NULL,
  business_name text NOT NULL,
  legal_name text NOT NULL
) ON COMMIT DROP;
\copy b1_registrations FROM 'artifacts/th-enrich-b1-current/iapd_approved_state_advisers.csv' CSV HEADER

CREATE TEMP TABLE b1_new_firms (
  firm_crd text NOT NULL,
  business_name text NOT NULL,
  legal_name text NOT NULL
) ON COMMIT DROP;
\copy b1_new_firms FROM 'artifacts/th-enrich-b1-current/iapd_state_new_firm_candidates.csv' CSV HEADER

CREATE TEMP TABLE b1_release_before ON COMMIT DROP AS
SELECT id, checksum_sha256, notes FROM source_releases
WHERE source_dataset_id='iapd_state_compilation'
  AND release_label='IA_FIRM_STATE_Feed_09_30_2026';

CREATE TEMP TABLE b1_to_mint ON COMMIT DROP AS
SELECT n.* FROM b1_new_firms n
WHERE NOT EXISTS (SELECT 1 FROM b1_release_before)
  AND NOT EXISTS (SELECT 1 FROM firm_identifiers fi
                  WHERE fi.identifier_type='crd' AND fi.identifier_value=n.firm_crd);

DO $$
DECLARE present_count integer; absent_count integer; new_rows integer; existing_rows integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE filename='0016_b1_state_adviser_registration_type.sql') THEN
    RAISE EXCEPTION 'B1 constraint migration is not recorded';
  END IF;
  IF (SELECT count(*) FROM b1_registrations) <> 6602
     OR (SELECT count(DISTINCT firm_crd) FROM b1_registrations) <> 5942
     OR (SELECT count(*) FROM b1_new_firms) <> 5491
     OR (SELECT count(DISTINCT firm_crd) FROM b1_new_firms) <> 5491 THEN
    RAISE EXCEPTION 'B1 file cardinality changed';
  END IF;
  IF EXISTS (SELECT 1 FROM b1_registrations
             WHERE source_system <> 'iapd' OR source_dataset <> 'iapd_state_compilation'
               OR registration_state NOT IN ('CA','TX','AZ','WA') OR registration_status <> 'APPROVED'
               OR firm_crd !~ '^[0-9]+$' OR registration_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
               OR nullif(trim(business_name),'') IS NULL OR nullif(trim(legal_name),'') IS NULL)
     OR EXISTS (SELECT 1 FROM b1_registrations GROUP BY firm_crd, registration_state HAVING count(*) <> 1)
     OR EXISTS (SELECT 1 FROM b1_registrations r
                JOIN b1_new_firms n USING (firm_crd)
                WHERE r.business_name <> n.business_name OR r.legal_name <> n.legal_name) THEN
    RAISE EXCEPTION 'B1 feed grain or names changed';
  END IF;
  IF EXISTS (SELECT 1 FROM b1_new_firms n
             WHERE NOT EXISTS (SELECT 1 FROM b1_registrations r WHERE r.firm_crd=n.firm_crd))
     OR EXISTS (SELECT 1 FROM b1_registrations r
                WHERE NOT EXISTS (SELECT 1 FROM firm_identifiers fi
                                  WHERE fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd)
                  AND NOT EXISTS (SELECT 1 FROM b1_new_firms n WHERE n.firm_crd=r.firm_crd)) THEN
    RAISE EXCEPTION 'B1 candidate CRD membership differs';
  END IF;
  SELECT count(DISTINCT r.firm_crd) INTO present_count FROM b1_registrations r
  JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd;
  SELECT count(DISTINCT r.firm_crd) INTO absent_count FROM b1_registrations r
  WHERE NOT EXISTS (SELECT 1 FROM firm_identifiers fi
                    WHERE fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd);
  SELECT count(*) INTO new_rows FROM b1_registrations r JOIN b1_new_firms n USING (firm_crd);
  existing_rows := 6602-new_rows;
  IF present_count+absent_count<>5942 OR absent_count<> (SELECT count(*) FROM b1_to_mint)
     OR new_rows<>5993 OR existing_rows<>609
     OR NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conrelid='public.jurisdiction_registrations'::regclass
                      AND conname='jurisdiction_registrations_registration_type_check'
                      AND pg_get_constraintdef(oid) LIKE '%''STATE_REGISTERED_IA''::text%')
     OR EXISTS (SELECT 1 FROM b1_to_mint n JOIN firm_identifiers fi
                ON fi.identifier_type='crd' AND fi.identifier_value=n.firm_crd)
     OR EXISTS (SELECT 1 FROM b1_to_mint n JOIN firms f ON f.slug::text='sec-crd-'||n.firm_crd)
     OR EXISTS (SELECT 1 FROM b1_registrations r JOIN firm_identifiers fi
                ON fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd
                JOIN firms f ON f.id=fi.firm_id WHERE f.is_synthetic)
     OR (SELECT count(*) FROM b1_release_before)>1 THEN
    RAISE EXCEPTION 'B1 live ownership/preexisting source differs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM b1_release_before) THEN
    IF EXISTS (SELECT 1 FROM jurisdiction_registrations WHERE jurisdiction IN ('CA','TX','AZ','WA'))
       OR EXISTS (SELECT 1 FROM b1_registrations r
                  WHERE NOT EXISTS (SELECT 1 FROM firm_identifiers fi
                                    WHERE fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd)
                    AND NOT EXISTS (SELECT 1 FROM b1_to_mint n WHERE n.firm_crd=r.firm_crd)) THEN
      RAISE EXCEPTION 'Unreconciled registration or absent CRD outside certified candidate set';
    END IF;
  ELSE
    IF absent_count<>0
       OR EXISTS (SELECT 1 FROM b1_release_before
                  WHERE checksum_sha256<>'23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c'
                     OR notes::jsonb->>'ticket'<>'TH-ENRICH-B1')
       OR (SELECT count(*) FROM jurisdiction_registrations j JOIN b1_release_before sr
           ON j.source_release_id=sr.id)<>6602
       OR EXISTS (SELECT 1 FROM b1_registrations r WHERE NOT EXISTS (
           SELECT 1 FROM jurisdiction_registrations j JOIN b1_release_before sr
             ON j.source_release_id=sr.id
           JOIN firm_identifiers fi ON fi.firm_id=j.firm_id
             AND fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd
           WHERE j.jurisdiction=r.registration_state AND j.source_record_id=r.firm_crd||':'||r.registration_state
             AND j.subject_kind='firm' AND j.person_id IS NULL
             AND j.registration_type='STATE_REGISTERED_IA' AND j.status='APPROVED'
             AND j.effective_date=r.registration_date::date
             AND j.raw->>'business_name'=r.business_name AND j.raw->>'legal_name'=r.legal_name
             AND j.publication_allowed=false)) THEN
      RAISE EXCEPTION 'Existing B1 release differs; rerun is not a no-op';
    END IF;
  END IF;
END $$;

INSERT INTO source_releases (
  source_dataset_id, release_label, published_at, retrieved_at,
  checksum_sha256, archive_uri, raw_bytes, notes
) 
SELECT * FROM (VALUES (
  'iapd_state_compilation', 'IA_FIRM_STATE_Feed_09_30_2026',
  NULL::timestamptz, '2026-09-30 14:30:43+00'::timestamptz,
  '23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c',
  'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_30_2026.xml.gz',
  5086831::bigint, NULL::text
)) AS release_values(source_dataset_id,release_label,published_at,retrieved_at,checksum_sha256,archive_uri,raw_bytes,notes)
WHERE NOT EXISTS (SELECT 1 FROM b1_release_before);

INSERT INTO firms (slug, legal_name, display_name, is_synthetic, current_as_of)
SELECT 'sec-crd-'||firm_crd, legal_name, business_name, false, '2026-09-30 09:29:17+00'
FROM b1_to_mint ORDER BY firm_crd::bigint;

INSERT INTO firm_identifiers (firm_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
SELECT f.id, 'crd', n.firm_crd, 'sec', true
FROM b1_to_mint n JOIN firms f ON f.slug::text='sec-crd-'||n.firm_crd;

INSERT INTO jurisdiction_registrations (
  subject_kind, firm_id, jurisdiction, registration_type, regulator_authority,
  regulator_authority_id, status, status_raw, effective_date, source_dataset_id,
  source_record_id, source_release_id, source_observed_at, identity_confidence,
  match_basis, is_current, publication_allowed, raw
)
SELECT 'firm', fi.firm_id, r.registration_state, 'STATE_REGISTERED_IA',
       'State securities regulator', 'state_securities', 'APPROVED', 'APPROVED',
       r.registration_date::date, 'iapd_state_compilation',
       r.firm_crd||':'||r.registration_state, sr.id, '2026-09-30 14:30:43+00',
       'CONFIRMED', 'exact_crd', true, false,
       jsonb_build_object('firm_crd',r.firm_crd,'registration_state',r.registration_state,
                          'registration_date',r.registration_date,'business_name',r.business_name,
                          'legal_name',r.legal_name,'source_file','IA_FIRM_STATE_Feed_09_30_2026.xml.gz',
                          'b1_created_firm',EXISTS (SELECT 1 FROM b1_to_mint n WHERE n.firm_crd=r.firm_crd))
FROM b1_registrations r
JOIN firm_identifiers fi ON fi.identifier_type='crd' AND fi.identifier_value=r.firm_crd
JOIN source_releases sr ON sr.source_dataset_id='iapd_state_compilation'
                       AND sr.release_label='IA_FIRM_STATE_Feed_09_30_2026'
WHERE NOT EXISTS (SELECT 1 FROM b1_release_before);

UPDATE source_releases sr SET notes=jsonb_build_object(
  'ticket','TH-ENRICH-B1',
  'created_firms',(SELECT count(*) FROM b1_to_mint),
  'created_firm_registrations',(SELECT count(*) FROM b1_registrations r
     JOIN b1_to_mint n USING (firm_crd)),
  'source_registrations',6602
)::text
WHERE sr.source_dataset_id='iapd_state_compilation'
  AND sr.release_label='IA_FIRM_STATE_Feed_09_30_2026'
  AND NOT EXISTS (SELECT 1 FROM b1_release_before);

DO $$
DECLARE release_id uuid;
BEGIN
  SELECT id INTO STRICT release_id FROM source_releases
  WHERE source_dataset_id='iapd_state_compilation' AND release_label='IA_FIRM_STATE_Feed_09_30_2026';
  IF (SELECT count(*) FROM jurisdiction_registrations WHERE source_release_id=release_id)<>6602
     OR (SELECT count(DISTINCT firm_id) FROM jurisdiction_registrations
           WHERE source_release_id=release_id AND raw->>'b1_created_firm'='true')<>
           (SELECT (notes::jsonb->>'created_firms')::integer FROM source_releases WHERE id=release_id)
     OR (SELECT count(*) FROM jurisdiction_registrations
           WHERE source_release_id=release_id AND raw->>'b1_created_firm'='true')<>
           (SELECT (notes::jsonb->>'created_firm_registrations')::integer FROM source_releases WHERE id=release_id)
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations
                WHERE source_release_id=release_id AND (subject_kind<>'firm' OR person_id IS NOT NULL
                       OR publication_allowed OR registration_type<>'STATE_REGISTERED_IA')) THEN
    RAISE EXCEPTION 'B1 post-load recount failed';
  END IF;
END $$;
COMMIT;
