-- Official source date for IA_FIRM_STATE_Feed_09_30_2026.
-- August IAPD semantics: published_at is the source release date at 00:00:00Z.
-- Do not substitute created_at, retrieved_at, deployment time, or activation time.
-- Apply at the Founder gate. Absent row is a no-op so empty CI schemas still migrate.
DO $$
DECLARE
  matched integer;
BEGIN
  IF to_regclass('public.source_releases') IS NULL THEN
    RAISE NOTICE 'source_releases absent; published_at not set';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM source_releases
    WHERE id = 'a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
      AND source_dataset_id = 'iapd_state_compilation'
      AND release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
      AND checksum_sha256 = '23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c'
      AND published_at = '2026-09-30T00:00:00Z'::timestamptz
  ) THEN
    RETURN;
  END IF;

  UPDATE source_releases
  SET published_at = '2026-09-30T00:00:00Z'::timestamptz
  WHERE id = 'a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
    AND source_dataset_id = 'iapd_state_compilation'
    AND release_label = 'IA_FIRM_STATE_Feed_09_30_2026'
    AND checksum_sha256 = '23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c';
  GET DIAGNOSTICS matched = ROW_COUNT;

  IF matched = 1 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM source_releases
    WHERE id = 'a89165b8-b60a-4b31-9009-8b2a0291f8f8'::uuid
  ) THEN
    RAISE EXCEPTION 'September IAPD release identity did not match the official published_at update';
  END IF;

  RAISE NOTICE 'September IAPD release row absent; published_at not set';
END $$;

INSERT INTO schema_migrations (filename)
VALUES ('0017_iapd_state_feed_2026_09_30_published_at.sql')
ON CONFLICT (filename) DO NOTHING;
