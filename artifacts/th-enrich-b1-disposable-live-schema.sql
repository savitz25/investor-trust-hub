-- Disposable PostgreSQL fixture matching the inspected live registration columns,
-- six-value CHECK, subject check, and firm uniqueness shape. Never run on production.
CREATE TABLE jurisdiction_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind text NOT NULL CHECK (subject_kind IN ('person','firm')),
  person_id uuid,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  jurisdiction char(2) NOT NULL,
  registration_type text NOT NULL,
  regulator_authority text NOT NULL,
  regulator_authority_id text NOT NULL REFERENCES source_authorities(id),
  status text NOT NULL,
  status_raw text,
  effective_date date,
  termination_date date,
  source_dataset_id text NOT NULL REFERENCES source_datasets(id),
  source_record_id text NOT NULL,
  source_release_id uuid REFERENCES source_releases(id),
  source_observed_at timestamptz NOT NULL DEFAULT now(),
  identity_confidence text NOT NULL CHECK (identity_confidence IN
    ('CONFIRMED','HIGH_CONFIDENCE','REVIEW_REQUIRED','UNRESOLVED')),
  match_basis text,
  is_current boolean NOT NULL DEFAULT false,
  publication_allowed boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jurisdiction_registrations_subject_chk CHECK
    ((subject_kind='person' AND person_id IS NOT NULL) OR
     (subject_kind='firm' AND firm_id IS NOT NULL)),
  CONSTRAINT jurisdiction_registrations_registration_type_check CHECK
    (registration_type IN (
      'FL_NOTICE_FILED_SEC_RIA', 'FL_STATE_REGISTERED_IA',
      'FL_STATE_ERA_REPORTING', 'investment_adviser_representative',
      'FL_CURRENT_IAR', 'FL_APP_PEND_IARCE'
    ))
);
CREATE UNIQUE INDEX jurisdiction_registrations_firm_uniq
  ON jurisdiction_registrations
  (firm_id,jurisdiction,registration_type,source_dataset_id,source_record_id)
  WHERE subject_kind='firm';

INSERT INTO source_datasets
  (id,source_system_id,name,description,expected_entity_kinds,official_url)
VALUES ('iapd_state_compilation','iapd','IAPD State Investment Adviser compilation',
        'Disposable B1 fixture',ARRAY['firm','registration'],
        'https://adviserinfo.sec.gov/compilation');

CREATE TEMP TABLE b1_existing_bridge (firm_crd text NOT NULL, existing_firm_id uuid NOT NULL);
\copy b1_existing_bridge FROM 'artifacts/th-enrich-b1-current/iapd_state_existing_firm_bridges.csv' CSV HEADER
INSERT INTO firms (id,slug,legal_name,display_name,is_synthetic)
SELECT existing_firm_id,'sec-crd-'||firm_crd,'Existing CRD '||firm_crd,
       'Existing CRD '||firm_crd,false FROM b1_existing_bridge;
INSERT INTO firm_identifiers (firm_id,identifier_type,identifier_value,issuing_authority_id,is_primary)
SELECT existing_firm_id,'crd',firm_crd,'sec',true FROM b1_existing_bridge;

DO $$ BEGIN
  IF (SELECT count(*) FROM firms)<>451 OR (SELECT count(*) FROM firm_identifiers)<>451 THEN
    RAISE EXCEPTION 'disposable B1 fixture count failed';
  END IF;
END $$;
