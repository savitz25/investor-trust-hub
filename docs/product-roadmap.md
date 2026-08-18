# Product roadmap

## Task 001 — Foundation (this repository)

Durable architecture, schema, provenance model, product shell, design system, synthetic fixtures, tests, CI, documentation. No production regulatory ingest. No Decision Lab calculators.

## Recommended Task 002

**First official source ingestion: SEC IAPD / Form ADV firm foundation.**

- Download, checksum, archive a public ADV-related dataset
- Parse, validate, normalize, conservative entity resolution
- Transactional publish into `firms`, `firm_identifiers`, `registrations`, `evidence_records`
- Idempotent re-run of the same release
- Thin firm research pages that become indexable only with sufficient sourced content
- Still no BrokerCheck prospecting use
- Still no fabricated AUM or performance

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
