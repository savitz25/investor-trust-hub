# September IAPD public count and release-summary wiring

Scope narrowed after Evidence Activation's independent check: **data load VERIFIED; publication isolation failed only for the public count and latest-release summary.** No production deployment, flag update, cache purge or database mutation in this branch.

## All affected consumer reads

| Surface | Current production behavior | Branch correction |
| --- | --- | --- |
| `/firms` “Sourced firms” card | `getFirmDirectoryMetrics()` counts every non-synthetic canonical firm. It now displays 31,268 while the B1 batch is OFF. | `publicFirmCountWhere()` counts the legacy 25,777 plus only B1-created firms with an exact-release approved, current, flag-allowed firm registration. |
| `/firms` search result total and pagination | `searchOfficialFirms()` uses a separate cached count over non-synthetic canonical firms. It was still showing 25,777 from its older cache entry during the audit; a refresh could expose 31,268. | Count and list use the same publication-eligible `where` clause. The OFF B1 firms contribute zero. |
| `/firms` latest sourced release | Queries newest `source_releases` row irrespective of public eligibility; it displayed the unpublished September 30 IAPD release. | Excludes the exact held release until an eligible row from it has `publication_allowed=true`. Other source releases keep their existing order. |
| Homepage | `buildInvestorHomeIntelV1()` reads a checked-in V1 SEC/IARD roster snapshot and historical explanatory counts, not the live canonical `firms` table or `/firms` metrics helper. | Unchanged. Its 25,777 reference is a V1/pre-ingest snapshot; it is not a live public directory count. |
| `/api/network-metrics` | Loads a checked-in metric artifact, served with CDN `s-maxage=300`; no live canonical-firm count. | Unchanged; no B1 count leak through this helper. |
| Search autocomplete | No separate autocomplete route or firm SQL exists. | No change. |
| `/firm/[slug]`, metadata, claim validation | Existing legacy mapper has no registration/facts for the 5,491 B1-only firms and returns no profile. | Unchanged; Evidence Activation verified 404 isolation. |
| Sitemap and structured firm data | Sitemap requires `search_documents.indexable`; new B1 firms have none. Structured firm report requires a legacy report. | Unchanged; Evidence Activation verified exclusion. |
| `/api/ask` and specialist execution | Roster reads require `form_adv_firm_facts`, absent for B1-only firms. | Unchanged; Evidence Activation verified no B1 results. |
| Static state research pages | Checked-in public snapshots, no B1 release SQL. | Unchanged. State filters continue using principal-office geography. |

The directory card and search total have **different Next `unstable_cache` owners**: metric key `firm-directory-metrics`, TTL 300 seconds; search key `official-firm-search`, TTL 120 seconds. Both use tag `official-firms`, but the production load did not call `revalidateTag`; the page is force dynamic while its underlying reads remain independently cached. That explains why the card had refreshed to 31,268 and the search total still displayed 25,777. The branch moves those two keys to `*-b1-count-gate`; no production cache purge occurs. Firm-profile cache TTL is 1,800 seconds and is unchanged.

## Exact eligibility and read-only preview

The shared count/search predicate preserves every non-synthetic legacy firm that lacks this exact B1-created marker. A firm with `b1_created_firm=true` in release `a89165b8-b60a-4b31-9009-8b2a0291f8f8` joins the public count only when the same release has a `publication_allowed=true`, APPROVED, current, firm-grain state-adviser row whose native firm CRD matches `firm_identifiers`. Release label, dataset and SHA-256 are checked. Names, address states, fuzzy links and Florida OFR do not determine eligibility.

Read-only production simulation using the actual loaded rows:

| Count | Value |
| --- | ---: |
| Canonical non-synthetic firms | 31,268 |
| Public eligible while B1 flags are OFF | 25,777 |
| B1-created firms contributing while OFF | 0 |
| Public eligible with a simulated B1 flag ON | 31,268 |
| B1-created firms contributing in simulation | 5,491 |
| Held B1 firms missing an otherwise eligible approved row | 0 |

The disposable PostgreSQL test evaluates the **same TypeScript-generated SQL predicate** before activation, after simulated activation, and after flag-only rollback. It checks the public count transitions 451 → 5,942 → 451 in its fixture, keeps the canonical 5,942 constant, and hides/shows/hides the release-summary row. The scale differs because that fixture contains only the 451 exact existing firms plus 5,491 newly loaded firms; the predicate and source rows are the same. The production-derived OFF/ON count above is not hard-coded into application code.

The branch is a count and summary repair. It does not turn the 5,491 state-only firms into legacy profiles or make the September release public. The previously prepared activation packet remains blocked pending the independent publication gate.
