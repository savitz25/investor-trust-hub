# INV-NAT-002A — Migration 0013 (DO NOT APPLY)

**Production status:** INV-NAT-002A did **not** apply this. INV-NAT-002B applies it once with `APPLY_MIGRATION_0013=1`.

`apply_migrations.py` still skips this file unless that env var is set.

Canonical source: `database/migrations/0013_adv_relational_graph.sql`.

Do **not** paste this into production SQL editor during INV-NAT-002A.

Wave 1 `search_documents.indexable` is not touched. `people`, `products`, and `disclosure_events` stay empty.

Paste-ready copy (INV-NAT-002B only):

```sql
-- INV-NAT-002A additive Form ADV relational graph tables.
-- DO NOT APPLY in INV-NAT-002A. Prepared only.
-- Does not alter firms identity, slugs, people, products, disclosure_events,
-- or search_documents.indexable.
-- Historical edges default is_current = FALSE (fail-closed).

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url)
VALUES
    (
        'sec_ia_adv_part1_relational',
        'form_adv',
        'Form ADV Part 1 relational filing tables (IARD FOIA / IAPD)',
        'Multi-table CSV filings including Schedule A/B/D repeating rows. FilingID is the official IARD filing key. Not the monthly flattened IARD firm roster.',
        ARRAY['firm', 'filing', 'person', 'product', 'branch'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_adv_w',
        'form_adv',
        'Form ADV-W withdrawal filings',
        'Official notice of withdrawal from SEC registration or ERA reporting. Not a misconduct event. Absence from a later roster is not itself a withdrawal.',
        ARRAY['firm', 'filing', 'registration'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_adv_part2a',
        'form_adv',
        'Form ADV Part 2A brochure documents',
        'Brochure PDF archives and mapping identifiers. Catalog and hash only. Narrative brochure text is not a metric source.',
        ARRAY['firm', 'filing'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_form_crs',
        'form_adv',
        'Form ADV Part 3 / Form CRS documents',
        'Customer Relationship Summary PDFs mapped to firm CRD via official mapping files. Catalog and hash only.',
        ARRAY['firm', 'filing'],
        'https://adviserinfo.sec.gov/adv'
    ),
    (
        'sec_ia_iapd_compilation',
        'form_adv',
        'IAPD SEC investment adviser compilation XML',
        'Current-firm compilation snapshot. Items 1-11 subset. Does not contain named Schedule A/B/D repeating tables.',
        ARRAY['firm', 'registration'],
        'https://adviserinfo.sec.gov/compilation'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    expected_entity_kinds = EXCLUDED.expected_entity_kinds,
    official_url = EXCLUDED.official_url;
```

The remaining `CREATE TABLE` statements are in `database/migrations/0013_adv_relational_graph.sql` (filings, Schedule A/B, related persons, private funds, service providers, offices, relying advisers, ADV-W, documents, historical firm candidates). All default `is_current = FALSE`.

Verification after a future apply:

```sql
SELECT filename FROM schema_migrations ORDER BY filename;
-- must then include 0013_adv_relational_graph.sql

SELECT count(*) FROM search_documents
WHERE entity_kind='firm' AND is_synthetic=false AND indexable=true;
-- must remain 1000

SELECT count(*) FROM people;
SELECT count(*) FROM products;
SELECT count(*) FROM disclosure_events;
-- must remain 0 until a later approved ingest
```
