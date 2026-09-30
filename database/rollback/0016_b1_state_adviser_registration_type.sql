-- TH-ENRICH-B1 rollback. Run only after every B1 STATE_REGISTERED_IA row is removed.
-- Restores the exact six-type CHECK observed on the live schema on 2026-09-30.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.jurisdiction_registrations') IS NULL THEN
    RAISE EXCEPTION 'jurisdiction_registrations is absent; rollback target is wrong';
  END IF;
  IF EXISTS (SELECT 1 FROM jurisdiction_registrations WHERE registration_type='STATE_REGISTERED_IA') THEN
    RAISE EXCEPTION 'STATE_REGISTERED_IA rows remain; remove B1 rows before constraint rollback';
  END IF;
END $$;

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
    'FL_APP_PEND_IARCE'
  ));

DELETE FROM schema_migrations
WHERE filename='0016_b1_state_adviser_registration_type.sql';

COMMIT;
