-- Run only after the September 30 publication-flag rollback.
-- Exact release membership plus full projection equality bounds deletion.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';
CREATE TEMP TABLE r2_expected ON COMMIT DROP AS
SELECT f.id AS firm_id, f.slug, f.display_name,
  setweight(to_tsvector('simple', coalesce(f.display_name, '')), 'A') ||
  setweight(to_tsvector('simple', crd.identifier_value), 'A') AS search_document,
  ARRAY[crd.identifier_value] AS identifiers
FROM firms f JOIN firm_identifiers crd ON crd.firm_id=f.id AND crd.identifier_type='crd'
WHERE NOT f.is_synthetic AND EXISTS (
  SELECT 1 FROM jurisdiction_registrations j WHERE j.firm_id=f.id
    AND j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
    AND j.source_dataset_id='iapd_state_compilation'
    AND j.registration_type='STATE_REGISTERED_IA'
    AND j.status='APPROVED' AND j.subject_kind='firm' AND j.person_id IS NULL
    AND j.identity_confidence='CONFIRMED' AND j.is_current
    AND j.raw->>'b1_created_firm'='true'
    AND j.raw->>'firm_crd'=crd.identifier_value);
DO $$
DECLARE changed integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM source_releases
      WHERE id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
        AND source_dataset_id='iapd_state_compilation'
        AND release_label='IA_FIRM_STATE_Feed_09_30_2026'
        AND checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c')
     OR (SELECT count(*) FROM jurisdiction_registrations
         WHERE source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid)<>6602
     OR (SELECT count(*) FROM r2_expected)<>5491
     OR (SELECT count(DISTINCT firm_id) FROM r2_expected)<>5491
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations
         WHERE source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
           AND publication_allowed)
     OR EXISTS (SELECT 1 FROM r2_expected e
         JOIN search_documents sd ON sd.entity_kind='firm' AND sd.entity_id=e.firm_id
         WHERE sd.slug IS DISTINCT FROM e.slug
            OR sd.display_name IS DISTINCT FROM e.display_name
            OR sd.search_document IS DISTINCT FROM e.search_document
            OR sd.identifiers IS DISTINCT FROM e.identifiers
            OR sd.registration_types IS DISTINCT FROM ARRAY['STATE_REGISTERED_IA']
            OR sd.city IS NOT NULL OR sd.region IS NOT NULL OR sd.postal_code IS NOT NULL
            OR sd.is_synthetic IS DISTINCT FROM false OR sd.indexable IS DISTINCT FROM true)
  THEN RAISE EXCEPTION 'R2 search-document rollback source, publication, or projection conflict'; END IF;
  DELETE FROM search_documents sd USING r2_expected e
  WHERE sd.entity_kind='firm' AND sd.entity_id=e.firm_id;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF EXISTS (SELECT 1 FROM r2_expected e JOIN search_documents sd
      ON sd.entity_kind='firm' AND sd.entity_id=e.firm_id)
  THEN RAISE EXCEPTION 'R2 search-document rollback incomplete'; END IF;
  RAISE NOTICE 'R2 search-document REMOVED=%',changed;
END $$;
COMMIT;
