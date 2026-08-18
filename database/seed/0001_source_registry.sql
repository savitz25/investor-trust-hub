-- Canonical source registry rows. Configuration, not ingested production data.

INSERT INTO source_authorities (id, name, official_url, notes) VALUES
    ('sec', 'U.S. Securities and Exchange Commission', 'https://www.sec.gov',
     'Federal securities regulator for advisers, funds, issuers, and EDGAR filings.'),
    ('finra', 'Financial Industry Regulatory Authority', 'https://www.finra.org',
     'Broker-dealer and registered-person research. BrokerCheck has special permitted-use constraints.'),
    ('nfa', 'National Futures Association', 'https://www.nfa.futures.org',
     'Futures and commodities self-regulatory organization.'),
    ('cftc', 'U.S. Commodity Futures Trading Commission', 'https://www.cftc.gov',
     'Federal commodities and derivatives regulator.'),
    ('state_securities', 'State securities regulators', 'https://www.nasaa.org',
     'State notice filings, IAR registrations, and enforcement.'),
    ('synthetic', 'Synthetic development source', 'https://github.com/savitz25/investor-trust-hub',
     'Not an official authority. Development fixtures only.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url,
    notes = EXCLUDED.notes;

INSERT INTO source_systems (
    id, authority_id, name, official_url, dataset_kind,
    attribution_required, marketing_restricted, prospecting_prohibited,
    freshness_requirement_notes, correction_notes
) VALUES
    ('iapd', 'sec', 'Investment Adviser Public Disclosure (IAPD / IARD)',
     'https://adviserinfo.sec.gov', 'adviser_and_iar', TRUE, FALSE, FALSE,
     'ADV and IAR records change; display retrieved/effective dates.',
     'Corrections belong at the official IAPD/IARD filing.'),
    ('form_adv', 'sec', 'Form ADV / IARD adviser filings',
     'https://www.sec.gov/information-for/investment-advisers', 'adviser_filing', TRUE, FALSE, FALSE,
     'Annual and other-than-annual amendments.',
     'Preserve raw filing values when later amendments supersede them.'),
    ('brokercheck', 'finra', 'FINRA BrokerCheck',
     'https://brokercheck.finra.org', 'broker_and_bd', TRUE, TRUE, TRUE,
     'BrokerCheck data may have freshness, attribution, correction, and marketing restrictions.',
     'Never treat BrokerCheck extracts as a sales-prospecting database.'),
    ('edgar', 'sec', 'SEC EDGAR',
     'https://www.sec.gov/edgar', 'issuer_filing', TRUE, FALSE, FALSE,
     'Filings are point-in-time. Keep accession-level provenance.',
     'Amendments are new filings, not overwrites.'),
    ('sec_investment_company', 'sec', 'SEC investment company data',
     'https://www.sec.gov/data-research/sec-markets-data/investment-company-series-class',
     'registered_fund', TRUE, FALSE, FALSE,
     'Series/class identities change; keep historical mappings.',
     'Do not invent CUSIP/ISIN/ticker links without an official mapping.'),
    ('nfa_basic', 'nfa', 'NFA BASIC',
     'https://www.nfa.futures.org/basicnet/', 'commodity_professional', TRUE, FALSE, FALSE,
     'Registration and disciplinary records change; store observed-at.',
     'Cite BASIC record identifiers; do not paraphrase into accusations.'),
    ('cftc', 'cftc', 'CFTC public enforcement and registration sources',
     'https://www.cftc.gov', 'commodity_enforcement', TRUE, FALSE, FALSE,
     'Enforcement dockets are not a complete fitness history.',
     'Distinguish allegations, settlements, and judgments.'),
    ('synthetic_dev', 'synthetic', 'Synthetic development fixtures',
     'https://github.com/savitz25/investor-trust-hub', 'development_only', TRUE, TRUE, TRUE,
     'Not a regulatory source.',
     'Must always display the synthetic disclaimer.')
ON CONFLICT (id) DO UPDATE SET
    authority_id = EXCLUDED.authority_id,
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url,
    dataset_kind = EXCLUDED.dataset_kind,
    attribution_required = EXCLUDED.attribution_required,
    marketing_restricted = EXCLUDED.marketing_restricted,
    prospecting_prohibited = EXCLUDED.prospecting_prohibited,
    freshness_requirement_notes = EXCLUDED.freshness_requirement_notes,
    correction_notes = EXCLUDED.correction_notes;

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url) VALUES
    ('form_adv', 'form_adv', 'Form ADV', 'Adviser registration and brochure filings.', ARRAY['firm', 'filing'], 'https://www.sec.gov'),
    ('iapd_individuals', 'iapd', 'IAPD individuals', 'Investment adviser representative records.', ARRAY['person', 'registration'], 'https://adviserinfo.sec.gov'),
    ('brokercheck_individuals', 'brokercheck', 'BrokerCheck individuals', 'Registered representative research records.', ARRAY['person', 'registration', 'disclosure'], 'https://brokercheck.finra.org'),
    ('brokercheck_firms', 'brokercheck', 'BrokerCheck firms', 'Broker-dealer research records.', ARRAY['firm', 'branch', 'disclosure'], 'https://brokercheck.finra.org'),
    ('edgar_submissions', 'edgar', 'EDGAR submissions', 'Issuer and fund filings.', ARRAY['issuer', 'product', 'filing'], 'https://www.sec.gov/edgar'),
    ('ncen_nport', 'sec_investment_company', 'N-CEN / N-PORT', 'Registered fund census and holdings.', ARRAY['product', 'issuer'], NULL),
    ('nfa_basic_entities', 'nfa_basic', 'NFA BASIC entities', 'Commodity firm and associated person records.', ARRAY['person', 'firm', 'registration'], 'https://www.nfa.futures.org/basicnet/'),
    ('synthetic_fixtures', 'synthetic_dev', 'Task 001 synthetic fixtures', 'Development-only labeled records.', ARRAY['person', 'firm', 'registration', 'disclosure'], NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    expected_entity_kinds = EXCLUDED.expected_entity_kinds;
