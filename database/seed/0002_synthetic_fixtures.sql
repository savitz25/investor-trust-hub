-- Synthetic development data — not a real person or firm.
-- Do not expose these rows as official evidence.

INSERT INTO people (
    id, slug, display_name, given_name, family_name, middle_name,
    professional_kinds, is_synthetic, current_as_of
) VALUES
    ('00000000-0000-4000-a000-000000000001', 'jordan-p-elmwood', 'Jordan P. Elmwood', 'Jordan', 'Elmwood', 'P',
     ARRAY['investment_adviser_representative'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-a000-000000000002', 'samira-n-brookfield', 'Samira N. Brookfield', 'Samira', 'Brookfield', 'N',
     ARRAY['dual_registrant'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-a000-000000000003', 'casey-quill', 'Casey Quill', 'Casey', 'Quill', NULL,
     ARRAY['broker'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-a000-000000000004', 'rowan-k-harbor', 'Rowan K. Harbor', 'Rowan', 'Harbor', 'K',
     ARRAY['commodity_associated_person'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-a000-000000000005', 'morgan-ellsworth', 'Morgan Ellsworth', 'Morgan', 'Ellsworth', NULL,
     ARRAY['investment_adviser_representative'], TRUE, '2026-08-01T12:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_synthetic = TRUE;

INSERT INTO firms (
    id, slug, legal_name, display_name, dba_names, firm_kinds, is_synthetic, current_as_of
) VALUES
    ('00000000-0000-4000-b000-000000000001', 'northbridge-ledger-advisors',
     'Northbridge Ledger Advisors LLC', 'Northbridge Ledger Advisors',
     ARRAY['Northbridge Ledger'], ARRAY['registered_investment_adviser'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-b000-000000000002', 'cedar-pine-wealth',
     'Cedar & Pine Wealth Management, Inc.', 'Cedar & Pine Wealth',
     ARRAY[]::TEXT[], ARRAY['dual_ria_broker_dealer'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-b000-000000000003', 'riverstone-capital-markets',
     'Riverstone Capital Markets LLC', 'Riverstone Capital Markets',
     ARRAY['Riverstone'], ARRAY['broker_dealer'], TRUE, '2026-08-01T12:00:00Z'),
    ('00000000-0000-4000-b000-000000000004', 'harborline-futures-advisory',
     'Harborline Futures Advisory LP', 'Harborline Futures Advisory',
     ARRAY[]::TEXT[], ARRAY['commodity_trading_adviser'], TRUE, '2026-08-01T12:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    is_synthetic = TRUE;

INSERT INTO person_identifiers (person_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
VALUES
    ('00000000-0000-4000-a000-000000000001', 'crd', 'SYN-CRD-P2001', 'sec', TRUE),
    ('00000000-0000-4000-a000-000000000002', 'crd', 'SYN-CRD-P2002', 'finra', TRUE),
    ('00000000-0000-4000-a000-000000000003', 'crd', 'SYN-CRD-P2003', 'finra', TRUE),
    ('00000000-0000-4000-a000-000000000004', 'nfa_id', 'SYN-NFA-P2004', 'nfa', TRUE),
    ('00000000-0000-4000-a000-000000000005', 'crd', 'SYN-CRD-P2005', 'sec', TRUE)
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

INSERT INTO firm_identifiers (firm_id, identifier_type, identifier_value, issuing_authority_id, is_primary)
VALUES
    ('00000000-0000-4000-b000-000000000001', 'crd', 'SYN-CRD-F1001', 'sec', TRUE),
    ('00000000-0000-4000-b000-000000000001', 'sec_file_number', 'SYN-801-1001', 'sec', FALSE),
    ('00000000-0000-4000-b000-000000000002', 'crd', 'SYN-CRD-F1002', 'finra', TRUE),
    ('00000000-0000-4000-b000-000000000002', 'sec_file_number', 'SYN-801-1002', 'sec', FALSE),
    ('00000000-0000-4000-b000-000000000003', 'crd', 'SYN-CRD-F1003', 'finra', TRUE),
    ('00000000-0000-4000-b000-000000000004', 'nfa_id', 'SYN-NFA-F1004', 'nfa', TRUE)
ON CONFLICT (identifier_type, identifier_value) DO NOTHING;

INSERT INTO branches (
    id, firm_id, name, address_line_1, city, region, postal_code, country, is_main_office, is_synthetic
) VALUES
    ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
     'Portland research office', '100 Imaginary Ledger Way', 'Portland', 'OR', '97201', 'US', TRUE, TRUE),
    ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000002',
     'Main office', '50 Fictional Cedar Plaza', 'Madison', 'WI', '53703', 'US', TRUE, TRUE),
    ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-b000-000000000003',
     'Chicago branch', '1 Synthetic Exchange Row', 'Chicago', 'IL', '60601', 'US', TRUE, TRUE),
    ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-000000000004',
     'Harbor office', '9 Example Wharf', 'Boston', 'MA', '02110', 'US', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO registrations (
    id, subject_kind, person_id, firm_id, regulator_authority_id, registration_type,
    status, commenced_on, ended_on, is_current, is_synthetic
) VALUES
    ('00000000-0000-4000-d000-000000000001', 'person', '00000000-0000-4000-a000-000000000001',
     '00000000-0000-4000-b000-000000000001', 'sec', 'investment_adviser_representative',
     'registered', '2019-03-01', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000002', 'person', '00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-b000-000000000002', 'finra', 'broker',
     'registered', '2016-07-12', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000003', 'person', '00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-b000-000000000002', 'sec', 'investment_adviser_representative',
     'registered', '2018-01-08', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000004', 'person', '00000000-0000-4000-a000-000000000003',
     '00000000-0000-4000-b000-000000000003', 'finra', 'broker',
     'terminated', '2014-05-20', '2022-11-30', FALSE, TRUE),
    ('00000000-0000-4000-d000-000000000005', 'person', '00000000-0000-4000-a000-000000000004',
     '00000000-0000-4000-b000-000000000004', 'nfa', 'associated_person',
     'registered', '2021-09-15', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000006', 'firm', NULL,
     '00000000-0000-4000-b000-000000000001', 'sec', 'registered_investment_adviser',
     'registered', '2012-04-01', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000007', 'firm', NULL,
     '00000000-0000-4000-b000-000000000002', 'sec', 'registered_investment_adviser',
     'registered', '2008-06-01', NULL, TRUE, TRUE),
    ('00000000-0000-4000-d000-000000000008', 'firm', NULL,
     '00000000-0000-4000-b000-000000000003', 'finra', 'broker_dealer',
     'registered', '2005-02-14', NULL, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO person_firm_associations (
    id, person_id, firm_id, branch_id, role, started_on, ended_on, is_current, is_synthetic
) VALUES
    ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000001',
     '00000000-0000-4000-b000-000000000001', '00000000-0000-4000-c000-000000000001',
     'Investment adviser representative', '2019-03-01', NULL, TRUE, TRUE),
    ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-a000-000000000002',
     '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-c000-000000000002',
     'Dual registrant', '2016-07-12', NULL, TRUE, TRUE),
    ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-a000-000000000003',
     '00000000-0000-4000-b000-000000000003', NULL,
     'Registered representative', '2014-05-20', '2022-11-30', FALSE, TRUE),
    ('00000000-0000-4000-e000-000000000004', '00000000-0000-4000-a000-000000000004',
     '00000000-0000-4000-b000-000000000004', NULL,
     'Associated person', '2021-09-15', NULL, TRUE, TRUE),
    ('00000000-0000-4000-e000-000000000005', '00000000-0000-4000-a000-000000000005',
     '00000000-0000-4000-b000-000000000001', NULL,
     'Investment adviser representative', '2024-01-10', NULL, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO disclosure_events (
    id, person_id, firm_id, event_kind, reported_status, occurred_on, reported_on,
    summary_source_text, source_system_id, source_record_identifier, is_synthetic
) VALUES
    ('00000000-0000-4000-f000-000000000001',
     '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-b000-000000000003',
     'customer_complaint', 'Closed — as reported by the synthetic source record',
     '2020-04-11', '2020-05-02',
     'SYNTHETIC SOURCE TEXT: A fictional customer complaint was reported and later closed. This is not a real regulatory event. Synthetic development data — not a real person or firm.',
     'synthetic_dev', 'SYN-DISC-3001', TRUE),
    ('00000000-0000-4000-f000-000000000002',
     '00000000-0000-4000-a000-000000000002', NULL,
     'regulatory', 'Resolved — as reported by the synthetic source record',
     '2017-09-01', '2017-10-18',
     'SYNTHETIC SOURCE TEXT: A fictional late-filing notice was reported as resolved. This is not a real regulatory action. Synthetic development data — not a real person or firm.',
     'synthetic_dev', 'SYN-DISC-3002', TRUE),
    ('00000000-0000-4000-f000-000000000003',
     NULL, '00000000-0000-4000-b000-000000000003',
     'regulatory', 'Historical — as reported by the synthetic source record',
     '2011-02-22', '2011-03-15',
     'SYNTHETIC SOURCE TEXT: A fictional books-and-records examination finding. This is not a real firm action. Synthetic development data — not a real person or firm.',
     'synthetic_dev', 'SYN-DISC-3003', TRUE)
ON CONFLICT (source_system_id, source_record_identifier) DO NOTHING;

INSERT INTO evidence_records (
    id, source_authority_id, source_system_id, source_dataset_id,
    source_document_name, source_record_identifier, retrieved_at,
    raw_value, normalized_value, transform_version, subject_kind, subject_id,
    field_name, evidence_status, is_current, is_synthetic
) VALUES
    ('00000000-0000-4000-aa00-000000000001', 'synthetic', 'synthetic_dev', 'synthetic_fixtures',
     'Task 001 synthetic development fixtures', 'SYN-CRD-P2001', '2026-08-01T12:00:00Z',
     '{"displayName":"Jordan P. Elmwood"}'::jsonb,
     '{"displayName":"Jordan P. Elmwood"}'::jsonb,
     'task-001-foundation', 'person', '00000000-0000-4000-a000-000000000001',
     'display_name', 'reported_by_source', TRUE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO search_documents (
    entity_kind, entity_id, slug, display_name, identifiers, city, region, postal_code,
    registration_types, is_synthetic, indexable
) VALUES
    ('person', '00000000-0000-4000-a000-000000000001', 'jordan-p-elmwood', 'Jordan P. Elmwood',
     ARRAY['SYN-CRD-P2001'], 'Portland', 'OR', '97201', ARRAY['investment_adviser_representative'], TRUE, FALSE),
    ('person', '00000000-0000-4000-a000-000000000002', 'samira-n-brookfield', 'Samira N. Brookfield',
     ARRAY['SYN-CRD-P2002'], 'Madison', 'WI', '53703', ARRAY['broker', 'investment_adviser_representative'], TRUE, FALSE),
    ('person', '00000000-0000-4000-a000-000000000003', 'casey-quill', 'Casey Quill',
     ARRAY['SYN-CRD-P2003'], 'Chicago', 'IL', '60601', ARRAY['broker'], TRUE, FALSE),
    ('person', '00000000-0000-4000-a000-000000000004', 'rowan-k-harbor', 'Rowan K. Harbor',
     ARRAY['SYN-NFA-P2004'], 'Boston', 'MA', '02110', ARRAY['associated_person'], TRUE, FALSE),
    ('person', '00000000-0000-4000-a000-000000000005', 'morgan-ellsworth', 'Morgan Ellsworth',
     ARRAY['SYN-CRD-P2005'], 'Portland', 'OR', '97201', ARRAY['investment_adviser_representative'], TRUE, FALSE),
    ('firm', '00000000-0000-4000-b000-000000000001', 'northbridge-ledger-advisors', 'Northbridge Ledger Advisors',
     ARRAY['SYN-CRD-F1001', 'SYN-801-1001'], 'Portland', 'OR', '97201', ARRAY['registered_investment_adviser'], TRUE, FALSE),
    ('firm', '00000000-0000-4000-b000-000000000002', 'cedar-pine-wealth', 'Cedar & Pine Wealth',
     ARRAY['SYN-CRD-F1002', 'SYN-801-1002'], 'Madison', 'WI', '53703', ARRAY['registered_investment_adviser'], TRUE, FALSE),
    ('firm', '00000000-0000-4000-b000-000000000003', 'riverstone-capital-markets', 'Riverstone Capital Markets',
     ARRAY['SYN-CRD-F1003'], 'Chicago', 'IL', '60601', ARRAY['broker_dealer'], TRUE, FALSE),
    ('firm', '00000000-0000-4000-b000-000000000004', 'harborline-futures-advisory', 'Harborline Futures Advisory',
     ARRAY['SYN-NFA-F1004'], 'Boston', 'MA', '02110', ARRAY['commodity_trading_adviser'], TRUE, FALSE)
ON CONFLICT (entity_kind, entity_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_synthetic = TRUE,
    indexable = FALSE;
