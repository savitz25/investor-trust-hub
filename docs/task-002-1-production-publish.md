# Task 002.1 — Production database + official SEC publish

## Status

Official August 2026 SEC Form ADV / IARD RIA + ERA firm data is published to the InvestorTrustHub production PostgreSQL database. Firm Trust Reports, sitemap explosion, and Google indexing of the 23,622 firms are **not** in this task.

All official firm search documents remain `indexable = false`.

## Production database configuration

Platform: **Supabase** (PostgreSQL 17.6).

The project API host is public (`NEXT_PUBLIC_SUPABASE_URL`). Browser/anon credentials are public by design. Database passwords, the service-role key, and Direct/pooler URLs are **server-only**.

### Reachable endpoint

The Supabase **Direct** hostname `db.<project-ref>.supabase.co` does not resolve from this operator network (no A/AAAA record). The **session-mode pooler** on port `5432` is the production connection used for migrations and ingestion:

```text
host = aws-0-<region>.pooler.supabase.com
port = 5432          # session mode, required for a single publish transaction
user = postgres.<project-ref>
database = postgres
sslmode = require
```

Do **not** use the transaction pooler on port `6543` for migrations or `--publish`. Prepared statements and one long transaction need session mode.

`SUPABASE_POOLER_REGION` (example: `us-east-2`) selects the pooler region when the Direct host cannot be resolved. `ith_ingestion.env.resolve_database_url` performs that rewrite locally and never prints the password.

### Required environment variables

Copy [`.env.example`](../.env.example) to a **gitignored** local file (`env.local.txt` or `.env.local`). Never commit secrets.

| Variable | Role | Client-safe? |
| --- | --- | --- |
| `DATABASE_URL` | Migrations and operator SQL | No |
| `INGESTION_DATABASE_URL` | Ingestion publish. May match `DATABASE_URL` until a least-privilege role exists | No |
| `SUPABASE_POOLER_REGION` | Region used when the Direct host does not resolve | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase admin key. Not used by SEC ingest | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Public API host | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-constrained when auth exists) | Yes |

`DATABASE_URL` and `INGESTION_DATABASE_URL` should be separate roles when practical. Task 002.1 uses the database owner because no dedicated ingest role has been provisioned yet.

SSL is required (`sslmode=require`). Do not weaken it.

## Operator commands

Run from the repository root. Local env files are loaded automatically. Commands never print passwords.

### 1. Database connectivity check

```text
python services/ingestion/scripts/check_database.py
```

Equivalent queries:

```sql
SELECT version();
SELECT current_database();
SELECT current_user;
SELECT now();
```

Confirm: correct database (`postgres` on the Supabase project), SSL on, PostgreSQL 15+.

### 2. Migrations

```text
python services/ingestion/scripts/apply_migrations.py
python services/ingestion/scripts/apply_migrations.py --status
```

Applies `0001` through `0010` in order. Already-applied files in `schema_migrations` are skipped. Do not edit or renumber shipped migrations. Do not use ORM auto-sync.

Expected after apply:

```text
expected migrations: 0001 … 0010
applied migrations:  0001 … 0010
missing migrations:  0
duplicate migration rows: 0
```

### 3. Required seeds

```text
python services/ingestion/scripts/apply_and_seed.py
```

Applies `0001_source_registry.sql` and `0003_sec_adv_datasets.sql` only.

Does **not** apply `0002_synthetic_fixtures.sql`. Those fixtures stay in source control for CI/local development. To apply them intentionally:

```text
python services/ingestion/scripts/apply_and_seed.py --include-synthetic
```

Synthetic rows must remain `is_synthetic = true` and not indexable.

### 4. SEC dry run (no canonical writes)

Use the archived official August 2026 files. Recalculate SHA-256 first. Do not use `--latest` unless the SEC catalog HTML is reachable; the WAF often returns 403.

```text
python -m ith_ingestion sec-adv ingest ^
  --ria-csv data/raw/sec/form-adv/2026-08-03/ria/IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640308.CSV ^
  --era-csv data/raw/sec/form-adv/2026-08-03/era/IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640309.CSV ^
  --release-label 2026-08-03 ^
  --dry-run ^
  --archive-dir data/raw/sec/form-adv ^
  --report data/reports/task-002-1-dry-run.json
```

