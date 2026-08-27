-- INV-NAT-001B additive Form ADV Part 1 enrichment tables.
-- Does not alter firms identity, slugs, or search_documents.indexable.
-- Source snapshots retain the raw FOIA payload.

CREATE TABLE IF NOT EXISTS form_adv_reported_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    source_release_id UUID NOT NULL REFERENCES source_releases (id),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_authority_id TEXT NOT NULL REFERENCES source_authorities (id),
    source_record_identifier TEXT NOT NULL,
    item TEXT NOT NULL,
    field_name TEXT NOT NULL,
    regulator_label TEXT NOT NULL,
    reported_yn TEXT CHECK (reported_yn IS NULL OR reported_yn IN ('Y', 'N')),
    numeric_value NUMERIC(28, 4),
    text_value TEXT,
    raw_value TEXT,
    presence_status TEXT NOT NULL CHECK (presence_status IN (
        'REPORTED_YES',
        'REPORTED_NO',
        'REPORTED_ZERO',
        'NOT_FILED_BY_FORM_TYPE',
        'NOT_PRESENT_IN_SOURCE',
        'NOT_RESEARCHED',
        'UNKNOWN'
    )),
    public_readiness TEXT NOT NULL CHECK (public_readiness IN (
        'READY_FOR_PUBLIC_PROFILE',
        'INTERNAL_ONLY',
        'NOT_READY'
    )),
    evidence_status TEXT NOT NULL CHECK (evidence_status IN (
        'verified_from_official_source',
        'reported_by_source',
        'not_found',
        'unavailable',
        'not_yet_researched',
        'conflicting_sources'
    )),
    as_of_date DATE,
    retrieved_at TIMESTAMPTZ,
    transform_version TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, source_release_id, field_name)
);

CREATE INDEX IF NOT EXISTS form_adv_reported_attributes_firm_idx
    ON form_adv_reported_attributes (firm_id, item);

CREATE INDEX IF NOT EXISTS form_adv_reported_attributes_field_idx
    ON form_adv_reported_attributes (field_name, presence_status);

CREATE INDEX IF NOT EXISTS form_adv_reported_attributes_crd_idx
    ON form_adv_reported_attributes (source_record_identifier);

CREATE TABLE IF NOT EXISTS form_adv_successor_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    successor_firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    successor_crd TEXT NOT NULL,
    predecessor_crd TEXT NOT NULL,
    predecessor_firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    source_release_id UUID NOT NULL REFERENCES source_releases (id),
    source_field TEXT NOT NULL DEFAULT 'Acquired Firm CRD#',
    resolution_status TEXT NOT NULL CHECK (resolution_status IN (
        'CONFIRMED',
        'REVIEW_REQUIRED'
    )),
    evidence_id UUID REFERENCES evidence_records (id),
    transform_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (successor_firm_id, predecessor_crd, source_release_id)
);

COMMENT ON TABLE form_adv_reported_attributes IS
    'Flattened Form ADV Part 1 checkbox/count/text observations from the IARD FOIA roster. Not Schedule D repeating entities. Not a Trust Score.';
COMMENT ON TABLE form_adv_successor_links IS
    'CONFIRMED only when Item 4A is Y and Acquired Firm CRD# differs from the filing CRD. Same-CRD rows are REVIEW_REQUIRED with no predecessor_firm_id.';

INSERT INTO schema_migrations (filename)
VALUES ('0012_form_adv_enrichment.sql')
ON CONFLICT (filename) DO NOTHING;
