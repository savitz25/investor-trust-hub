-- TH-ENRICH-2026-09-30-B1: permit the four IAPD state adviser slices.
-- Additive to the six registration types verified in production on 2026-09-30.
-- Apply only at the Founder production gate; this migration does not load rows.
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
