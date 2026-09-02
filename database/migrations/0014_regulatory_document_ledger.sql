-- NJ-INV-001 — reusable state-regulator document / multi-party event ledger.
-- Additive. Internal-only by default. Not an NJ-only firm silo.
-- Does not alter firms, people, public profiles, customer-claim tables, or RLS on those.

INSERT INTO source_authorities (id, name, official_url, notes) VALUES
    ('nj_bos', 'New Jersey Bureau of Securities',
     'https://www.njconsumeraffairs.gov/bos/',
     'State securities regulator. CRD/IARD is the primary firm identifier. Orders & Filed Complaints is the official action library.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url,
    notes = EXCLUDED.notes;

INSERT INTO source_systems (
    id, authority_id, name, official_url, dataset_kind,
    attribution_required, marketing_restricted, prospecting_prohibited,
    freshness_requirement_notes, correction_notes
) VALUES
    ('nj_bos_actions', 'nj_bos', 'NJ Bureau of Securities orders and filed complaints',
     'https://www.njconsumeraffairs.gov/Pages/actions.aspx', 'state_securities_enforcement',
     TRUE, TRUE, TRUE,
     'HTML index may be WAF-gated. Official PDFs under /Actions/ are canonical when retrieved.',
     'A filed complaint is not a final finding. Preserve procedural status of summary orders.')
ON CONFLICT (id) DO UPDATE SET
    authority_id = EXCLUDED.authority_id,
    name = EXCLUDED.name,
    official_url = EXCLUDED.official_url;

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url) VALUES
    ('nj_bos_orders_complaints', 'nj_bos_actions', 'NJ BOS Orders & Filed Complaints',
     'Official administrative orders and filed complaints hosted by DCA Actions.',
     ARRAY['firm', 'person', 'issuer', 'disclosure'],
     'https://www.njconsumeraffairs.gov/bos/Pages/FAQinvestor.aspx'),
    ('nj_bos_form2_crd_iard', 'nj_bos_actions', 'NJBOS Form 2 CRD/IARD request',
     'Official path to request CRD/IARD extracts. Not a public bulk NJ state-RIA roster.',
     ARRAY['firm', 'person', 'registration'],
     'https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS regulatory_source_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_family TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_hash TEXT,
    coverage_state TEXT NOT NULL CHECK (coverage_state IN (
        'ACQUIRED_COMPLETE','ACQUIRED_CURRENT_SNAPSHOT','ACQUIRED_PARTIAL_HISTORY',
        'PARTIAL_SOURCE_COVERAGE','SOURCE_NOT_ACQUIRED','SOURCE_ACCESS_BLOCKED',
        'SOURCE_AVAILABLE_BY_REQUEST','SOURCE_UNVERIFIED'
    )),
    retrieved_at TIMESTAMPTZ,
    notes TEXT,
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, source_url)
);

CREATE TABLE IF NOT EXISTS regulatory_source_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_url TEXT NOT NULL,
    locator TEXT,
    respondent_caption TEXT NOT NULL,
    document_url TEXT,
    order_number TEXT,
    action_date DATE,
    acquisition_state TEXT NOT NULL CHECK (acquisition_state IN (
        'DOCUMENT_DOWNLOADED','INDEX_ONLY','DOCUMENT_UNAVAILABLE','HTTP_404','SKIPPED_EXISTING_HASH','SOURCE_ACCESS_BLOCKED'
    )),
    occurrence_fingerprint TEXT NOT NULL,
    raw_value JSONB NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, occurrence_fingerprint)
);

CREATE TABLE IF NOT EXISTS regulatory_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_document_id TEXT NOT NULL UNIQUE,
    order_number TEXT,
    content_hash TEXT NOT NULL UNIQUE,
    document_type TEXT,
    source_url TEXT,
    byte_length BIGINT NOT NULL DEFAULT 0,
    text_extraction_state TEXT NOT NULL DEFAULT 'NOT_ATTEMPTED',
    ocr_required BOOLEAN NOT NULL DEFAULT FALSE,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    monitoring_state TEXT NOT NULL DEFAULT 'baseline_only',
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regulatory_event_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    event_record_identifier TEXT NOT NULL,
    party_type TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    role_in_order TEXT NOT NULL DEFAULT 'respondent',
    crd TEXT,
    sec_file_number TEXT,
    match_status TEXT NOT NULL,
    match_method TEXT,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    person_id UUID REFERENCES people (id) ON DELETE SET NULL,
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_event_parties_natural
    ON regulatory_event_parties (
        source_dataset_id,
        event_record_identifier,
        legal_name,
        party_type,
        (COALESCE(crd, '')),
        (COALESCE(sec_file_number, ''))
    );

