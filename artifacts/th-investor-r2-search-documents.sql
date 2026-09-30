-- R2 branch packet only. Do not execute in production under TH-INVESTOR-2026-09-30-PUBLICATION-R2.
-- Publication metadata for the 5,491 B1-created firm CRDs; no legacy registrations or ADV facts.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';
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
     OR (SELECT count(DISTINCT firm_id) FROM jurisdiction_registrations
         WHERE source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
           AND raw->>'b1_created_firm'='true')<>5491
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations j
         JOIN search_documents sd ON sd.entity_kind='firm' AND sd.entity_id=j.firm_id
         WHERE j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
           AND j.raw->>'b1_created_firm'='true') THEN
    RAISE EXCEPTION 'R2 search-document target changed';
  END IF;
  INSERT INTO search_documents (
    entity_kind, entity_id, slug, display_name, search_document, identifiers,
    registration_types, is_synthetic, indexable
  )
  SELECT 'firm', f.id, f.slug, f.display_name,
    to_tsvector('simple', f.display_name || ' ' || f.legal_name || ' ' || crd.identifier_value),
    ARRAY[crd.identifier_value], ARRAY['STATE_REGISTERED_IA'], false, true
  FROM firms f
  JOIN firm_identifiers crd ON crd.firm_id=f.id AND crd.identifier_type='crd'
  WHERE NOT f.is_synthetic
    AND EXISTS (
      SELECT 1 FROM jurisdiction_registrations j
      WHERE j.firm_id=f.id
        AND j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
        AND j.source_dataset_id='iapd_state_compilation'
        AND j.registration_type='STATE_REGISTERED_IA'
        AND j.status='APPROVED' AND j.subject_kind='firm' AND j.person_id IS NULL
        AND j.identity_confidence='CONFIRMED' AND j.is_current
        AND j.raw->>'b1_created_firm'='true'
        AND j.raw->>'firm_crd'=crd.identifier_value
    );
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>5491 THEN RAISE EXCEPTION 'R2 search documents inserted % instead of 5491',changed; END IF;
END $$;
COMMIT;