Dry-run includes parse, validation, normalization, identity resolution, quality gates, planned inserts, and quarantine. It does not write canonical tables.

Stop if counts diverge from the Task 002 baseline without a documented newer official release.

### 5. SEC publish

```text
python -m ith_ingestion sec-adv ingest ^
  --ria-csv data/raw/sec/form-adv/2026-08-03/ria/IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640308.CSV ^
  --era-csv data/raw/sec/form-adv/2026-08-03/era/IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640309.CSV ^
  --release-label 2026-08-03 ^
  --publish ^
  --archive-dir data/raw/sec/form-adv ^
  --report data/reports/task-002-1-publish.json
```

Publish is one PostgreSQL transaction:

```text
STAGE → QUALITY GATES → BEGIN → firms → identifiers → registrations
→ locations → ADV facts → evidence → observations → snapshots
→ search documents (indexable=false) → COMMIT
```

Any mandatory failure rolls the transaction back. The ingestion run is then marked `rolled_back`.

### 6. Exact rerun (idempotency)

Repeat the **exact same** `--publish` command.

Expected: `already_published = true` and zero new duplicate firms, CRDs, SEC identifiers, registrations, locations, evidence, or snapshots.

### 7. Integrity report

```text
python services/ingestion/scripts/production_integrity.py
```

Writes `data/reports/task-002-1-integrity.json`. Critical error counts must be `0`.

### 8. 25-firm QA report

```text
python services/ingestion/scripts/qa_sec_sample.py
```

Writes `data/reports/task-002-1-25-firm-qa.json`. Acceptance: `25/25 PASS`.

## Official source (August 2026)

Catalog (do not substitute third-party copies):

https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers

| Kind | Release | Filename | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| RIA zip | 2026-08-03 | `ia08032026_0.zip` (archived as `_inspect/ria.zip`) | 5,295,981 | `25838ae0c5bab2f25249f3a83a606315166d2ee0ec48bfa4b1b5df2620f781cc` |
| ERA zip | 2026-08-03 | `ia08032026-exempt_0.zip` (archived as `_inspect/era.zip`) | 848,786 | `e47e734fbb992e4747d5ed1f8b497492f2c4be416c1e775108784015cb4e5da3` |
| RIA CSV | 2026-08-03 | `IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640308.CSV` | 42,274,955 | `38227313e51b5326375ad9c67a01f0ecaf2949abf0c466bebe2792fa933e8053` |
| ERA CSV | 2026-08-03 | `IA_SEC_-_FIRM_ROSTER_FOIA_DOWNLOAD_-_34640309.CSV` | 6,558,547 | `0a0a86bc68aabbf5a1e17e27992d92e789fe7131a6c94f3bbb6454ae5eadada6` |

Checksums were recalculated on 2026-08-18 before publish and match the Task 002 dry-run archive. Underlying data is filer-supplied Form ADV via IARD. The SEC has not approved or endorsed these firms.

## Dry-run vs Task 002

| Metric | Task 002 | Task 002.1 dry-run |
| --- | ---: | ---: |
| RIA rows | 17,018 | 17,018 |
| ERA rows | 6,604 | 6,604 |
| Unique CRDs | 23,622 | 23,622 |
| Duplicate CRDs | 0 | 0 |
| RIA/ERA overlap | 0 | 0 |
| Null SEC file numbers | 1 | 1 |
| Quarantined rows | 0 | 0 |
| Planned firms | 23,622 | 23,622 |
| Planned identifiers | 47,243 | 47,243 |
| Planned registrations | 23,622 | 23,622 |
| Planned locations | 23,622 | 23,622 |
| Planned evidence | 165,354 | 165,354 |
| Planned snapshots | 23,622 | 23,622 |

No unexplained variance. Same release, same checksums.

## Rollback

- Publish is a single transaction. Failure leaves canonical tables unchanged.
- Idempotency key: `sec-adv:2026-08-03:task-002-sec-adv-v1`.
- A failed attempt is marked `rolled_back` on `ingestion_runs`.
- Do not delete existing canonical records as part of a retry.
- If the database later holds other production data, take a Supabase backup/snapshot before a new source month.

