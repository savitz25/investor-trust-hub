-- Registrations, branches, and person–firm relationships.
-- Temporal columns support start/end without overwriting history.

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    source_location_key TEXT,
    name TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    country CHAR(2) NOT NULL DEFAULT 'US',
    is_main_office BOOLEAN NOT NULL DEFAULT FALSE,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX branches_firm_idx ON branches (firm_id);
CREATE INDEX branches_postal_idx ON branches (postal_code);
CREATE INDEX branches_region_idx ON branches (region);
CREATE INDEX branches_city_trgm_idx ON branches USING gin (city gin_trgm_ops);

CREATE UNIQUE INDEX branches_source_location_idx
    ON branches (firm_id, source_location_key)
    WHERE source_location_key IS NOT NULL;

CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_kind TEXT NOT NULL CHECK (subject_kind IN ('person', 'firm')),
    person_id UUID REFERENCES people (id) ON DELETE CASCADE,
    firm_id UUID REFERENCES firms (id) ON DELETE CASCADE,
    regulator_authority_id TEXT NOT NULL REFERENCES source_authorities (id),
    registration_type TEXT NOT NULL,
    status TEXT NOT NULL,
    commenced_on DATE,
    ended_on DATE,
    scope_notes TEXT,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_id UUID REFERENCES evidence_records (id),
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT registrations_subject_chk CHECK (
        (subject_kind = 'person' AND person_id IS NOT NULL)
        OR (subject_kind = 'firm' AND firm_id IS NOT NULL)
    )
);

CREATE INDEX registrations_person_idx ON registrations (person_id);
CREATE INDEX registrations_firm_idx ON registrations (firm_id);
CREATE INDEX registrations_type_status_idx
    ON registrations (registration_type, status, is_current);

CREATE TABLE registration_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations (id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    source_release_id UUID REFERENCES source_releases (id),
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX registration_status_history_idx
    ON registration_status_history (registration_id, observed_at DESC);

CREATE TABLE person_firm_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people (id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches (id),
    role TEXT NOT NULL,
    started_on DATE,
    ended_on DATE,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_id UUID REFERENCES evidence_records (id),
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX person_firm_person_idx ON person_firm_associations (person_id);
CREATE INDEX person_firm_firm_idx ON person_firm_associations (firm_id);
CREATE INDEX person_firm_current_idx
    ON person_firm_associations (is_current, firm_id);

INSERT INTO schema_migrations (filename)
VALUES ('0006_registrations_relationships.sql')
ON CONFLICT (filename) DO NOTHING;
