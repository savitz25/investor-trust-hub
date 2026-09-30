# TH-ENRICH-B1 Investor release candidate — 2026-09-30 source

Production changed: **NO**. The August 27 IAPD slice is retained as a frozen historical candidate. This packet uses the official September 30 IAPD compilation, SHA-256 `23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c`, retrieved 2026-09-30 14:30:43 UTC. [Official compilation](https://adviserinfo.sec.gov/compilation).

## Scout and B1 reconciliation

| State | Scout estimate | B1 Aug 27 | Official Sep 30 | Deterministic Aug-to-Sep movement |
| --- | ---: | ---: | ---: | --- |
| CA | ~3,331 | 3,341 | 3,336 | +23 new feed CRDs; −27 APPROVED→TERMREQUEST; −1 removed from feed = −5 |
| TX | ~1,760 | 1,985 | 1,992 | +20 new feed CRDs; +1 CONDREST→APPROVED; −5 APPROVED→TERMREQUEST; −9 removed = +7 |
| AZ | ~678 | 673 | 674 | +9 new feed CRDs; −7 APPROVED→TERMREQUEST; −1 removed = +1 |
| WA | ~600 | 600 | 600 | +5 new feed CRDs; −5 APPROVED→TERMREQUEST = 0 |

The [exact CRD transition audit](TH-ENRICH-2026-09-30-B1-source-drift.json) proves the movement between the two immutable releases. Each state/CRD is unique in the approved extract. TX's 2,655 `CONDREST`, 38 `TERMREQUEST`, and 5 `LIMITED` rows are excluded from the September approved lens. Scout's figures are estimates without an accompanying dated file, query, or native-ID set in the B1 handoff; their exact differences (+5 CA, +232 TX, −4 AZ, 0 WA against September) cannot be attributed more narrowly without that baseline. No filter was changed to match an estimate.

The owned August OFR files contain 11,463 unique FL licenses (9,188 IA, 2,275 BD). The newly retrieved [official OFR](https://flofr.gov/education/public-information/registration-data-download) September files contain 11,500 (9,221 IA, 2,279 BD): 66 exact license additions and 29 removals, net +37. AI SHA-256 `306ab0605bfa2249c28ae9efa17f62faf5dfb3a3566fa7fb02fb3474ec9dcd04`; JZ SHA-256 `c256776f6b32ef2304e99f2e625cd05669d70a86f3b632004e6b781872c47b63`. Scout's ~11,476 lies between the dated snapshots but lacks native IDs and retrieval time, so its 24-license difference from September cannot be classified exactly. OFR was already owned; no reload or OFR-to-CRD bridge is proposed.

## Exact proposed load, September IAPD only

`NEW_CANONICAL_INVESTOR_FIRMS = 5,491` distinct CRDs absent from the live firm identifier spine.

`NEW_STATE_REGISTRATIONS = 5,993` registration rows on those new CRD firms.

`EXISTING_FIRM_REGISTRATIONS_ADDED = 609` rows on 451 existing exact-CRD firms.

`AMBIGUOUS = 0` CRD-to-firm collisions and zero duplicate state/CRD keys.

`EXCLUDED = 2,747` non-APPROVED state observations (CA 32, TX 2,698, AZ 10, WA 7). The already-owned 11,500 OFR licenses and 73 PA issuer-evidence entries are separate held datasets, not adviser firm insertions.

Total approved state memberships: **6,602** across **5,942 unique CRDs**. A CRD in multiple states yields multiple registrations and one firm. The live spine had 25,777 non-synthetic firms at read-only audit; potential post-load count is 31,268. Existing CA/TX/AZ/WA `jurisdiction_registrations` rows: zero. No principal-office overlay is inserted. The [current approved rows](../artifacts/th-enrich-b1-current/iapd_approved_state_advisers.csv), [new unique CRDs](../artifacts/th-enrich-b1-current/iapd_state_new_firm_candidates.csv), and [exact existing bridges](../artifacts/th-enrich-b1-current/iapd_state_existing_firm_bridges.csv) are the versioned preview. [Current live audit](TH-ENRICH-2026-09-30-B1-current-overlap.json) is read only.

Migration [0016](../database/migrations/0016_b1_state_adviser_registration_type.sql) adds `STATE_REGISTERED_IA` while preserving all six live allowed `registration_type` values. The base repository's CI schema omits the live `jurisdiction_registrations` table, so the migration guards that absence; on the audited live schema it changes the constraint. This schema gap must be checked at the Founder gate. The migration is committed to the PR only. The Founder production gate is: verify the live table and migration target, apply migration, recheck CRD uniqueness and source hash, load 5,491 non-indexable CRD firms and 6,602 registrations idempotently by release/state/CRD, and recount. Do not enable public indexing until separate publication review. No production database change was executed.
