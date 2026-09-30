# September IAPD publication wiring

Branch based on draft PR #67. **No production deployment, flag update, cache purge or public activation.** Evidence Activation verdict remains pending. The activation SQL in PR #67 still aborts until that independent verdict is `VERIFIED`.

## Public read paths

| Surface | Before branch | Branch predicate and effect |
| --- | --- | --- |
| `/firms` directory metric | `count(*) FROM firms WHERE NOT is_synthetic`; canonical existence raised the number to 31,268 | Shared `publicFirmSql(f)` counts 25,777 while B1 is OFF; 31,268 in simulated ON state. Legacy firms keep their former rule. |
| `/firms` search total | Counted canonical non-synthetic firms, including 5,491 empty B1 results | Same shared firm predicate as the result query. OFF batch contributes zero to count and cards. |
| `/firms` search cards | Legacy classifier rejected B1-only firms after counting them | A flag-allowed IAPD state row can produce a distinct “Reported as state-registered” card. A principal-office state is never substituted with a registration jurisdiction. |
| Autocomplete | No separate autocomplete endpoint or database read exists | No new path; main search is gated. |
| `/firm/[slug]` profile and metadata | Queried canonical firms, but B1 had no legacy registration so the mapper returned null | Shared firm predicate fails closed while OFF. ON state-only firms receive a minimal sourced state-adviser page, kept `noindex`; existing legacy reports remain as before and receive a separate state-registration panel only when its rows are allowed. |
| `/state-advisers` | No dynamic IAPD state-registration lens | New lens reads only exact-release APPROVED, current, firm-grain, flag-allowed rows with exact CRD match. It deduplicates `(CRD,state)` display and counts. Link appears only when allowed rows exist. |
| Static state research pages | Checked-in public-source content; no B1 SQL read | Unchanged. They do not silently become batch-registration pages. |
| `/api/ask` and `/api/specialist-execution/v2` | Roster queries require `form_adv_firm_facts`; B1 has none | Shared firm predicate added to roster filters. The national RIA/ERA Ask contract does not reinterpret state-only firms as SEC RIAs. |
| Customer claim validation and handoff | Calls official firm repository; B1-only firms could not map to a claimable legacy report | Repository firm gate applies. No B1 claim profile is minted. |
| Profile intelligence related/relying links | Resolved any non-synthetic related firm | Shared gate prevents links to unpublished B1 identities. |
| Sitemap and indexability | Requires `search_documents.indexable`, absent for all 5,491 B1 firms | Shared gate added as defense in depth. New minimal state profiles remain noindex; existing 1,000 indexable firm documents unchanged. |
| Structured data and OG metadata | Legacy firm report component emits its existing data; B1 had no report | OFF returns not-found metadata. ON minimal state profile has distinct state copy and no legacy RIA/ERA structured report. |
| Homepage/network metrics API | Checked-in metric artifact, not a live `firms` count | No B1 contribution or change; no dynamic database predicate needed. |
| Cached directory/search/profile reads | Separate Next `unstable_cache` entries | Cache functions call the patched repository. TTLs: metrics 300 seconds, search 120 seconds, profile 1,800 seconds; all carry `official-firms` tag, but there is no automatic post-load tag invalidation. No cache purge is made here. |

The public site showed an intermediate split during audit: “Sourced firms” updated to 31,268 and “Latest sourced release” to September 30, while the separately cached search total still read 25,777. The branch gates the directory count, search total and release label consistently. A future authorized deployment can wait for TTL expiration; this ticket does not invalidate production caches.

## Cohort contract and preview

`publicFirmSql` leaves each non-synthetic legacy firm on its prior public path unless it has a B1 row marked `b1_created_firm=true` in the exact release. For such a firm, eligibility requires an exact-release `publication_allowed=true`, `APPROVED`, current, firm-grain row and a matching authoritative firm CRD. A state-registration surface requires that same allowed row even for the 451 already-owned firms. The query is source-release and checksum bounded; address state, names and fuzzy similarity are never identity authority.

A read-only production simulation of this predicate returned:

| State | Public firms | Visible state registration rows | Newly visible B1 firms |
| --- | ---: | ---: | ---: |
| Current OFF | 25,777 | 0 | 0 |
| Simulated ON | 31,268 | 6,602 | 5,491 |
| After simulated flag rollback | 25,777 | 0 | 0 |

The ON registrations split into 5,993 on the newly visible firms and 609 on the 451 existing exact-CRD firms. Those existing firms are counted once. CA/TX/AZ/WA rows remain 3,336/1,992/674/600. The state lens has 5,942 distinct CRDs and 6,602 distinct `(CRD,state)` keys. New minimal profiles are publicly accessible when ON but stay `noindex` because they lack the content required by the established indexing gate. The 1,000 existing indexable profiles remain unchanged.

## Tests and activation boundary

The disposable PostgreSQL workflow loads the exact B1 data into the inspected schema, evaluates the **same TypeScript SQL predicate** with flags OFF, simulates an Evidence `VERIFIED` verdict and activation, checks firm and registration counts plus uniqueness, then runs the flag-only rollback and rechecks that all canonical rows remain. Unit tests cover state-only search mapping, legacy classification, source/identity constraints and path wiring. The full Investor CI runs on the draft PR.

No published row, production schema, cache, or production application was changed by this branch. A real activation remains separately gated on Evidence certification and Founder authorization.
