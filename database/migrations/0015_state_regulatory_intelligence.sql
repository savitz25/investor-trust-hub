-- NJ-INV-002 — reusable state-regulatory intelligence (exam, policy, registration, issuer filings).
-- Additive. Internal-only by default. Not an NJ-only silo.
-- Does not alter firms, people, public profiles, customer-claim tables, or weaken 0014.

INSERT INTO source_systems (
    id, authority_id, name, official_url, dataset_kind,
    attribution_required, marketing_restricted, prospecting_prohibited,
    freshness_requirement_notes, correction_notes
) VALUES
    ('nj_bos_intel', 'nj_bos', 'NJ Bureau of Securities state regulatory intelligence',
     'https://www.njconsumeraffairs.gov/bos/', 'state_securities_intelligence',
     TRUE, TRUE, TRUE,
     'HTML indexes may be WAF-gated. Official PDFs and NJOAG press pages are canonical when retrieved.',
     'Annual written examinations are risk-assessment tools, not firm pass/fail credentials. General orders are not firm enforcement.')
ON CONFLICT (id) DO UPDATE SET
    authority_id = EXCLUDED.authority_id,
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url;

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url) VALUES
    ('nj_bos_ia_exam', 'nj_bos_intel', 'NJ BOS annual investment adviser written examination',
     'Public sample examinations, glossaries, and official announcements. Firm answers are not public.',
     ARRAY['firm', 'disclosure'],
     'https://www.njconsumeraffairs.gov/bos/Pages/Annual-Investment-Adviser-Exam.aspx'),
    ('nj_bos_general_orders', 'nj_bos_intel', 'NJ BOS orders of general application',
     'Bureau-wide orders. Not respondent enforcement.',
     ARRAY['disclosure'],
     'https://www.njconsumeraffairs.gov/bos/Pages/industry.aspx'),
    ('nj_bos_state_ria', 'nj_bos_intel', 'NJ state-registered investment adviser firm universe',
     'Firm-level state registration observations. No public bulk roster; Form 2 / IARD request path.',
     ARRAY['firm', 'registration'],
     'https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx'),
    ('nj_bos_issuer_filings', 'nj_bos_intel', 'NJ issuer / exemption / crowdfunding / ISO filing classes',
     'Public form inventory and filing-class semantics. No public bulk filing index located.',
     ARRAY['issuer', 'disclosure'],
     'https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx'),
    ('nj_bos_iar_policy', 'nj_bos_intel', 'NJ IAR registration and CE policy observations',
     'Policy layer only. Not an individual IAR roster.',
     ARRAY['disclosure'],
     'https://www.njconsumeraffairs.gov/bos/Pages/Webinar-FAQ.aspx')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS state_registration_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    observation_fingerprint TEXT NOT NULL,
    crd TEXT,
    sec_file_number TEXT,
    legal_name TEXT NOT NULL,
    dba_names TEXT[] NOT NULL DEFAULT '{}',
    registration_jurisdiction TEXT NOT NULL DEFAULT 'NJ',
    registration_class TEXT NOT NULL,
    registration_status TEXT NOT NULL,
    commenced_on DATE,
    ended_on DATE,
    principal_city TEXT,
    principal_region TEXT,
    principal_postal_code TEXT,
    match_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    source_url TEXT,
    source_date DATE,
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, observation_fingerprint)
);

CREATE TABLE IF NOT EXISTS registration_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    crd TEXT NOT NULL,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    effective_on DATE,
    transition_class TEXT NOT NULL CHECK (transition_class IN (
        'STATE_TO_SEC', 'SEC_TO_STATE', 'WITHDRAWAL', 'TERMINATION', 'OTHER'
    )),
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, crd, from_status, to_status, (COALESCE(effective_on::text, '')))
);

CREATE TABLE IF NOT EXISTS regulatory_policy_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    policy_key TEXT NOT NULL,
    title TEXT NOT NULL,
    document_class TEXT NOT NULL,
    effective_on DATE,
    rescinded_on DATE,
    superseded_by_key TEXT,
    source_url TEXT,
    content_hash TEXT,
    current_status TEXT NOT NULL DEFAULT 'CURRENT',
    affected_classes TEXT[] NOT NULL DEFAULT '{}',
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, policy_key)
);