## QA procedure

1. Recalculate SHA-256 of the archived official files.
2. Dry-run and compare to the previous baseline.
3. Publish once.
4. Publish the same release again (`already_published`).
5. Run `production_integrity.py`.
6. Run `qa_sec_sample.py` (raw SEC row vs normalized production row).

### 25-firm audit methodology

The sample is deterministic for release `2026-08-03`:

- multiple RIAs and ERAs
- New York, California, Texas, Florida
- smaller states (VT/WY/ND/SD/MT/AK/RI/DE/ME/NH when present)
- missing-state / non-U.S. principal office when present
- the null SEC file number firm when identifiable
- larger and smaller RAUM
- different legal structures (`3A`)
- different source status texts

Remainder filled by SHA-256(`2026-08-03:<crd>`). Firms are not cherry-picked for cleanliness.

Each sampled firm is compared on CRD, name, SEC file number, RIA vs ERA, source status text, normalized registration, principal address, city, state, postal code, source release/dataset, evidence, raw snapshot, `is_synthetic = false`, search row present, `indexable = false`.

Result per firm: `PASS` / `FAIL` / `REVIEW`. Acceptance: `25/25 PASS`.

## Semantics that must not drift

| Source | Stored meaning | Never becomes |
| --- | --- | --- |
| RIA roster, Firm Type `Registered` | `registered_investment_adviser` / consumer later: **Reported as registered** | SEC approved, endorsed, verified advisor |
| ERA roster, Firm Type `ERA` | `exempt_reporting_adviser` / status `reporting` | `Registered Investment Adviser` |
| Source text `Approved` | `source_status_text` only | Consumer endorsement copy |
| Missing from a later release | `observed = false` | revoked / closed / fraudulent / terminated |
| RAUM `5F(2)(c)` | reported numeric amount, USD | quality, popularity, performance, guaranteed client assets |

## Indexing rule

Newly published official search documents stay `indexable = false`. They are not added to the sitemap. Task 003 will define the Trust Report content/indexability gate.

## Security

