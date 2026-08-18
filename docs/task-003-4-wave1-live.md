# Task 003.4 — Wave 1 live

## Status

```text
COMPLETE — WAVE 1 LIVE
```

## Gate A proof (before apply)

On `https://www.investortrusthub.com` with DB indexable still 0:

| Surface | Result |
| --- | --- |
| `/` `/firms` `/research` `/methodology` `/sources` `/about` | `index, follow` |
| `/firm/sec-crd-105958` `109691` `106676` `2288` | `noindex, follow` |
| `/firms?q=` `/firms?state=` | `noindex, follow` |
| Database indexable | 0 |

That is Gate A ∧ Gate B ∧ ¬Gate C.

## Wave 1 apply

```text
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
```

`--all-eligible` was not used. Algorithm `crd-sha256-v1` unchanged.

```text
official           23,622
indexable           1,000
held               22,622
synthetic indexed       0
duplicates              0
ineligible indexed      0
RIA / ERA / pending  703 / 283 / 14
```

Idempotent re-apply kept `currently_indexable = 1,000` and the same CRD sample.

Manifest: `data/reports/waves/wave-1.json` (gitignored).

## Sitemap / robots

```text
https://www.investortrusthub.com/sitemap.xml
static 11 + firms 1,000 = 1,011
held/synthetic/query/vercel/apex excluded
```

`robots.txt` advertises `https://www.investortrusthub.com/sitemap.xml`.

## Holdouts

- 10 Wave 1 firms: `index, follow`, www canonical, in sitemap
- 10 held firms (including Vanguard 105958): `noindex, follow`, www canonical, not in sitemap, still searchable

## Caching note

Firm HTML had cached `currentlyIndexable` after apply. Metadata now reads `search_documents.indexable` live (`getOfficialFirmIndexable`). Firm-page `revalidate` is 300 seconds.

## Rollback

```text
SITE_INDEXING_ENABLED=false
python services/ingestion/scripts/firm_indexability_report.py --rollback --wave-id wave-1 --apply
```