CREATE TABLE IF NOT EXISTS regulatory_source_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_url TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    content_type TEXT,
    byte_length BIGINT NOT NULL DEFAULT 0,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payload_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (source_dataset_id, source_url, content_hash)
);

CREATE TABLE IF NOT EXISTS regulatory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_event_id TEXT NOT NULL UNIQUE,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    document_content_hash TEXT,
    event_class TEXT NOT NULL,
    procedural_status TEXT NOT NULL,
    order_number TEXT,
    docket_number TEXT,
    action_date DATE,
    caption TEXT,
    source_url TEXT,
    has_civil_penalty BOOLEAN NOT NULL DEFAULT FALSE,
    has_restitution BOOLEAN NOT NULL DEFAULT FALSE,
    has_disgorgement BOOLEAN NOT NULL DEFAULT FALSE,
    penalty_amount NUMERIC(14, 2),
    restitution_amount NUMERIC(14, 2),
    disgorgement_amount NUMERIC(14, 2),
    nj_monetary_attribution TEXT NOT NULL DEFAULT 'unspecified'
        CHECK (nj_monetary_attribution IN ('nj_only', 'nj_allocated', 'multistate_unallocated', 'unspecified', 'none')),
    public_eligibility TEXT NOT NULL DEFAULT 'internal_only',
    monitoring_state TEXT NOT NULL DEFAULT 'baseline_only',
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regulatory_identity_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    event_record_identifier TEXT NOT NULL,
    party_legal_name TEXT NOT NULL,
    party_type TEXT NOT NULL,
    crd TEXT,
    sec_file_number TEXT,
    match_status TEXT NOT NULL,
    match_method TEXT,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    person_id UUID REFERENCES people (id) ON DELETE SET NULL,
    notes TEXT,
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_identity_ledger_natural
    ON regulatory_identity_ledger (
        source_dataset_id,
        event_record_identifier,
        party_legal_name,
        party_type,
        (COALESCE(crd, ''))
    );

CREATE TABLE IF NOT EXISTS regulatory_firm_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_record_identifier TEXT NOT NULL,
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    attachment_reason TEXT NOT NULL,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_record_identifier, firm_id, attachment_reason)
);

CREATE TABLE IF NOT EXISTS regulatory_monitoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_event_id TEXT NOT NULL,
    change_class TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    baseline_run BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    raw_value JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_monitoring_natural
    ON regulatory_monitoring_events (
        stable_event_id,
        change_class,
        (COALESCE(notes, ''))
    );

COMMENT ON TABLE regulatory_source_coverage IS
    'Official source acquisition state. Unavailable periods are not zero-action findings.';
COMMENT ON TABLE regulatory_source_occurrences IS
    'Index/locator occurrences. Duplicate URLs remain occurrences; content is canonicalized by hash.';
COMMENT ON TABLE regulatory_documents IS
    'Canonical PDFs. Filed complaints are not final findings.';
COMMENT ON TABLE regulatory_event_parties IS
    'Separately typed respondents. Individuals default internal-only. Firm_id/person_id remain nullable.';
COMMENT ON TABLE regulatory_source_snapshots IS
    'Retrieved payloads keyed by URL + content hash. Retrieval timestamps do not create new rows.';
COMMENT ON TABLE regulatory_events IS
    'Stable event identity. First corpus is baseline-only and must not emit historical alerts.';
COMMENT ON TABLE regulatory_identity_ledger IS
    'CRD/SEC exact-match ledger. Name-only matches are rejected, not attached.';
COMMENT ON TABLE regulatory_firm_attachments IS
    'Attach an event to a firm only when the firm is a respondent. Individual actions are not copied to employers.';
COMMENT ON TABLE regulatory_monitoring_events IS
    'Future exact-profile change events. Baseline ingest inserts zero rows.';

ALTER TABLE regulatory_source_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_source_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_event_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_identity_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_firm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_monitoring_events ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations (filename)
VALUES ('0014_regulatory_document_ledger.sql')
ON CONFLICT (filename) DO NOTHING;
