-- Task 003: search and lookup indexes for Firm Trust Reports.
-- Does not change published regulatory facts.

CREATE INDEX IF NOT EXISTS search_documents_slug_idx
    ON search_documents (slug);

CREATE INDEX IF NOT EXISTS firms_display_name_lower_idx
    ON firms (lower(display_name));

CREATE INDEX IF NOT EXISTS firms_legal_name_lower_idx
    ON firms (lower(legal_name));

CREATE INDEX IF NOT EXISTS firm_identifiers_value_lower_idx
    ON firm_identifiers (lower(identifier_value));

CREATE INDEX IF NOT EXISTS branches_main_region_idx
    ON branches (region)
    WHERE is_main_office AND NOT is_synthetic;

CREATE INDEX IF NOT EXISTS branches_main_postal_idx
    ON branches (postal_code)
    WHERE is_main_office AND NOT is_synthetic;

CREATE INDEX IF NOT EXISTS registrations_firm_current_idx
    ON registrations (firm_id)
    WHERE subject_kind = 'firm' AND is_current;

INSERT INTO schema_migrations (filename)
VALUES ('0011_firm_research_search.sql')
ON CONFLICT (filename) DO NOTHING;
