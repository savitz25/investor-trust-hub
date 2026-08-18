# Task 003.2 — Permanent domain + Wave 1 SEO

## Domain status (this run)

`investortrusthub.com` and `www.investortrusthub.com` resolve on **Vercel DNS** (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`). HTTP returns:

```text
404 X-Vercel-Error: DEPLOYMENT_NOT_FOUND
```

HTTPS does not complete. The names are **not assigned** to project `investor-trust-hub-web`.

That matches the AskTrustHub naming pattern (`contractortrusthub.com`, `insurancetrusthub.com`, `lendertrusthub.com`) but is **not** a verified attached production origin. This task therefore **does not** set `SITE_INDEXING_ENABLED=true` and **does not** apply Wave 1.

Recommended canonical after the operator attaches the domain (same pattern as the other hubs):

```text
https://www.investortrusthub.com
```

Apex should 301/308 to `www`. Do not treat `.vercel.app` as canonical.

## Operator steps to unblock launch

1. Vercel → project `investor-trust-hub-web` → Settings → Domains.
2. Add `www.investortrusthub.com` and `investortrusthub.com`. The zone already uses Vercel nameservers.
3. Wait until both hosts show a valid certificate (not `DEPLOYMENT_NOT_FOUND`).
4. Production env (do not set these on Preview):
   - `NEXT_PUBLIC_SITE_URL=https://www.investortrusthub.com`
   - `CANONICAL_HOST=www.investortrusthub.com`
   - `INDEXABLE_HOSTS=www.investortrusthub.com,investortrusthub.com`
5. Redeploy Production.
6. Confirm HTTPS, apex → www 301/308, and `.vercel.app` still `noindex`.
7. Only then set `SITE_INDEXING_ENABLED=true` on Production and redeploy.
8. Dry-run, then apply Wave 1:

```text
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
```

## Host-aware indexing

```text
Gate A  SITE_INDEXING_ENABLED=true
Gate B  request host ∈ INDEXABLE_HOSTS and not *.vercel.app / Preview
Gate C  search_documents.indexable = true   (firms only)
```

`.vercel.app` is hard-blocked even if listed in `INDEXABLE_HOSTS`. Preview (`VERCEL_ENV=preview`) is always noindex.

Preferred alias behavior (Option A): production `.vercel.app` stays reachable, `noindex, follow`, canonical from `NEXT_PUBLIC_SITE_URL`. Middleware also sets `X-Robots-Tag: noindex, follow` on unapproved hosts.

## Sitemap

`/sitemap.xml` is a single urlset (no `generateSitemaps` index). Empty while Gate A+B fail. After Wave 1 on the permanent host it should contain shell paths + exactly the indexable firm URLs.

## Rollback

```text
SITE_INDEXING_ENABLED=false     # sitewide noindex after env/redeploy
python services/ingestion/scripts/firm_indexability_report.py --rollback --wave-id wave-1 --apply
```

## TLS

Node still encrypts to the Supabase session pooler and skips CA verification (`rejectUnauthorized=false`). See `docs/indexing-wave-operations.md`.
