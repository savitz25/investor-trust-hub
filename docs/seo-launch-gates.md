# SEO launch gates

Two independent conditions control whether a Firm Trust Report may appear in search engines.

## Gate A — Site launch

```text
SITE_INDEXING_ENABLED
```

Server-only. Missing, empty, or any value other than `true` / `1` / `yes` means **false**.

When false:

- every page is `noindex, follow`
- official firm URLs are omitted from the sitemap
- static shell URLs are also omitted from the sitemap (safest staging posture)
- `robots.txt` does not advertise a sitemap
- pages remain crawlable so crawlers can see `noindex`

The `.vercel.app` environment must stay `false`.

## Gate B — Firm content

`evaluateFirmIndexability` plus `search_documents.indexable`.

A firm URL may be indexed only when:

```text
SITE_INDEXING_ENABLED = true
AND
search_documents.indexable = true
```

These gates must not be collapsed. Eligible content on a staging hostname must stay noindex.

## Canonical URLs

`NEXT_PUBLIC_SITE_URL` is the only application control for canonical generation. Changing the permanent domain does not require a source edit.

On Vercel, if `NEXT_PUBLIC_SITE_URL` is unset or still `http://localhost:3000`, the runtime uses `VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`. That is QA-only. Before public indexing, set `NEXT_PUBLIC_SITE_URL` to the permanent domain and re-check rendered `<link rel="canonical">`.

## Future waves

Indexing waves are operational rollout, not firm ranking. They must not favor paid firms, large RAUM, famous brands, or Business Console subscribers. Prefer a deterministic sample or geographic distribution.

```text
python services/ingestion/scripts/firm_indexability_report.py
python services/ingestion/scripts/firm_indexability_report.py --wave --limit 1000
python services/ingestion/scripts/firm_indexability_report.py --wave --crds=105958,2288 --apply
```

`--wave` is additive (does not turn other firms off). Selection by slug order or explicit CRDs — not RAUM, fame, or paid status.

Suggested later waves:

```text
Wave 1   500–1,000
Wave 2   ~5,000
Wave 3   remaining eligible
```

Do not run `--apply` until the permanent domain is attached and Gate A is explicitly enabled.

## Permanent-domain sequence

```text
Vercel QA
→ attach permanent InvestorTrustHub domain
→ set NEXT_PUBLIC_SITE_URL to that domain
→ confirm canonical HTML
→ SITE_INDEXING_ENABLED=true
→ Wave 1 (500–1,000)
→ monitor
→ expand
```
