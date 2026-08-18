-- Task 002: SEC Form ADV / IARD firm ingestion support.
-- Canonical firms stay source-neutral. ADV-specific facts live here.

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS source_status_text TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_firm_type_regulator_idx
    ON registrations (firm_id, registration_type, regulator_authority_id)
    WHERE subject_kind = 'firm';

CREATE UNIQUE INDEX IF NOT EXISTS source_snapshots_release_unique_idx
    ON source_snapshots (
        subject_kind,
        subject_id,
        source_system_id,
        COALESCE(source_release_id, '00000000-0000-0000-0000-000000000000')
    );

CREATE TABLE IF NOT EXISTS form_adv_firm_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID NOT NULL REFERENCES source_releases (id),
    dataset_kind TEXT NOT NULL CHECK (dataset_kind IN ('ria', 'era')),
    organization_form TEXT,
    fiscal_year_end TEXT,
    sec_current_status_text TEXT,
    sec_status_effective_date DATE,
    latest_adv_filing_date DATE,
    form_version TEXT,
    website TEXT,
    raum_amount NUMERIC(20, 2),
    raum_discretionary_amount NUMERIC(20, 2),
    raum_nondiscretionary_amount NUMERIC(20, 2),
    raum_currency CHAR(3) DEFAULT 'USD',
    raum_source_field TEXT,
    disclosure_indicator TEXT,
    disclosure_count INTEGER,
    facts JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, source_release_id, dataset_kind)
);

CREATE INDEX form_adv_firm_facts_release_idx
    ON form_adv_firm_facts (source_release_id);

CREATE TABLE IF NOT EXISTS firm_source_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    source_dataset_id TEXT NOT NULL REFERENCES source_datasets (id),
    source_release_id UUID NOT NULL REFERENCES source_releases (id),
    observed BOOLEAN NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (firm_id, source_dataset_id, source_release_id)
);

CREATE INDEX firm_source_observations_release_idx
    ON firm_source_observations (source_release_id, observed);

CREATE TABLE IF NOT EXISTS ingestion_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_run_id UUID REFERENCES ingestion_runs (id) ON DELETE CASCADE,
    source_dataset_id TEXT NOT NULL,
    source_record_identifier TEXT,
    reason_code TEXT NOT NULL,
    detail TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ingestion_quarantine_run_idx
    ON ingestion_quarantine (ingestion_run_id, reason_code);

CREATE TABLE IF NOT EXISTS stg_sec_adv_rows (
    ingestion_run_id UUID NOT NULL,
    dataset_kind TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    crd TEXT,
    sec_file_number TEXT,
    legal_name TEXT,
    primary_business_name TEXT,
    payload JSONB NOT NULL,
    PRIMARY KEY (ingestion_run_id, dataset_kind, row_number)
);

INSERT INTO schema_migrations (filename)
VALUES ('0010_sec_adv_ingestion.sql')
ON CONFLICT (filename) DO NOTHING;
