-- Canonical regulator / source registry.
-- The application must not be hard-coded around a single regulator.

CREATE TABLE source_authorities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    official_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_systems (
    id TEXT PRIMARY KEY,
    authority_id TEXT NOT NULL REFERENCES source_authorities (id),
    name TEXT NOT NULL,
    official_url TEXT,
    dataset_kind TEXT NOT NULL,
    attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    prospecting_prohibited BOOLEAN NOT NULL DEFAULT FALSE,
    freshness_requirement_notes TEXT,
    correction_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX source_systems_authority_idx
    ON source_systems (authority_id);

CREATE TABLE source_datasets (
    id TEXT PRIMARY KEY,
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    name TEXT NOT NULL,
    description TEXT,
    expected_entity_kinds TEXT[] NOT NULL DEFAULT '{}',
    official_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX source_datasets_system_idx
    ON source_datasets (source_system_id);

INSERT INTO schema_migrations (filename)
VALUES ('0002_source_registry.sql')
ON CONFLICT (filename) DO NOTHING;
