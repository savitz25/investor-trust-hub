# INV-NAT-002A relational schema gap

Production schema is through **0012** (`form_adv_reported_attributes`, `form_adv_successor_links`). That stores flattened FOIA Item 1–11 observations, not repeating Schedule A/B/D rows.

Existing tables that 002B may *link to* but must not overload:

| Table | Why it is not enough |
| --- | --- |
| `people` / `person_identifiers` | Empty in production. Owner `OwnerID` is not an IAR CRD. Minting public people is out of scope for 002A/002B ingest until identity review |
| `products` | Empty. Named funds belong here later, keyed by Fund ID `805-`, never by Item 7.B counts |
| `branches` | Main-office-centric. Schedule D 1.F needs filing-scoped office keys |
| `person_firm_associations` | No firm–firm, fund–firm, or service-provider roles |
| `regulatory_filings.accession_or_file_id` | Can store FilingID, but cannot hold schedule row grain or fail-closed `is_current` per edge |

## Migration 0013 (prepared, not applied)

File: `database/migrations/0013_adv_relational_graph.sql`  
Editor copy: `docs/INV-NAT-002-SQL-EDITOR.md`  
**DO NOT APPLY** until INV-NAT-002B.

Additive objects:

- source datasets: `sec_ia_adv_part1_relational`, `sec_ia_adv_w`, `sec_ia_adv_part2a`, `sec_ia_form_crs`, `sec_ia_iapd_compilation`
- `form_adv_filings`
- `form_adv_schedule_ab_rows`
- `form_adv_related_person_rows`
- `form_adv_private_fund_rows`
- `form_adv_fund_service_provider_rows`
- `form_adv_other_office_rows`
- `form_adv_relying_adviser_rows`
- `form_adv_withdrawals`
- `form_adv_documents`
- `form_adv_historical_firm_candidates`

All relationship tables default `is_current BOOLEAN NOT NULL DEFAULT FALSE`.

`apply_migrations.py` will skip `0013_adv_relational_graph.sql` unless `APPLY_MIGRATION_0013=1`.
