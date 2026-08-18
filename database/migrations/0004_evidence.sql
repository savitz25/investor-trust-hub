-- First-class evidence / provenance.
-- Material facts should be traceable to a source record and an ingest run.

CREATE TABLE evidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_run_id UUID REFERENCES ingestion_runs (id),
    source_authority_id TEXT NOT NULL REFERENCES source_authorities (id),
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID REFERENCES source_releases (id),
    source_url TEXT,
    source_document_name TEXT,
    source_record_identifier TEXT NOT NULL,
    source_effective_date DATE,
    retrieved_at TIMESTAMPTZ NOT NULL,
    raw_value JSONB,
    normalized_value JSONB,
    transform_version TEXT NOT NULL,
    confidence NUMERIC(5, 4),
    match_methodology TEXT,
    subject_kind TEXT,
    subject_id UUID,
    field_name TEXT,
    evidence_status TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    superseded_by UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT evidence_status_chk CHECK (
        evidence_status IN (
            'verified_from_official_source',
            'reported_by_source',
            'not_found',
            'unavailable',
            'not_yet_researched',
            'conflicting_sources'
        )
    ),
    CONSTRAINT evidence_confidence_chk CHECK (
        confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
    ),
    CONSTRAINT evidence_subject_kind_chk CHECK (
        subject_kind IS NULL
        OR subject_kind IN ('person', 'firm', 'product', 'issuer', 'branch', 'registration', 'disclosure')
    )
);

-- Idempotent publish: same source record + field + release does not duplicate.
CREATE UNIQUE INDEX evidence_records_idempotency_idx
    ON evidence_records (
        source_system_id,
        source_dataset_id,
        source_record_identifier,
        COALESCE(field_name, '_record'),
        COALESCE(source_release_id, '00000000-0000-0000-0000-000000000000')
    );

CREATE INDEX evidence_records_subject_idx
    ON evidence_records (subject_kind, subject_id);

CREATE INDEX evidence_records_current_idx
    ON evidence_records (is_current, source_system_id);

CREATE TABLE field_provenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_kind TEXT NOT NULL,
    subject_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    evidence_id UUID NOT NULL REFERENCES evidence_records (id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (subject_kind, subject_id, field_name, evidence_id)
);

CREATE INDEX field_provenance_current_idx
    ON field_provenance (subject_kind, subject_id, field_name)
    WHERE is_current;

-- Temporal snapshots of source payloads (what the record said then).
CREATE TABLE source_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_kind TEXT NOT NULL,
    subject_id UUID NOT NULL,
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    source_release_id UUID REFERENCES source_releases (id),
    snapshot_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX source_snapshots_subject_idx
    ON source_snapshots (subject_kind, subject_id, snapshot_at DESC);

INSERT INTO schema_migrations (filename)
VALUES ('0004_evidence.sql')
ON CONFLICT (filename) DO NOTHING;
