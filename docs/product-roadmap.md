# Product roadmap

## Task 001 — Foundation

Durable architecture, schema, provenance model, product shell, design system, synthetic fixtures, tests, CI, documentation.

## Task 002 — SEC adviser firm ingestion

Official SEC IARD RIA + ERA monthly firm rosters. CRD identity, provenance, quarantine, dry-run, idempotent publish. No BrokerCheck. No person ingest. No mass SEO.

## Task 003 — Firm Trust Reports

CRD-stable `/firm/sec-crd-{CRD}` reports, `/firms` national search, deterministic indexability and geo-discovery gates.

## Task 003.1 — Vercel browser QA and SEO launch safety

Prove the live Vercel consumer experience against production Supabase. Two SEO gates at the time: `SITE_INDEXING_ENABLED` and `search_documents.indexable`.

## Task 003.2 — Host-aware SEO + Wave 1 tooling

Host-aware Gate B. Deterministic Wave 1 tooling.

## Task 003.3 — Permanent domain certification (current)

`https://www.investortrusthub.com` is live with HTTPS and apex redirects. Concurrency gate passed after switching Vercel to the transaction pooler. `SITE_INDEXING_ENABLED` is still false. Wave 1 is not applied.

## Recommended Task 003.4

Operator sets Production `SITE_INDEXING_ENABLED=true` → prove shell indexable / firms still noindex → `--wave-size 1000 --apply` → observe. Do not start automatically.

## Recommended Task 004

**Associated professionals and BrokerCheck as a research citation.**

- IAR / professional records from official sources
- FINRA BrokerCheck as a cited research source, isolated from any sales console
- Still no rankings, Trust Scores, or lead marketplace

## Later research milestones

- IAR / professional records (IAPD individuals)
- FINRA BrokerCheck as a *research citation* source, isolated from any sales console
- Branch / location coverage
- Disclosure events with source text only
- EDGAR issuer pages
- Fund series/class + N-CEN / N-PORT

## Decision Lab (documented, not built)

| Tool | Depends on | Guardrail |
| --- | --- | --- |
| Advisor Fee Decoder | Fee fields + user assumptions | Dollars under assumptions, not “you should pay X” |
| Portfolio X-Ray / Fund Overlap | Product identifiers + holdings | Descriptive overlap, not buy/sell |
| Investment Statement Analyzer | User upload security | No credential harvesting |
| Can I Retire Yet? | Assumptions engine | Scenario, not a yes/no verdict |
| Retirement Scenario Lab | Assumptions engine | Compare user-selected cases |
| Social Security Claiming Explorer | Benefit tables + assumptions | Not “file at 62” advice |
| Roth Conversion Explorer | Tax assumptions | Not “convert $X” |
| RMD Forecast | Balance + table year | Projection only |
| IRMAA Watch | Income assumptions | Bracket education |
| Retirement Paycheck Builder | Income sources | Assembly, not a plan |
| 401(k) X-Ray | Plan lineup facts | Research, not allocation advice |
| Sequence-Risk Stress Test | Return path assumptions | Stress, not a guarantee |
| Investment Offer Analyzer | Checklist + sources | Questions to investigate |
| Annuity / Structured Product Decoder | Feature taxonomy | Translation, not suitability |
| Retirement Location Comparison | Tax/cost assumptions | Comparison, not relocation advice |

## My InvestorTrustHub (future)

Saved professionals, firms, portfolios, assumptions, scenarios, uploads, compare lists, regulatory-change monitoring. Schema exists. Auth and uploads do not.

Do not start Task 002 automatically from this document.
