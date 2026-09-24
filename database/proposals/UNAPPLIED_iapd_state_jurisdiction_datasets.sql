-- UNAPPLIED PROPOSAL. Do not put this file in database/migrations.
-- apply_migrations.py only reads database/migrations, and this file must stay out of that directory
-- until a founder approves a non-production apply.
--
-- state_registration_observations.source_dataset_id references source_datasets(id).
-- The nine IDs below are not in database/seed or database/migrations as of this proposal.
--
-- Do not reuse sec_ia_ria or sec_ia_era. Those datasets are the monthly SEC-registered
-- and SEC exempt-reporting firm rosters. They are not Oregon/Arizona/Washington
-- state-IA, state-ERA, or notice-filing observations.
-- Do not reuse sec_ia_iapd_compilation. That row is the SEC current-firm compilation
-- snapshot, not a per-state registration observation.
--
-- One existing source system: iapd (IAPD / IARD), authority sec.
-- State-IA and state-ERA rows come from IA_FIRM_STATE_Feed.
-- Notice-filing rows come from IA_FIRM_SEC_Feed NoticeFiled/States.

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url) VALUES
    ('iapd_state_ia_or_2026_09_10', 'iapd', 'IAPD Oregon state-IA registration observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where StateRgstn/Rgltr/@Cd=OR. Not an SEC-registered roster and not an endorsement.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_state_era_or_2026_09_10', 'iapd', 'IAPD Oregon state-ERA observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where ERA/Rgltr/@Cd=OR. An exempt reporting adviser is not a state-registered IA.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_notice_filing_or_2026_09_10', 'iapd', 'IAPD Oregon notice-filing observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_SEC_Feed NoticeFiled/States/@RgltrCd=OR. A notice filing is not state registration.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_09_10_2026.xml.gz'),
    ('iapd_state_ia_az_2026_09_10', 'iapd', 'IAPD Arizona state-IA registration observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where StateRgstn/Rgltr/@Cd=AZ. Not an SEC-registered roster and not an endorsement.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_state_era_az_2026_09_10', 'iapd', 'IAPD Arizona state-ERA observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where ERA/Rgltr/@Cd=AZ. An exempt reporting adviser is not a state-registered IA.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_notice_filing_az_2026_09_10', 'iapd', 'IAPD Arizona notice-filing observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_SEC_Feed NoticeFiled/States/@RgltrCd=AZ. A notice filing is not state registration.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_09_10_2026.xml.gz'),
    ('iapd_state_ia_wa_2026_09_10', 'iapd', 'IAPD Washington state-IA registration observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where StateRgstn/Rgltr/@Cd=WA. Not an SEC-registered roster and not an endorsement.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_state_era_wa_2026_09_10', 'iapd', 'IAPD Washington state-ERA observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_STATE_Feed where ERA/Rgltr/@Cd=WA. An exempt reporting adviser is not a state-registered IA.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_09_10_2026.xml.gz'),
    ('iapd_notice_filing_wa_2026_09_10', 'iapd', 'IAPD Washington notice-filing observations 2026-09-10',
     'Firm CRD observations from IA_FIRM_SEC_Feed NoticeFiled/States/@RgltrCd=WA. A notice filing is not state registration.',
     ARRAY['firm', 'registration'],
     'https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_09_10_2026.xml.gz')
ON CONFLICT (id) DO UPDATE SET
    source_system_id = EXCLUDED.source_system_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    expected_entity_kinds = EXCLUDED.expected_entity_kinds,
    official_url = EXCLUDED.official_url;
