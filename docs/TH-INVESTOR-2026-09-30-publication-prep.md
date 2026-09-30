# September 30 IAPD state-firm publication preparation

Status: **BLOCKED**. Production was inspected read only. No activation command was run. Evidence Activation has not recorded a `VERIFIED` post-load verdict. The SQL [activation draft](../artifacts/th-investor-2026-09-30-publication-activate.sql) deliberately aborts without that verdict and its receipt URL on the exact source release. The separate [publication rollback](../artifacts/th-investor-2026-09-30-publication-rollback.sql) changes only this batch's flag; neither script deletes canonical data.

## Exact batch and read-only inventory

Release ID `a89165b8-b60a-4b31-9009-8b2a0291f8f8`; dataset `iapd_state_compilation`; label `IA_FIRM_STATE_Feed_09_30_2026`; official source SHA-256 `23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c`. Live queries found 6,602 APPROVED `STATE_REGISTERED_IA` firm registration rows, 5,942 exact firm CRDs, 5,491 firms marked as created by B1, zero duplicate `(CRD,state)` keys, and zero `publication_allowed=true` rows. Release notes record 5,491 created firms and 5,993 registrations on those firms.

| State | Batch registration rows | On B1-created firms | Currently flag-allowed | Proposed flag-allowed after separately approved activation |
| --- | ---: | ---: | ---: | ---: |
| CA | 3,336 | 3,075 | 0 | 3,336 |
| TX | 1,992 | 1,749 | 0 | 1,992 |
| AZ | 674 | 603 | 0 | 674 |
| WA | 600 | 566 | 0 | 600 |
| Total | 6,602 | 5,993 | 0 | 6,602 |

The B1-created firms have **zero** rows in legacy `registrations`, `search_documents`, main-office `branches`, and `form_adv_firm_facts`. Of the 451 pre-existing firms with a row in this release, 68 have a legacy firm registration and two have an indexable search document. The draft activation updates only `jurisdiction_registrations.publication_allowed` for the exact release; it cannot alter those pre-existing firms' existing profile or search states. Florida OFR, individuals, branches, notice filings, principal-office overlays and non-APPROVED observations are outside the update predicate.

## What the current site would actually show

The Investor web repository does **not** read `jurisdiction_registrations` or `publication_allowed`. Profile classification reads legacy `registrations`; search cards also require that classification; sitemap/indexing requires an existing `search_documents.indexable` row. Consequently, changing the batch flag alone would expose **zero new state registration surfaces and zero new firm profiles**. All 5,491 new firms remain suppressed as profiles because they lack the legacy classification and content/indexability inputs. The 6,602 rows are candidates for a *separate* state-adviser lens after that lens is implemented and reviewed; the flag is only one prerequisite.

There is an existing count leak: `getFirmDirectoryMetrics()` and the search SQL's total count use all non-synthetic `firms` without a publication predicate. The production database now returns 31,268 for that count, 5,491 above the pre-load 25,777, even though none of those new firms can render a search card. The public `/firms` HTML still showed a cached 25,777 during this audit; after cache refresh, the repository query would count 31,268. A flag-only rollback cannot reverse this count because it never deletes the canonical firms. The search pagination total has the same issue. Published static state research pages and existing principal-office overlays do not read this batch and remain unchanged.

## Required work before a public activation gate

1. Evidence Activation must independently certify the post-load production rows and record `VERIFIED` plus its receipt URL on this exact source release. No such verdict is present in the live release metadata or the PR handoff at this audit.
2. Prepare and test a state-adviser public lens that reads only `publication_allowed=true`, `APPROVED`, firm-grain rows from this exact source release; cite the official source and date, distinguish state registration from SEC registration, and use exact CRD identity. Do not force these records through the SEC RIA/ERA classifier or mint empty full profiles.
3. Fix firm directory and search totals so unpublished canonical identities are not counted as public firms, and verify existing published profiles and the 451 matched firms retain their current state. Apply the existing content and indexing gate before any new firm profile or sitemap entry.
4. Rerun the read-only cohort queries below, review a web preview, and obtain a separate Founder activation go. The draft SQL remains blocked until both the Evidence verdict and web publication contract exist.

## Read-only verification queries

```sql
SELECT jurisdiction, count(*) AS batch_rows,
       count(*) FILTER (WHERE publication_allowed) AS allowed_rows,
       count(*) FILTER (WHERE raw->>'b1_created_firm'='true') AS rows_on_new_firms
FROM jurisdiction_registrations
WHERE source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'
GROUP BY jurisdiction ORDER BY jurisdiction;

SELECT count(*) AS batch_rows, count(DISTINCT firm_id) AS batch_firms,
       count(*)-count(DISTINCT (raw->>'firm_crd',jurisdiction)) AS duplicate_keys
FROM jurisdiction_registrations
WHERE source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8';

SELECT id, source_dataset_id, release_label, checksum_sha256, notes
FROM source_releases
WHERE id='a89165b8-b60a-4b31-9009-8b2a0291f8f8';
```

The activation and publication rollback are separate from the earlier B1 **data** rollback. Their batch predicates include release ID, source dataset, label, checksum, type and status; the scripts fail on unexpected row counts. The activation script also fails while the Evidence verdict is pending. No production update was run to test either draft.
