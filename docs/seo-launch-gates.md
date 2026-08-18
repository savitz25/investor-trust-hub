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

## Future waves

The operator script can apply Gate B without changing eligibility rules:

```text
python services/ingestion/scripts/firm_indexability_report.py
python services/ingestion/scripts/firm_indexability_report.py --wave --limit 1000
python services/ingestion/scripts/firm_indexability_report.py --wave --crds=105958,2288 --apply
```

`--wave` is additive (does not turn other firms off). Selection by slug order or explicit CRDs — not RAUM, fame, or paid status.

Do not run `--apply` until the permanent domain is attached and Gate A is explicitly enabled.

## Permanent-domain sequence

```text
Vercel QA
→ attach permanent domain
→ set NEXT_PUBLIC_SITE_URL
→ confirm canonical HTML
→ SITE_INDEXING_ENABLED=true
→ Wave 1 (500–1,000)
→ monitor
→ expand
```
