# Data model

Canonical entities are **people**, **firms**, **products**, and **issuers**. They are not a generic `provider` table.

```text
PERSON
  ↓
REGISTRATION
  ↓
FIRM
  ↓
BRANCH / LOCATION
  ↓
REGULATORY FILING
  ↓
DISCLOSURE / EVENT
  ↓
PRODUCT
  ↓
SOURCE EVIDENCE
```

## Core tables

| Table | Purpose |
| --- | --- |
| `source_authorities` / `source_systems` / `source_datasets` | Multi-regulator registry |
| `source_releases` / `ingestion_runs` | Versioned ingest |
| `evidence_records` | First-class provenance |
| `field_provenance` | Field → evidence map |
| `source_snapshots` | What the record said then |
| `people` / `person_identifiers` | Professionals + CRD/NFA/etc. |
| `firms` / `firm_identifiers` | Firms + CRD/SEC/CIK/LEI |
| `branches` | Locations, ZIP, state |
| `registrations` / `registration_status_history` | Current + historical status |
| `person_firm_associations` | Employment / affiliation over time |
| `regulatory_filings` | ADV, BD, EDGAR, N-CEN, … |
| `disclosure_events` | Source-reported events |
| `products` / `issuers` + identifier tables | Future fund/company research |
| `search_documents` | Search foundation |
| `user_profiles` and saved-* tables | Future My InvestorTrustHub (RLS on) |

## Identifiers

Identifiers are rows, not display fragments.

Types include: `crd`, `sec_file_number`, `cik`, `iard`, `nfa_id`, `lei`, `fund_series`, `fund_class`, `cusip`, `isin`, `ticker`, `other`.

Synthetic values use the `SYN-` prefix.

## Temporal strategy

Task 001 does not run historical ingestion. The schema is ready:

- `is_current` on evidence, registrations, associations, filings
- `commenced_on` / `ended_on` / `valid_from` / `valid_to`
- `registration_status_history`
- `source_snapshots` keyed by subject + release
- `evidence_records.superseded_by`

Do not overwrite important regulatory fields in place without writing history.

## Evidence statuses

`verified_from_official_source` · `reported_by_source` · `not_found` · `unavailable` · `not_yet_researched` · `conflicting_sources`

## Search

`search_documents` holds a tsvector, identifier array, and location fields. `indexable` stays false for synthetic rows and for thin / unsourced entities.
