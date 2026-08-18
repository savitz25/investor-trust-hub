# Task 003.1 — Vercel browser QA and SEO launch safety

## Deployment

| | |
| --- | --- |
| Vercel project | `investor-trust-hub-web` |
| Public QA hostname | `https://investor-trust-hub-web.vercel.app` |
| Framework | Next.js |
| Root directory | `apps/web` |
| Ingestion | operator-only; not a Vercel service |

`NEXT_PUBLIC_SITE_URL` controls canonical URLs. Do not hard-code the Vercel hostname.

## Playwright

```text
npx playwright install chromium
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://investor-trust-hub-web.vercel.app npm run test:e2e:live
```

`test:e2e` is local shell smoke (starts `next start` if needed).  
`test:e2e:live` hits the deployed URL. It is not part of every GitHub push.

Screenshots land in `var/qa-screenshots/` (gitignored).

## Indexing during this task

```text
SITE_INDEXING_ENABLED=false
search_documents.indexable remains 0
do not run firm_indexability_report.py --apply
```

The `.vercel.app` host is a QA/staging environment, not the permanent SEO site.

## Environment

Keep in the Vercel web project:

- `DATABASE_URL` (server-only)
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `SITE_INDEXING_ENABLED=false`
- optional `NEXT_PUBLIC_SUPABASE_*`

Remove if unused by the web app:

- `INGESTION_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Preview-only leftover)
- `Admin_Secret`

## TLS

Node `pg` talks to the Supabase session pooler with TLS. On this operator network the pooler chain presents as an untrusted/self-signed chain, so CA verification is skipped while encryption stays on. Revisit at permanent-domain launch if Vercel’s runtime can verify the official chain.

## Known issues

- Vercel QA hostname is not the public SEO origin
- Firm indexability is held at 0
- Service-role key still present in Vercel Preview and should be removed if unused
