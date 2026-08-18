# Task 003.3 — Permanent domain certification

## Domain

| | |
| --- | --- |
| Canonical | `https://www.investortrusthub.com` |
| Apex | `https://investortrusthub.com` → **308** → www, path preserved |
| HTTP | 308 → HTTPS, then to www |
| Certificate | Let's Encrypt, CN matches host, expires 2026-11-16 |
| Vercel project | `investor-trust-hub-web` |
| Production SHA | must match `main` |
| `.vercel.app` | **308** to www (Option B — not a second origin) |

## Environment (inferred from rendered output, values not printed)

| Variable | Observed behavior |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonicals are `https://www.investortrusthub.com/...` |
| `CANONICAL_HOST` | Apex permanently redirects to www |
| `INDEXABLE_HOSTS` | Apex is treated as an alternate of www |
| `SITE_INDEXING_ENABLED` | **false** — sitewide `noindex, follow` |
| `DATABASE_URL` | Server-only; Vercel runtime uses transaction pooler port **6543** |

## Host matrix

```text
www.investortrusthub.com          noindex until Gate A
investortrusthub.com              308 → www
investor-trust-hub-web.vercel.app 308 → www
Preview                           X-Robots-Tag: noindex
```

## Concurrency (after hardening)

Transaction pooler on Vercel + data cache + retries:

```text
requests 40
HTTP 2xx 40
temporary-unavailable 0
failures 0
p50 290ms
p95 2149ms
max 2592ms
```

Session-mode pooler (`:5432`) is limited to 15 clients and must not be used by serverless isolates.

## TLS

Encrypted = yes. CA verification = no (`rejectUnauthorized=false`). verify-full still fails against the pooler from the operator network. Not changed. Launch-hardening item remains.

## Wave 1

Dry-run refreshed; **not applied**.

```text
wave-1 / crd-sha256-v1
eligible 23,622
selected 1,000
RIA 703 / ERA 283 / pending 14
duplicates 0
ineligible 0
DB indexable 0
```

Manifest: `data/reports/waves/wave-1.json` (gitignored).

## Remaining operator step to finish Wave 1

This workspace cannot write Vercel Production env vars (no Vercel token/CLI).

1. Production only: `SITE_INDEXING_ENABLED=true`
2. Redeploy
3. Confirm homepage/`/firms` indexable, **all firm pages still noindex** (Gate C)
4. `.vercel.app` still redirects / is not a second origin
5. Then:

```text
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
```

Do not use `--all-eligible`.

## Rollback

```text
SITE_INDEXING_ENABLED=false
python services/ingestion/scripts/firm_indexability_report.py --rollback --wave-id wave-1 --apply
```

## Unused Vercel leftovers (remove if unused)

- `SUPABASE_SERVICE_ROLE_KEY`
- `INGESTION_DATABASE_URL`
- `Admin_Secret`
