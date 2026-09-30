-- TH-ENRICH-2026-09-30-B1: permit the four IAPD state adviser slices.
-- Additive to the six registration types verified in production on 2026-09-30.
-- Apply only at the Founder production gate; this migration does not load rows.
-- The minimal CI schema does not contain the later live-only registration table.
DO $$
BEGIN
  IF to_regclass('public.jurisdiction_registrations') IS NULL THEN
    RAISE NOTICE 'jurisdiction_registrations absent in this schema; no constraint to widen';
  ELSE
    ALTER TABLE jurisdiction_registrations
      DROP CONSTRAINT jurisdiction_registrations_registration_type_check;

    ALTER TABLE jurisdiction_registrations
      ADD CONSTRAINT jurisdiction_registrations_registration_type_check
      CHECK (registration_type IN (
        'FL_NOTICE_FILED_SEC_RIA',
        'FL_STATE_REGISTERED_IA',
        'FL_STATE_ERA_REPORTING',
        'investment_adviser_representative',
        'FL_CURRENT_IAR',
        'FL_APP_PEND_IARCE',
        'STATE_REGISTERED_IA'
      ));
  END IF;
END $$;

INSERT INTO schema_migrations (filename)
VALUES ('0016_b1_state_adviser_registration_type.sql')
ON CONFLICT (filename) DO NOTHING;
