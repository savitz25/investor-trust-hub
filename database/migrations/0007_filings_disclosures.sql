-- Filings and disclosure/event records.
-- Store source text. Do not interpret events as "scam" or "safe".

CREATE TABLE regulatory_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_kind TEXT NOT NULL,
    person_id UUID REFERENCES people (id) ON DELETE SET NULL,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    product_id UUID REFERENCES products (id) ON DELETE SET NULL,
    issuer_id UUID REFERENCES issuers (id) ON DELETE SET NULL,
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    form_type TEXT NOT NULL,
    filing_date DATE,
    effective_date DATE,
    accession_or_file_id TEXT,
    source_url TEXT,
    evidence_id UUID REFERENCES evidence_records (id),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX regulatory_filings_accession_idx
    ON regulatory_filings (source_system_id, accession_or_file_id)
    WHERE accession_or_file_id IS NOT NULL;

CREATE INDEX regulatory_filings_firm_idx ON regulatory_filings (firm_id, filing_date DESC);
CREATE INDEX regulatory_filings_person_idx ON regulatory_filings (person_id, filing_date DESC);
CREATE INDEX regulatory_filings_issuer_idx ON regulatory_filings (issuer_id, filing_date DESC);

CREATE TABLE disclosure_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people (id) ON DELETE SET NULL,
    firm_id UUID REFERENCES firms (id) ON DELETE SET NULL,
    event_kind TEXT NOT NULL,
    reported_status TEXT,
    occurred_on DATE,
    reported_on DATE,
    resolved_on DATE,
    summary_source_text TEXT NOT NULL,
    source_system_id TEXT NOT NULL REFERENCES source_systems (id),
    source_record_identifier TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence_records (id),
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_system_id, source_record_identifier)
);

CREATE INDEX disclosure_events_person_idx ON disclosure_events (person_id);
CREATE INDEX disclosure_events_firm_idx ON disclosure_events (firm_id);
CREATE INDEX disclosure_events_kind_idx ON disclosure_events (event_kind);

INSERT INTO schema_migrations (filename)
VALUES ('0007_filings_disclosures.sql')
ON CONFLICT (filename) DO NOTHING;
