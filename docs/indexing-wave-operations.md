# Indexing wave operations

Waves are an operational rollout. They are not a ranking, “best firms” list, or paid placement.

## Algorithm

```text
algorithm: crd-sha256-v1
key: SHA-256(crd + NUL + release_label + NUL + crd-sha256-v1)
order: hash, then CRD
```

Only `trust_report_eligible` official firms are candidates. Selection does not use RAUM, legal name, brand, state preference, or any commercial flag.

## Commands

```text
python services/ingestion/scripts/firm_indexability_report.py
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000
python services/ingestion/scripts/firm_indexability_report.py --wave-size 1000 --apply
python services/ingestion/scripts/firm_indexability_report.py --rollback --wave-id wave-1 --apply
```

`--apply` alone is refused. Publishing every eligible firm requires `--all-eligible` (do not use for Wave 1).

## Manifest

Written to `data/reports/waves/<wave-id>.json` (gitignored under `data/reports/`).

Includes wave id, algorithm, timestamp, source release, eligible universe, selected CRDs, class counts, state distribution, missing-state count, duplicate count, and a 30-CRD QA sample.

## Wave 1 target

```text
selected: 1,000
remaining noindex: 22,622
consumer search: still all 23,622
```

Wave 1 is **applied** on production (`wave-1`, `crd-sha256-v1`). Task 003.5 observed exact sitemap ↔ DB bijection. Do not start Wave 2 from this document.

After any later `--apply`, firm robots read `search_documents.indexable` live. A Production redeploy (or waiting `revalidate = 300`) refreshes cached HTML.

## Suggested later waves

```text
Wave 2   ~5,000 additional
Wave 3   remaining eligible
```

Use the same hash order and a larger `--wave-size`, or an explicit `--crds` list. Do not re-rank.

## TLS risk

| | |
| --- | --- |
| Endpoint class | Supabase session pooler |
| TLS encrypted | yes |
| CA verification | no |
| Reason | Node `pg` / observed pooler chain does not verify as a public CA in this environment |

Re-test with `python services/ingestion/scripts/check_pooler_tls.py` after the permanent domain is live. Restore `rejectUnauthorized: true` only if verify-full succeeds from Vercel. Do not weaken TLS further.

## Concurrency

```text
python services/ingestion/scripts/concurrency_smoke.py --base https://www.investortrusthub.com
```

Modest ~40-request burst. Required before Wave 1: HTTP failures = 0 and temporary-unavailable bodies = 0.

Vercel serverless must use the Supabase **transaction** pooler (`pooler.supabase.com:6543`). Session mode (`:5432`) is capped at 15 clients and will  fail under isolate bursts. The web app rewrites `:5432` → `:6543` only when `VERCEL=1`.

## Permanent domain

Canonical: `https://www.investortrusthub.com`. Apex and production `.vercel.app` permanently redirect there.
