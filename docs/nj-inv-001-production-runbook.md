# NJ-INV-001 production runbook

New Jersey Bureau of Securities enforcement spine. Internal-only.
Does not create `/new-jersey`, county pages, IAR/agent directories, rankings, or Trust Scores.
Does not alter sitemap, indexing, homepage, navigation, or public-firm eligibility.

## Repository

- Remote: `https://github.com/savitz25/investor-trust-hub.git`
- Branch: `nj-inv-001-nj-bos-enforcement`
- Expected Vercel project: `investor-trust-hub-web` (`prj_Qu2DT0AIy8R7XYTQiHgNcDYjE9i8`)
- Do not relink Vercel. Do not manually deploy.

## What this ticket produces

Reusable (not NJ-silo) tables in `database/migrations/0014_regulatory_document_ledger.sql`:

- `regulatory_source_coverage`
- `regulatory_source_snapshots`
- `regulatory_source_occurrences`
- `regulatory_documents`
- `regulatory_events`
- `regulatory_event_parties`
- `regulatory_identity_ledger`
- `regulatory_firm_attachments`
- `regulatory_monitoring_events`

Parser / CLI (dormant until an authorized InvestorTrustHub DB session exists):

```text
python -m ith_ingestion nj-bos discover
python -m ith_ingestion nj-bos acquire
python -m ith_ingestion nj-bos inspect
python -m ith_ingestion nj-bos dry-run
```

Raw PDFs stay in gitignored `data/raw/nj-bos/`. Reports stay in gitignored `data/reports/`.

## Source access

Official HTML indexes on `njconsumeraffairs.gov` currently return an Incapsula interstitial
(~212 bytes). That is `SOURCE_ACCESS_BLOCKED`, not a zero-action finding.

Official PDFs under `https://www.njconsumeraffairs.gov/Actions/` retrieve as `application/pdf`.
The seeded URL list in `data/fixtures/nj-inv-001/official-pdf-urls.txt` is search-indexed
official PDFs, not a complete alphabetical library. Coverage is `ACQUIRED_PARTIAL_HISTORY`.

Do not scrape around the WAF or CAPTCHA.

## Semantic rules (do not collapse)

- Filed / verified complaint = allegation, not a final finding.
- Summary revocation preserves hearing rights (`PENDING`, not `FINAL`).
- Restitution ≠ civil penalty ≠ disgorgement.
- A multistate / NASAA total is not New Jersey's amount unless the order allocates it.
- Individual respondents stay `internal_only`.
- An individual action is not copied onto an employer unless the firm is a respondent.
- CRD is the primary identity key. Name-only matches are `UNSAFE_REJECTED`.
- `STATE_REGISTERED_RIA` ≠ `SEC_REGISTERED_RIA`. A state-to-SEC transition is a status
  overlay on the same CRD firm, not a new firm.

## State-RIA universe

No public machine-readable NJ state-registered IA roster was found.

Authoritative request path: **NJBOS Form 2 (CRD/IARD information request)** on the Bureau
industry-forms page. See `docs/artifacts/nj-inv-001-state-ria-records-request.md`.

Continue enforcement ingest without waiting for the roster. Overlay onto existing SEC RIA/ERA
firms by exact CRD.

## Database execution (authorized InvestorTrustHub session only)

Do not copy credentials from Senior / Lender / Insurance.

1. Confirm the target database is InvestorTrustHub (`current_database()`).
2. Record `schema_migrations`.
3. Record pre-ingest counts (see `docs/sql/nj-inv-001-reconciliation.sql`).
4. Apply `0014_regulatory_document_ledger.sql` through the normal migration workflow.
5. Dry-run: `python -m ith_ingestion nj-bos dry-run`
6. Execute once (operator-gated publisher; not implemented as an automatic publish in this ticket).
7. Execute a second time.
8. Confirm zero duplicates on snapshots, occurrences, documents, events, parties, firm
   attachments, identity ledger, and monitoring events.
9. Reconcile source counts to DB counts.
10. Confirm `regulatory_monitoring_events` rowcount = 0 (baseline-only; no historical alerts).

If no authorized session exists: leave production execute pending. Safe dormant code may merge.

## Monitoring

First acquired corpus is baseline-only.

Stable event identity, in order:

1. Official order number
2. Official docket / reference number
3. Content hash + event class + date
4. Deterministic source fingerprint

Do not alert on alphabetical reordering, markup changes, URL encoding, duplicate press-release
links, retrieval timestamps, or rediscovery of an old document.

## Publication

All NJ evidence remains internal-only in this ticket.

A merge may trigger the normal Vercel Git deployment. Do not manually deploy.
