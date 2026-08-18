-- Canonical entities: people, firms, products, issuers.
-- These are not collapsed into a generic provider table.

CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug CITEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    given_name TEXT,
    family_name TEXT,
    middle_name TEXT,
    name_suffix TEXT,
    professional_kinds TEXT[] NOT NULL DEFAULT '{}',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    current_as_of TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX people_name_trgm_idx
    ON people USING gin (display_name gin_trgm_ops);

CREATE INDEX people_family_name_idx
    ON people (family_name);

CREATE INDEX people_synthetic_idx
    ON people (is_synthetic);

CREATE TABLE person_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people (id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    issuing_authority_id TEXT REFERENCES source_authorities (id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX person_identifiers_person_idx
    ON person_identifiers (person_id);

CREATE INDEX person_identifiers_value_idx
    ON person_identifiers (identifier_value);

CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug CITEXT NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    dba_names TEXT[] NOT NULL DEFAULT '{}',
    firm_kinds TEXT[] NOT NULL DEFAULT '{}',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    current_as_of TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX firms_legal_name_trgm_idx
    ON firms USING gin (legal_name gin_trgm_ops);

CREATE INDEX firms_display_name_trgm_idx
    ON firms USING gin (display_name gin_trgm_ops);

CREATE INDEX firms_synthetic_idx
    ON firms (is_synthetic);

CREATE TABLE firm_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES firms (id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    issuing_authority_id TEXT REFERENCES source_authorities (id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX firm_identifiers_firm_idx
    ON firm_identifiers (firm_id);

CREATE INDEX firm_identifiers_value_idx
    ON firm_identifiers (identifier_value);

CREATE TABLE issuers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug CITEXT NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    issuer_kind TEXT NOT NULL,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issuer_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer_id UUID NOT NULL REFERENCES issuers (id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    issuing_authority_id TEXT REFERENCES source_authorities (id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identifier_type, identifier_value)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug CITEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    product_kind TEXT NOT NULL,
    issuer_id UUID REFERENCES issuers (id),
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    issuing_authority_id TEXT REFERENCES source_authorities (id),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_id UUID REFERENCES evidence_records (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX products_name_trgm_idx
    ON products USING gin (name gin_trgm_ops);

INSERT INTO schema_migrations (filename)
VALUES ('0005_canonical_entities.sql')
ON CONFLICT (filename) DO NOTHING;
