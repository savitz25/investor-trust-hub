-- Publication rollback only. Keeps all canonical firms, CRDs and registrations.
-- Never substitute this for the B1 data rollback.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

DO $$
DECLARE
  release_id uuid;
  changed integer;
BEGIN
  SELECT id INTO STRICT release_id FROM source_releases
  WHERE id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
    AND source_dataset_id='iapd_state_compilation'
    AND release_label='IA_FIRM_STATE_Feed_09_30_2026'
    AND checksum_sha256='23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';
  IF (SELECT count(*) FROM jurisdiction_registrations
      WHERE source_release_id=release_id)<>6602
     OR (SELECT count(*) FROM jurisdiction_registrations
         WHERE source_release_id=release_id AND publication_allowed)<>6602
     OR EXISTS (SELECT 1 FROM jurisdiction_registrations
                WHERE source_release_id=release_id
                  AND (source_dataset_id<>'iapd_state_compilation'
                       OR registration_type<>'STATE_REGISTERED_IA')) THEN
    RAISE EXCEPTION 'Publication rollback target changed; review required';
  END IF;
  UPDATE jurisdiction_registrations SET publication_allowed=false
  WHERE source_release_id=release_id
    AND source_dataset_id='iapd_state_compilation'
    AND registration_type='STATE_REGISTERED_IA'
    AND publication_allowed=true;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>6602 THEN RAISE EXCEPTION 'Rollback updated % instead of 6602',changed; END IF;
END $$;
COMMIT;
