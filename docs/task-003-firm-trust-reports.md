# Task 003 — Firm Trust Reports and national search

## Status

Production SEC adviser firms can be researched at `/firm/sec-crd-{CRD}` and searched at `/firms`. Indexability is computed by a deterministic gate. Official pages stay `noindex` until the operator applies the gate.

## Routes

| Route | Behavior |
| --- | --- |
| `/firms` | Live official directory and search |
| `/firms?q=` / `?state=` | Shareable research filters, noindex |
| `/firm/sec-crd-{CRD}` | Canonical Firm Trust Report |
| `/firm/{synthetic-slug}` | Labeled synthetic fixture only |

Firm pages are server-rendered. They are not statically generated for the full production universe.

## Trust Report sections

1. Identity and classification
2. What the status means
3. Official identifiers
4. Principal office (source-supported only)
5. Source freshness
6. Firm / ADV facts (legal structure, website as reported)
7. Regulatory assets under management
8. Disclosures: not yet fully researched
9. Evidence / source details
10. What InvestorTrustHub has not researched yet
11. Methodology

## Status language

| Population | Headline |
| --- | --- |
| RIA registered | Reported as registered |
| RIA 120-Day Approval | Pending / 120-Day Approval |
| ERA | Exempt Reporting Adviser |

Source text such as `Approved` appears only in evidence detail. It is never consumer headline copy.

## Data access

`apps/web/src/lib/db.ts` and `apps/web/src/lib/firms/` are server-only. They use `DATABASE_URL` with parameterized queries. `INGESTION_DATABASE_URL` and the Supabase service-role key must not be placed in the Vercel web project.

The Node `pg` client uses TLS to the session pooler. The pooler certificate chain is not verifiable from this operator network (`self-signed certificate in certificate chain`), so the web pool encrypts without CA verification. Do not disable TLS.

Recommended Vercel web env:

| Variable | Preview | Production |
| --- | --- | --- |
| `DATABASE_URL` | yes | yes |
| `NEXT_PUBLIC_SITE_NAME` | yes | yes |
| `NEXT_PUBLIC_SITE_URL` | after first URL exists | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | optional |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | optional |
| `SUPABASE_SERVICE_ROLE_KEY` | no | no |
| `INGESTION_DATABASE_URL` | no | no |

## Official record link

A stable IAPD firm-summary deep link was not confirmed from this operator network. Trust Reports link to the official IAPD homepage (`https://adviserinfo.sec.gov/`) and tell the consumer to search by CRD.

## Operator commands

```text
python services/ingestion/scripts/apply_migrations.py
python services/ingestion/scripts/firm_indexability_report.py
python services/ingestion/scripts/qa_firm_holdout.py
python services/ingestion/scripts/search_perf.py
python services/ingestion/scripts/firm_indexability_report.py --apply
```

## Known limitations

- Individual professionals and BrokerCheck are not researched yet
- Form ADV Items 5–12 are not interpreted as disciplinary history
- `ZZ` countries are shown as not normalized, never as the letters ZZ
- Search query URLs are intentionally noindex
- IAPD deep links are not asserted
