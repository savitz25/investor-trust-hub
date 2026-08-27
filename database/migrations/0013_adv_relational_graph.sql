-- INV-NAT-002A additive Form ADV relational graph tables.
-- DO NOT APPLY in INV-NAT-002A. Prepared only.
-- Does not alter firms identity, slugs, people, products, disclosure_events,
-- or search_documents.indexable.
-- Historical edges default is_current = FALSE (fail-closed).

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url)
VALUES
    (
        'sec_ia_adv_part1_relational',
        'form_adv',
        'Form ADV Part 1 relational filing tables (IARD FOIA / IAPD)',
        'Multi-table CSV filings including Schedule A/B/D repeating rows. FilingID is the official IARD filing key. Not the monthly flattened IARD firm roster.',
        ARRAY['firm', 'filing', 'person', 'product', 'branch'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_adv_w',
        'form_adv',
        'Form ADV-W withdrawal filings',
        'Official notice of withdrawal from SEC registration or ERA reporting. Not a misconduct event. Absence from a later roster is not itself a withdrawal.',
        ARRAY['firm', 'filing', 'registration'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_adv_part2a',
        'form_adv',
        'Form ADV Part 2A brochure documents',
        'Brochure PDF archives and mapping identifiers. Catalog and hash only. Narrative brochure text is not a metric source.',
        ARRAY['firm', 'filing'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_form_crs',
        'form_adv',
        'Form ADV Part 3 / Form CRS documents',
        'Customer Relationship Summary PDFs mapped to firm CRD via official mapping files. Catalog and hash only.',
        ARRAY['firm', 'filing'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_iapd_compilation',
        'form_adv',
        'IAPD SEC investment adviser compilation XML',
        'Current-firm compilation snapshot. Items 1-11 subset. Does not contain named Schedule A/B/D repeating tables.',
        ARRAY['firm', 'registration'],
        'https://adviserinfo.sec.gov/compilation'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    expected_entity_kinds = EXCLUDED.expected_entity_kinds,
    official_url = EXCLUDED.official_url;

CREATE TABLE IF NOT EXISTS form_adv_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_id TEXT NOT NULL,
    crd TEXT,
    sec_file_number TEXT,
    dataset_kind TEXT NOT NULL CHECK (dataset_kind IN ('ria', 'era', 'advw', 'unknown')),
    form_version TEXT,
    date_submitted DATE,
    filing_types TEXT[] NOT NULL DEFAULT '{}',
    legal_name TEXT,
    business_name TEXT,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID REFERENCES source_releases (id),
    source_file_name TEXT,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, filing_id)
);

CREATE INDEX IF NOT EXISTS form_adv_filings_crd_idx
    ON form_adv_filings (crd, date_submitted DESC);

CREATE INDEX IF NOT EXISTS form_adv_filings_firm_idx
    ON form_adv_filings (firm_id, is_current);

COMMENT ON TABLE form_adv_filings IS
    'Official IARD FilingID is the filing version key. Do not invent an accession number. is_current defaults false.';

CREATE TABLE IF NOT EXISTS form_adv_schedule_ab_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    schedule TEXT NOT NULL CHECK (schedule IN ('A', 'B')),
    owner_kind TEXT NOT NULL CHECK (owner_kind IN ('PERSON', 'ORGANIZATION', 'UNKNOWN')),
    de_fe_i TEXT,
    full_legal_name TEXT,
    owner_id TEXT,
    entity_in_which TEXT,
    title_or_status TEXT,
    status_acquired TEXT,
    ownership_code TEXT,
    control_person TEXT,
    public_reporting TEXT,
    sch_a_3 TEXT,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    person_id UUID REFERENCES people (id) ON DELETE SET NULL,
    organization_firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    source_row_digest TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_row_digest)
);

CREATE INDEX IF NOT EXISTS form_adv_schedule_ab_filing_idx
    ON form_adv_schedule_ab_rows (filing_id, schedule);

CREATE INDEX IF NOT EXISTS form_adv_schedule_ab_owner_idx
    ON form_adv_schedule_ab_rows (owner_id);

COMMENT ON TABLE form_adv_schedule_ab_rows IS
    'Schedule A = direct owners. Schedule B = indirect owners. DE/FE/I distinguishes person vs organization. Name-only rows are REVIEW_REQUIRED. Do not mint public people.';

CREATE TABLE IF NOT EXISTS form_adv_related_person_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    reference_id TEXT,
    legal_name TEXT,
    business_name TEXT,
    related_crd TEXT,
    related_sec_number TEXT,
    related_cik TEXT,
    related_type TEXT,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    related_firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    source_row_digest TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_row_digest)
);

CREATE INDEX IF NOT EXISTS form_adv_related_person_crd_idx
    ON form_adv_related_person_rows (related_crd);

COMMENT ON TABLE form_adv_related_person_rows IS
    'Schedule D 7.A named related persons only. A related-person CRD is CONFIRMED when present. Name-only is REVIEW_REQUIRED. Not a conflict score.';

CREATE TABLE IF NOT EXISTS form_adv_private_fund_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    reference_id TEXT,
    fund_name TEXT,
    fund_id TEXT,
    state TEXT,
    country TEXT,
    exclusion_3c1 TEXT,
    exclusion_3c7 TEXT,
    master_fund TEXT,
    feeder_fund TEXT,
    master_fund_name TEXT,
    master_fund_id TEXT,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    product_id UUID REFERENCES products (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    source_row_digest TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_row_digest)
);

CREATE INDEX IF NOT EXISTS form_adv_private_fund_id_idx
    ON form_adv_private_fund_rows (fund_id);

