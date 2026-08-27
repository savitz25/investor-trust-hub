# INV-NAT-002A history vs currentness

Fail-closed. A historical row is never `is_current = true` by default.

## Three clocks

| Clock | Source | As-of | Named A/B/D? |
| --- | --- | --- | --- |
| Current roster | IARD FOIA `ia08032026` | 2026-08-03 | No |
| Current compilation | IAPD `IA_FIRM_SEC_Feed_08_27_2026` | 2026-08-27 | No (Item 7.B flag only) |
| Relational filings | Historical dump through 2024-12-26 + IAPD monthlies through 2026-07-31 | Filing `DateSubmitted` | Yes |

The monthly IAPD Part 1 zip is **filings submitted that month**, not a current graph of all firms. July 2026: 2,878 IA + 294 ERA base rows.

## Edge rule

An owner / fund / related-person / office / service-provider edge is `is_current` only if **all** of:

1. The filing CRD is on the current IARD roster
2. This `FilingID` is the CRD’s latest relational filing (`max(DateSubmitted)` across 2011–2026 monthlies)
3. The source of that filing is a current-enough relational vintage (2025–2026 monthly, not the frozen 2011–2024 dump alone)

Otherwise: `is_current = false`, `observed_from = DateSubmitted`, `observed_through` unset or the day before the next filing.

A 2024 Schedule A row is historical even if it is the last named owner list we have. Compilation XML does not replace it with named owners.

## Roster absence

If CRD is in release N and missing from the 2026-08-03 roster:

- Do not flip registration to terminated
- Do not infer withdrawal
- Record `HISTORICAL_ENTITY_CANDIDATE`
- ADV-W `FULL` / `PARTIAL` is the only official withdrawal evidence

ADV-W through 2024-12-26: 21,076 filings, 19,990 CRDs, 15,657 FULL, 5,419 PARTIAL. 1,838 of those CRDs are still on the current roster (partial withdrawal or later re-registration). 1,516 additional ADV-W rows exist in IAPD 2025-01–2026-07 monthlies.

## RIA vs ERA

Keep `dataset_kind` on every filing. An ERA filing does not become an SEC-registered adviser because a later RIA filing shares a name.

## Item 11 / DRP

Item 11 checkboxes and DRP tables stay source text. They do not create `disclosure_events` in 002A.