CREATE TABLE IF NOT EXISTS regulatory_policy_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    policy_key TEXT NOT NULL,
    observation_class TEXT NOT NULL,
    effective_year INTEGER,
    raw_text TEXT,
    source_url TEXT,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, policy_key, observation_class, (COALESCE(effective_year, 0)))
);

CREATE TABLE IF NOT EXISTS state_exam_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    exam_year INTEGER NOT NULL,
    release_date DATE,
    deadline DATE,
    sample_exam_url TEXT,
    sample_exam_hash TEXT,
    announcement_url TEXT,
    firm_population_source_text TEXT,
    coverage_state TEXT NOT NULL,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, exam_year)
);

CREATE TABLE IF NOT EXISTS state_exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    exam_year INTEGER NOT NULL,
    question_number TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    required_upload BOOLEAN NOT NULL DEFAULT FALSE,
    conditional BOOLEAN NOT NULL DEFAULT FALSE,
    first_observed_year INTEGER,
    latest_observed_year INTEGER,
    source_document TEXT,
    source_hash TEXT,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, exam_year, question_number)
);

CREATE TABLE IF NOT EXISTS state_exam_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    topic TEXT NOT NULL,
    first_year INTEGER NOT NULL,
    years_present INTEGER[] NOT NULL,
    added_in_year INTEGER,
    removed_after_year INTEGER,
    materially_expanded BOOLEAN NOT NULL DEFAULT FALSE,
    source_support TEXT,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    UNIQUE (source_dataset_id, topic)
);

CREATE TABLE IF NOT EXISTS state_market_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    metric_key TEXT NOT NULL,
    grain TEXT NOT NULL,
    metric_value NUMERIC,
    value_text TEXT,
    exact BOOLEAN NOT NULL DEFAULT FALSE,
    coverage_state TEXT NOT NULL,
    as_of DATE,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, metric_key, grain, (COALESCE(as_of::text, '')))
);

CREATE TABLE IF NOT EXISTS issuer_filing_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    filing_class TEXT NOT NULL,
    form_code TEXT,
    title TEXT NOT NULL,
    availability TEXT NOT NULL,
    statutory_basis TEXT,
    source_url TEXT,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, filing_class, (COALESCE(form_code, '')))
);

CREATE TABLE IF NOT EXISTS issuer_filing_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    observation_fingerprint TEXT NOT NULL,
    filing_class TEXT NOT NULL,
    issuer_legal_name TEXT,
    filing_date DATE,
    sec_identifier TEXT,
    match_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
    issuer_id UUID REFERENCES issuers (id) ON DELETE SET NULL,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, observation_fingerprint)
);

COMMENT ON TABLE state_registration_observations IS
    'Firm-level state registration. STATE_REGISTERED_RIA is not SEC_REGISTERED_RIA. Name-only is rejected.';
COMMENT ON TABLE registration_transitions IS
    'Same CRD remains one firm. Jurisdiction change is a status event.';
COMMENT ON TABLE regulatory_policy_documents IS
    'Orders of general application and similar policy documents. Not firm enforcement.';
COMMENT ON TABLE state_exam_packages IS
    'Annual written IA examinations are regulatory intelligence, not pass/fail credentials.';
COMMENT ON TABLE state_exam_questions IS
    'Public sample questions only. Firm answers are not stored.';
COMMENT ON TABLE issuer_filing_classes IS
    'ISSUER != INVESTMENT ADVISER. Exemption category is not approval.';
COMMENT ON TABLE issuer_filing_observations IS
    'Do not attach issuer filings to RIA profiles on name alone. Form D joins require a stable identifier.';

ALTER TABLE state_registration_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_policy_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_exam_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_market_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuer_filing_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuer_filing_observations ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations (filename)
VALUES ('0015_state_regulatory_intelligence.sql')
ON CONFLICT (filename) DO NOTHING;
