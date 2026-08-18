# Task 003.1 — Vercel browser QA and SEO launch safety

## Deployment

| | |
| --- | --- |
| Vercel project | `investor-trust-hub-web` |
| Public QA hostname | `https://investor-trust-hub-web.vercel.app` |
| Framework | Next.js |
| Root directory | `apps/web` |
| Ingestion | operator-only; not a Vercel service |

`NEXT_PUBLIC_SITE_URL` controls canonical URLs. The hostname is never hard-coded. If that variable is missing or still `localhost` on Vercel, the app uses `VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`. Permanent-domain launch is a later env change only.

## Playwright

```text
npx playwright install chromium
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://investor-trust-hub-web.vercel.app npm run test:e2e:live
```

`test:e2e` is local shell smoke (starts `next start` if needed). CI runs it after the Node build.

`test:e2e:live` hits the deployed URL. It is not part of every GitHub push.

Viewports:

- desktop `1440 × 900`
- mobile `390 × 844`
- android-class overflow check `412 × 915`

Screenshots and timings land in `var/qa-screenshots/` (gitignored).

## Indexing during this task

```text
SITE_INDEXING_ENABLED=false
search_documents.indexable remains 0
do not run firm_indexability_report.py --apply
```

The `.vercel.app` host is a QA/staging environment, not the permanent SEO site.

When Gate A is off:

- every page is `noindex, follow` (meta robots, not a robots.txt Disallow of `/`)
- `robots.txt` does not advertise a sitemap
- `/sitemap/0.xml` is an empty urlset
- `/sitemap.xml` is omitted/404 in this Next.js segmented-sitemap mode
- official firm URLs are never emitted

## Environment

Keep in the Vercel web project:

- `DATABASE_URL` (server-only)
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_SITE_URL` (or rely on Vercel hostname fallback for QA)
- `SITE_INDEXING_ENABLED=false`
- optional `NEXT_PUBLIC_SUPABASE_*`

Remove if unused by the web app:

- `INGESTION_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Preview-only leftover)
- `Admin_Secret`

## TLS

Node `pg` talks to the Supabase session pooler with TLS. On this operator network the pooler chain presents as an untrusted/self-signed chain, so CA verification is skipped while encryption stays on (`ssl.rejectUnauthorized = false`). Do not weaken this further. Revisit at permanent-domain launch if Vercel’s runtime can verify the official Supabase chain; if it can, restore normal verification. That is launch hardening, not a browser-QA blocker.

## Known issues

- Vercel QA hostname is not the public SEO origin
- Firm indexability is held at 0
- Service-role key still present in Vercel Preview and should be removed if unused
- Segmented sitemap index (`/sitemap.xml`) 404s while Gate A is off; `/sitemap/0.xml` is empty. Safest staging posture.
