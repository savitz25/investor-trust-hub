# NJ-INV-002 production runbook

Internal-only New Jersey Bureau of Securities intelligence. Does not publish `/new-jersey`.

## Repository

- Remote: `https://github.com/savitz25/investor-trust-hub.git`
- Branch: `nj-inv-002-state-ria-exam-issuer-intel`
- Expected Vercel: `investor-trust-hub-web` (`prj_Qu2DT0AIy8R7XYTQiHgNcDYjE9i8`)
- Do not relink Vercel. Do not manually deploy.

## What this ticket produces

- Coverage manifest: `artifacts/nj-inv-001c-enforcement-coverage.csv`
- Audited snapshot: `artifacts/nj-inv-002-audited-state-snapshot.json`
- Metric contract: `docs/nj-inv-002-public-metric-contract.md`
- Migration: `database/migrations/0015_state_regulatory_intelligence.sql` (additive; does not weaken 0014)
- CLI: `python -m ith_ingestion nj-intel inspect`

Raw PDFs remain gitignored under `data/raw/nj-bos/`.

## Source coverage (do not treat blocked as zero)

| Family | State |
| --- | --- |
| Bureau HTML indexes | SOURCE_ACCESS_BLOCKED |
| Official /Actions/ PDFs | ACQUIRED_PARTIAL_HISTORY |
| NJOAG press | ACQUIRED_PARTIAL_HISTORY |
| 2026 sample exam PDF | ACQUIRED_CURRENT_SNAPSHOT |
| 2022–2025 exam announcements | ACQUIRED_PARTIAL_HISTORY |
| State-RIA bulk roster | SOURCE_AVAILABLE_BY_REQUEST (Form 2) |
| General-order HTML library | SOURCE_ACCESS_BLOCKED |
| Issuer filing index | SOURCE_AVAILABLE_BY_REQUEST |
| Firm exam answers | SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN |
| On-site exam reports | SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN |

Public-safe enforcement description:

"Official New Jersey Bureau of Securities documents acquired from publicly discoverable
Bureau-hosted PDFs; historical coverage is partial."

## Database (authorized InvestorTrustHub session only)

Do not copy credentials from another hub.

1. Confirm `current_database()` is InvestorTrustHub.
2. Record `schema_migrations`.
3. Apply 0014 if pending, then 0015.
4. Record pre-ingest counts (`docs/sql/nj-inv-002-reconciliation.sql`).
5. Dry-run `nj-bos` and `nj-intel`.
6. Execute NJ-INV-001 twice; execute NJ-INV-002 families twice.
7. Confirm zero duplicates and `regulatory_monitoring_events` = 0.

If no authorized session: leave production execute pending. Safe dormant code may merge.

## Monitoring

First snapshots are baseline-only. No historical customer alerts.

Future state-intelligence events (not consumer "unsafe" alerts): new exam year, new topic,
new general order, new state-RIA registration/transition when a roster exists.
