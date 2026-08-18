# Task 003.4 — Gate A + Wave 1

## Status

```text
BLOCKED — GATE A
```

Wave 1 was **not** applied. Database `indexable` remains 0.

## What production actually reports

Secret-free probe `GET /internal/seo-gates` on www:

```json
{
  "siteIndexingEnabled": false,
  "preview": false,
  "approvedHostCount": 2,
  "requestHostApproved": true,
  "requestHostKind": "permanent"
}
```

Gate B is healthy (www is an approved permanent host). Gate A is **not** on in the Production runtime.

Rendered confirmation:

- `/`, `/firms`, `/research`, `/methodology`, `/sources`, `/about` → `noindex, follow`
- Firm pages → `noindex, follow`
- `robots.txt` does not advertise a sitemap
- `/sitemap.xml` is an empty urlset
- `X-Robots-Tag: noindex, follow` on every checked URL

## Operator fix (Production only)

Vercel → project **investor-trust-hub-web** → Settings → Environment Variables:

1. Environment: **Production** (not Preview-only).
2. Key exactly: `SITE_INDEXING_ENABLED`
3. Value exactly: `true`  
   No quotes, no spaces, not `True`, not `enabled`.
4. Save, then **Redeploy** the current Production deployment (env changes are not live until rebuild).
5. Confirm:

```text
curl -s https://www.investortrusthub.com/internal/seo-gates
```

Expected:

```json
{ "siteIndexingEnabled": true, "requestHostApproved": true, "preview": false }
```

Then homepage/`/firms` should become indexable while **firm pages stay noindex** until Wave 1 apply.

## After Gate A is confirmed

```text
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
```

Do not use `--all-eligible`.

## Not done in this task

- Wave 1 apply
- Search Console submit
- Wave 2
- Task 004