- `env.local.txt` / `.env.local` are gitignored.
- `SERVER_ONLY_ENV_KEYS` includes `DATABASE_URL`, `INGESTION_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- The Next.js app does not read ingestion credentials. `apps/web` has no `DATABASE_URL` or service-role references.
- Future user tables (`0009_future_user_rls.sql`) exist for later RLS; no consumer auth is enabled yet.
- The current ingest role is the database owner. A least-privilege `ith_ingest` role is recommended later and is not required to publish this release.

## CI

GitHub Actions continues to use an isolated PostgreSQL 16 service. It applies seeds including synthetic fixtures and publishes **fixture** CSVs only. CI must not receive production `DATABASE_URL`.

## Production count snapshot (after first official publish)

Measured on the production database after `2026-08-03` publish and exact rerun.

| Metric | Count |
| --- | ---: |
| official SEC firms | 23,622 |
| RIA firms | 17,018 |
| ERA firms | 6,604 |
| firm identifiers | 47,243 |
| CRD identifiers | 23,622 |
| SEC file identifiers | 23,621 |
| registrations | 23,622 |
| principal locations | 23,622 |
| ADV facts | 23,622 |
| evidence records | 165,354 |
| source snapshots | 23,622 |
| search documents | 23,622 |
| quarantined rows | 0 |
| synthetic firms | 0 |
| official search `indexable=true` | 0 |
| duplicate CRDs | 0 |
| ERA stored as RIA | 0 |
| missing SEC file number | 1 |
| missing principal state | 5,625 |
| missing RAUM (RIA) | 0 |

Registration distribution: 16,783 RIA `registered`, 235 RIA `pending` (source `120-Day Approval`), 6,604 ERA `reporting`.

Top 15 principal-office states: UNKNOWN 5,625; NY 3,152; CA 2,699; TX 1,302; FL 1,284; MA 803; IL 793; PA 623; CO 589; CT 584; NJ 438; OH 426; GA 364; VA 339; MI 327.

## Performance

| Stage | Seconds |
| --- | ---: |
| staging (discover + parse + normalize) | 3.95 |
| publish | 129.10 |
| post-publish validation (integrity + 25-firm QA) | ~15 |
| exact rerun | 0.68 |
| total first official publish | 133.72 |

The first unbatched attempt was aborted after ~5 minutes with 0 committed rows (transaction still open). Publish now uses chunked `executemany` in the same single transaction. Semantics are unchanged.

## 25-firm QA (2026-08-03)

`25/25 PASS`. Sample includes NY/CA/TX/FL RIAs, ERAs, smaller states (DE, VT), missing-state / non-U.S. offices, the null SEC file-number firm (CRD 2288), large and small RAUM, and a `120-Day Approval` firm (CRD 109691).

```text
CRD    | Type | State   | Name                                           | Identity | Registration | Address | Evidence | Raw Snapshot | Result
10091  | RIA  | NY      | LESKO SECURITIES, INC.                         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
103727 | RIA  | NY      | GAGNON SECURITIES, LLC                         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
103705 | RIA  | CA      | RBC SECURITIES, INC.                           | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104510 | RIA  | CA      | FINANCIAL ENGINES ADVISORS L.L.C.              | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104529 | RIA  | TX      | MONEY MANAGERS, INC.                           | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104536 | RIA  | TX      | KAYNE ANDERSON CAPITAL ADVISORS, L.P.          | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104711 | RIA  | FL      | TOBIAS FINANCIAL ADVISORS, INC.                | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104914 | RIA  | FL      | CHAS. P. SMITH & ASSOCIATES, PA, CPA'S         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104804 | RIA  | DE      | SCHIAVI & COMPANY LLC                          | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104826 | RIA  | VT      | CLEAN YIELD GROUP INC                          | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
129122 | ERA  | NY      | IA CAPITAL GROUP, INC.                         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104020 | ERA  | CA      | GONOW SECURITIES, INC.                         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
105373 | ERA  | NJ      | SUMMIT PRIVATE INVESTMENTS, INC.               | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
106060 | ERA  | VA      | WILBANKS, SMITH & THOMAS ASSET MANAGEMENT, LLC | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
106676 | ERA  | UNKNOWN | WESTCLIFF CAPITAL MANAGEMENT LLC               | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
109509 | ERA  | TX      | WESTERN RESEARCH AND MANAGEMENT, L.L.C.        | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
104550 | RIA  | UNKNOWN | IRIDIAN ASSET MANAGEMENT LLC                   | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
105075 | RIA  | UNKNOWN | DWS INTERNATIONAL GMBH                         | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
2288   | RIA  | NY      | INGALLS INVESTMENT MANAGEMENT, LLC             | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
109691 | RIA  | NY      | SMBC ASSET MANAGEMENT, INC.                    | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
105958 | RIA  | PA      | THE VANGUARD GROUP, INC.                       | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
338002 | RIA  | PA      | VANGUARD CAPITAL MANAGEMENT, LLC               | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
334711 | RIA  | UNKNOWN | INGOT FINANCE, INC.                            | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
105555 | RIA  | UNKNOWN | PERPETUITY ASSET MANAGEMENT INC                | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
10111  | RIA  | GA      | PFS INVESTMENTS INC.                           | PASS     | PASS         | PASS    | PASS     | PASS         | PASS
```

See `data/reports/task-002-1-25-firm-qa.json` (gitignored).

## Known limitations

- Direct `db.<ref>.supabase.co` is unreachable from this operator network; session pooler is used instead.
- Migrations and ingest currently share the database owner role.
- Item 5–12 checkboxes remain snapshotted, not interpreted.
- Country is stored as CHAR(2); non-U.S. values that are not two letters become `ZZ`.
- A large `UNKNOWN` principal-state bucket exists in the official source (empty Main Office State).
- `--latest` catalog HTML fetch is often blocked by the SEC WAF (HTTP 403). Prefer archived official files.
- Official firm pages are still product shells and must stay `noindex`.
- BrokerCheck, persons, Trust Reports, and calculators are out of scope.

## Recommended next milestone

**Task 003 — Firm Trust Report content and indexability gate.** Do not start it from this document automatically. Do not make the 23,622 official firms indexable until that gate exists.
