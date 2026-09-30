-- TH-INVESTOR-2026-09-30-PUBLICATION-PREP
-- DRAFT ONLY. Do not execute until Evidence Activation independently records
-- VERIFIED in this exact source release's notes and the public state-adviser
-- surface is deployed and separately approved. This script cannot pass today.
-- The only persistent change is this release's publication_allowed flag.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

DO $$
DECLARE
  release_row source_releases%ROWTYPE;
  changed integer;
BEGIN
  SELECT * INTO STRICT release_row FROM source_releases
  WHERE id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
    AND source_dataset_id='iapd_state_compilation'
    AND release_label='IA_FIRM_STATE_Feed_09_30_2026'
    AND checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';

  IF release_row.notes::jsonb->>'evidence_postload_verdict' IS DISTINCT FROM 'VERIFIED'
     OR NULLIF(release_row.notes::jsonb->>'evidence_postload_receipt_url','') IS NULL THEN
    RAISE EXCEPTION 'Independent Evidence Activation VERIFIED receipt is absent';
  END IF;
  IF (release_row.notes::jsonb->>'created_firms')::integer<>5491
     OR (release_row.notes::jsonb->>'created_firm_registrations')::integer<>5993
     OR (release_row.notes::jsonb->>'source_registrations')::integer<>6602 THEN
    RAISE EXCEPTION 'Certified release metadata changed';
  END IF;
  IF (SELECT count(*) FROM jurisdiction_registrations
      WHERE source_release_id=release_row.id)<>6602
     OR (SELECT count(DISTINCT firm_id) FROM jurisdiction_registrations
         WHERE source_release_id=release_row.id)<>5942
     OR EXISTS (
       SELECT 1 FROM jurisdiction_registrations j
       LEFT JOIN firms f ON f.id=j.firm_id
       LEFT JOIN firm_identifiers fi ON fi.firm_id=j.firm_id
          AND fi.identifier_type='crd' AND fi.identifier_value=j.raw->>'firm_crd'
       WHERE j.source_release_id=release_row.id
         AND (j.source_dataset_id<>'iapd_state_compilation'
           OR j.registration_type<>'STATE_REGISTERED_IA'
           OR j.status<>'APPROVED' OR j.subject_kind<>'firm'
           OR j.person_id IS NOT NULL OR j.identity_confidence<>'CONFIRMED'
           OR j.publication_allowed OR j.jurisdiction NOT IN ('CA','TX','AZ','WA')
           OR f.id IS NULL OR f.is_synthetic OR fi.id IS NULL)
     )
     OR EXISTS (
       SELECT 1 FROM jurisdiction_registrations
       WHERE source_release_id=release_row.id
       GROUP BY raw->>'firm_crd',jurisdiction HAVING count(*)<>1
     ) THEN
    RAISE EXCEPTION 'September IAPD batch identity, status or publication guard failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('CA',3336),('TX',1992),('AZ',674),('WA',600)) AS e(state,n)
    LEFT JOIN (
      SELECT jurisdiction,count(*) AS n FROM jurisdiction_registrations
      WHERE source_release_id=release_row.id GROUP BY jurisdiction
    ) a ON a.jurisdiction=e.state
    WHERE a.n IS DISTINCT FROM e.n
  ) THEN
    RAISE EXCEPTION 'State counts changed';
  END IF;

  UPDATE jurisdiction_registrations SET publication_allowed=true
  WHERE source_release_id=release_row.id
    AND source_dataset_id='iapd_state_compilation'
    AND registration_type='STATE_REGISTERED_IA'
    AND status='APPROVED'
    AND publication_allowed=false;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>6602 THEN RAISE EXCEPTION 'Activation updated % instead of 6602',changed; END IF;
END $$;
COMMIT;