CREATE INDEX IF NOT EXISTS form_adv_private_fund_filing_idx
    ON form_adv_private_fund_rows (filing_id, reference_id);

COMMENT ON TABLE form_adv_private_fund_rows IS
    'Named Schedule D 7.B.(1) private funds only. Item 7.B counts do not create fund entities. Official Fund ID 805- is CONFIRMED.';

CREATE TABLE IF NOT EXISTS form_adv_fund_service_provider_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    fund_reference_id TEXT,
    provider_role TEXT NOT NULL CHECK (provider_role IN (
        'auditor',
        'prime_broker',
        'custodian',
        'administrator',
        'marketer',
        'general_partner_or_manager',
        'other_official'
    )),
    source_table TEXT NOT NULL,
    provider_name TEXT,
    provider_crd TEXT,
    provider_sec_number TEXT,
    provider_lei TEXT,
    city TEXT,
    region TEXT,
    country TEXT,
    related_person_flag TEXT,
    extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    related_firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    source_row_digest TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_row_digest)
);

CREATE INDEX IF NOT EXISTS form_adv_fund_sp_role_idx
    ON form_adv_fund_service_provider_rows (provider_role, filing_id);

COMMENT ON TABLE form_adv_fund_service_provider_rows IS
    'Named official Schedule D 7.B.(1) service-provider rows only. No inferred vendors.';

CREATE TABLE IF NOT EXISTS form_adv_other_office_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    street_1 TEXT,
    street_2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    country TEXT,
    branch_number TEXT,
    private_residence TEXT,
    telephone_number TEXT,
    employees TEXT,
    source_office_key TEXT NOT NULL,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    branch_id UUID REFERENCES branches (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_office_key)
);

CREATE INDEX IF NOT EXISTS form_adv_other_office_filing_idx
    ON form_adv_other_office_rows (filing_id);

COMMENT ON TABLE form_adv_other_office_rows IS
    'Schedule D 1.F other offices. Identity is FilingID + source_office_key. Not a public branch page.';

CREATE TABLE IF NOT EXISTS form_adv_relying_adviser_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_uuid UUID NOT NULL REFERENCES form_adv_filings (id) ON DELETE CASCADE,
    filing_id TEXT NOT NULL,
    reference_id TEXT,
    legal_name TEXT,
    business_name TEXT,
    relying_crd TEXT,
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    relying_firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    observed_from DATE,
    observed_through DATE,
    source_row_digest TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (filing_uuid, source_row_digest)
);

CREATE INDEX IF NOT EXISTS form_adv_relying_crd_idx
    ON form_adv_relying_adviser_rows (relying_crd);

COMMENT ON TABLE form_adv_relying_adviser_rows IS
    'Schedule R named relying advisers. CRD = CONFIRMED. Name-only = REVIEW_REQUIRED. Not a separate public firm unless CRD is independently on the official roster.';

CREATE TABLE IF NOT EXISTS form_adv_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_id TEXT NOT NULL,
    crd TEXT,
    sec_file_number TEXT,
    form_type TEXT,
    filing_type TEXT,
    filing_date DATE,
    legal_name TEXT,
    business_name TEXT,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID REFERENCES source_releases (id),
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, filing_id)
);

CREATE INDEX IF NOT EXISTS form_adv_withdrawals_crd_idx
    ON form_adv_withdrawals (crd, filing_date DESC);

COMMENT ON TABLE form_adv_withdrawals IS
    'Form ADV-W is historical registration evidence, not misconduct. Do not equate roster absence with withdrawal.';

CREATE TABLE IF NOT EXISTS form_adv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_kind TEXT NOT NULL CHECK (document_kind IN ('part2a_brochure', 'form_crs')),
    official_document_id TEXT,
    official_file_name TEXT,
    filing_id TEXT,
    crd TEXT,
    submitted_on DATE,
    sha256 TEXT,
    source_url TEXT,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID REFERENCES source_releases (id),
    identity_confidence TEXT NOT NULL CHECK (identity_confidence IN (
        'CONFIRMED',
        'HIGH_CONFIDENCE',
        'REVIEW_REQUIRED',
        'UNRESOLVED'
    )),
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    mapped BOOLEAN NOT NULL DEFAULT FALSE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS form_adv_documents_idemp_idx
    ON form_adv_documents (
        source_dataset_id,
        document_kind,
        COALESCE(official_document_id, official_file_name, '_none'),
        COALESCE(crd, '')
    );

CREATE INDEX IF NOT EXISTS form_adv_documents_crd_idx
    ON form_adv_documents (crd, document_kind);

COMMENT ON TABLE form_adv_documents IS
    'Part 2A / Form CRS catalog. Mapping only. Do not extract narrative claims. Unmapped documents stay INTERNAL_ONLY.';

CREATE TABLE IF NOT EXISTS form_adv_historical_firm_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crd TEXT NOT NULL UNIQUE,
    last_seen_filing_id TEXT,
    last_seen_on DATE,
    advw_filing_id TEXT,
    advw_filed_on DATE,
    on_current_roster BOOLEAN NOT NULL DEFAULT FALSE,
    publication_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'HISTORICAL_ENTITY_CANDIDATE',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_adv_historical_firm_candidates IS
    'CRDs present in historical/relational ADV but absent from the current IARD roster. publication_allowed stays FALSE. Not a public profile.';

INSERT INTO schema_migrations (filename)
VALUES ('0013_adv_relational_graph.sql')
ON CONFLICT (filename) DO NOTHING;
