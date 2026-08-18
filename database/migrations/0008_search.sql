-- Search foundation.
-- Production search over hundreds of thousands of rows comes later.
-- This table and its indexes define the contract.

CREATE TABLE search_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_kind TEXT NOT NULL CHECK (entity_kind IN ('person', 'firm', 'product', 'issuer')),
    entity_id UUID NOT NULL,
    slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    search_document TSVECTOR,
    identifiers TEXT[] NOT NULL DEFAULT '{}',
    city TEXT,
    region TEXT,
    postal_code TEXT,
    registration_types TEXT[] NOT NULL DEFAULT '{}',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    -- Only sourced, sufficient records should become publicly indexable.
    indexable BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_kind, entity_id)
);

CREATE INDEX search_documents_tsv_idx
    ON search_documents USING gin (search_document);

CREATE INDEX search_documents_name_trgm_idx
    ON search_documents USING gin (display_name gin_trgm_ops);

CREATE INDEX search_documents_identifiers_idx
    ON search_documents USING gin (identifiers);

CREATE INDEX search_documents_location_idx
    ON search_documents (region, postal_code);

CREATE INDEX search_documents_kind_indexable_idx
    ON search_documents (entity_kind, indexable)
    WHERE indexable AND NOT is_synthetic;

CREATE OR REPLACE FUNCTION search_documents_refresh_tsv()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_document :=
        setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(array_to_string(NEW.identifiers, ' '), '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.region, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.postal_code, '')), 'B');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS search_documents_tsv_trg ON search_documents;
CREATE TRIGGER search_documents_tsv_trg
    BEFORE INSERT OR UPDATE OF display_name, identifiers, city, region, postal_code
    ON search_documents
    FOR EACH ROW
    EXECUTE FUNCTION search_documents_refresh_tsv();

INSERT INTO schema_migrations (filename)
VALUES ('0008_search.sql')
ON CONFLICT (filename) DO NOTHING;
