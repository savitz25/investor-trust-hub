-- Ingestion releases and runs.
-- Every published ingest should be identifiable and idempotent.

CREATE TABLE source_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    release_label TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum_sha256 TEXT,
    archive_uri TEXT,
    raw_bytes BIGINT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_dataset_id, release_label)
);

CREATE INDEX source_releases_dataset_idx
    ON source_releases (source_dataset_id, retrieved_at DESC);

CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_release_id UUID REFERENCES source_releases (id),
    pipeline_name TEXT NOT NULL,
    pipeline_version TEXT NOT NULL,
    transform_version TEXT NOT NULL,
    status TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ingestion_runs_status_chk CHECK (
        status IN (
            'pending',
            'downloading',
            'checksum',
            'archiving',
            'parsing',
            'validating',
            'normalizing',
            'resolving',
            'staging',
            'publishing',
            'published',
            'failed',
            'rolled_back'
        )
    )
);

CREATE INDEX ingestion_runs_status_idx
    ON ingestion_runs (status, created_at DESC);

CREATE TABLE ingestion_run_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_run_id UUID NOT NULL REFERENCES ingestion_runs (id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ingestion_run_events_run_idx
    ON ingestion_run_events (ingestion_run_id, created_at);

INSERT INTO schema_migrations (filename)
VALUES ('0003_ingestion.sql')
ON CONFLICT (filename) DO NOTHING;
