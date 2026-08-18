# Task 002 — SEC adviser firm ingestion

## Status

First official regulatory pipeline for InvestorTrustHub. Firms only. No BrokerCheck. No individual professionals. No mass indexable firm pages.

## Official source

Catalog (discovered at runtime; month is not hard-coded):

https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers

Latest files are chosen from that page’s zip links:

- **Registered Investment Advisers** → dataset `sec_ia_ria`
- **Exempt Investment Advisers / Exempt Reporting Advisers** → dataset `sec_ia_era`

PDF “no data” months are ignored. Release label is the date encoded in the official filename (`ia08032026` → `2026-08-03`).

Underlying data is filer-supplied Form ADV via IARD. The SEC has not approved or endorsed the firms.

## Commands

From the repository root, with `DATABASE_URL` loaded from the local env file:

```text
python -m ith_ingestion sec-adv discover
python -m ith_ingestion sec-adv ingest --latest --dry-run
python -m ith_ingestion sec-adv ingest --latest --publish
python -m ith_ingestion sec-adv report
python -m ith_ingestion sec-adv ingest --fixture-dir services/ingestion/fixtures/sec_adv --dry-run
```

CI uses the fixture directory only. It does not download SEC files.

## Pipeline

```text
DISCOVER catalog HTML
  → DOWNLOAD official zips (browser-like User-Agent; SEC returns 403 otherwise)
  → CHECKSUM SHA-256 (zip + CSV)
  → ARCHIVE under data/raw/sec/form-adv/<release>/<ria|era>/  (gitignored)
  → PARSE Windows-1252/UTF-8 CSV
  → VALIDATE required headers
  → NORMALIZE identity + conservative registration semantics
  → QUALITY GATES
  → dry-run report  or  transactional PUBLISH
  → POST counts / observations
```

Dry-run parses and reports and does **not** write canonical tables.

## Identity

CRD is the only match key. Same CRD updates the existing firm (name/address/status). Different CRDs are different firms. No fuzzy name or address merge.

Canonical slug: `sec-crd-<crd>` (not a mutable company name).

## RIA vs ERA

| Dataset | `firm_kinds` / registration type | Normalized status |
| --- | --- | --- |
| RIA roster, Firm Type `Registered` | `registered_investment_adviser` | `registered` (or `pending` if source says `120-Day Approval`) |
| ERA roster, Firm Type `ERA` | `exempt_reporting_adviser` | `reporting` |

An ERA is never stored as an SEC-registered investment adviser. Source text such as `Approved` is stored as `source_status_text` and must not be shown as “SEC approved.”

## Disappearing records

If a CRD is in release N but not N+1:

- the firm row stays
- registration is **not** flipped to terminated
- a `firm_source_observations` row is stored with `observed = false`

Absence is not a finding of revocation, closure, or discipline.

## Quarantine

Rows that cannot publish go to `ingestion_quarantine` with reason codes:

- `missing_crd`
- `malformed_crd`
- `missing_name`
- `duplicate_crd`
- `unsupported_firm_type`

They never create canonical firms.

## Idempotency

Key: `sec-adv:<release_label>:task-002-sec-adv-v1`

A second `--publish` of the same release is a no-op (`already_published`).

## Rollback

Publish runs in one PostgreSQL transaction. Failure marks the ingestion run `rolled_back` and leaves canonical tables unchanged.

## Refresh procedure (next month)

```text
discover latest
compare filename / checksum to the last archived release
if new: dry-run → quality report → publish → keep archive
```

No code change is required when the month changes.

## Known limitations

- Item 5–12 checkboxes are snapshotted, not interpreted
- RAUM is stored as a reported number, not displayed as marketing AUM
- Country is coerced to CHAR(2)
- Firm pages remain `noindex`
- BrokerCheck and persons are out of scope
