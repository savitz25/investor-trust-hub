# INV-NAT-002C profile intelligence contract

Snapshot version: **`investor-trust-report-v2`**.

Existing Firm Trust Report identity/RAUM/source fields remain the v1 consumer surface. `intelligence` is additive and present only on currently indexable Wave-1 firms.

## Publication gate

`mayPublishAdvRelationship({ confidence, isCurrent, family, allowHistorical })`

| Confidence | Current relationship | Historical context |
| --- | --- | --- |
| CONFIRMED | Allowed | Allowed only when `allowHistorical` (filings, ADV-W, CRS) |
| HIGH_CONFIDENCE | Allowed for owner, executive, service_provider, other_office | No, unless `allowHistorical` |
| REVIEW_REQUIRED | Never | Never |
| UNRESOLVED | Never | Never |

Related organizations and named private funds require CONFIRMED (CRD or official 805- Fund ID). Name-only rows stay internal.

HIGH_CONFIDENCE owners are OwnerID-backed names on the **firm** page only. They are not person pages. OwnerID is not a person CRD.

## Snapshot shape

Separate structures:

- `current` — gated named relationships plus hidden REVIEW_REQUIRED counts
- `historical` — filing summary, recent filings, ADV-W
- `documents` — CRS mappings; Part 2A count (expected 0)
- `sources` — methodology copy
- Item 11 / scale / compensation / custody / Item 6 / affiliations as source-faithful attributes

Lists are bounded (`ADV_PROFILE_LIST_LIMIT` / filing limit 12). Totals remain on `current.counts`.

## Compatibility

- No change to `/firm/sec-crd-{CRD}` routes
- No sitemap/robots change
- Non-indexable official firms keep the pre-002C Trust Report (no `intelligence`)
- Cache key `official-firm-by-slug-v2`

## Non-goals

No `/person/`, `/owner/`, `/professional/` expansion, no public fund pages, no historical-firm pages, no `disclosure_events`, no Trust Score.
