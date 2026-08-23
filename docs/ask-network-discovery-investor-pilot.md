# ASK-SEARCH-INVESTOR-001 — InvestorTrustHub Network Discovery Pilot

**Status:** PILOT / NOT YET CONSUMED BY ASK PRODUCTION  
**Export:** `data/network-discovery/investor-discovery-pilot.v1.json`  
**Schema:** `ask-network-discovery-v1`  
**Hub:** `investor`

## Canonical regulatory source

| Layer | Role |
|-------|------|
| SEC IA RIA / ERA monthly rosters | Authoritative firm universe (Form ADV / IARD) |
| `firms` + `firm_identifiers` (CRD) | Canonical entity + stable identity |
| `registrations` | RIA vs ERA status |
| `branches` (main office) | Physical principal office |
| `search_documents.indexable` | Wave 1 SEO/research cohort (1,000 firms) |
| `evaluateFirmIndexability` | Trust Report content gate |

**Not included:** stocks, funds, ETFs, crypto, issuers, products, state-only advisers (not ingested), notice-filing states (raw-only).

## Counts (documented production universe)

| Metric | Count |
|--------|------:|
| Official SEC firms | 23,622 |
| RIA | 17,018 |
| ERA | 6,604 |
| Wave 1 indexable | 1,000 |
| Held (noindex) | 22,622 |

Pilot eligibility uses **Wave 1 indexable** firms that also have a usable principal-office US state (Ask geo discovery). Held/noindex firms are not promoted into Ask discovery.

## CRD identity

```text
network_entity_id = investor:crd-{digits}
canonical URL     = https://www.investortrusthub.com/firm/sec-crd-{digits}
```

- Deterministic, unique, no name-only keys
- Duplicate CRDs rejected
- Synthetic `SYN-*` excluded

## RIA ≠ ERA

| Source | `entity_type` | Summary |
|--------|---------------|---------|
| `registered_investment_adviser` + registered | `ria` | SEC-registered investment adviser |
| `registered_investment_adviser` + pending | `ria` (+ category `pending`) | Pending / 120-day |
| `exempt_reporting_adviser` | `era` | Exempt reporting adviser |

Categories also include `advisory_firm`, `investment_adviser` for synonym matching. ERA is never labeled RIA.

## Entity model

Prefer **entity_type = `ria` | `era`** (Ask vocabulary).  
`advisory_firm` / `investment_adviser` appear as categories, not duplicate rows.

## Physical vs regulatory geography

| Signal | Source | Use |
|--------|--------|-----|
| Physical city/state/ZIP | Principal office (`branches` / published page) | Exact city queries (e.g. Boca Raton) |
| Registration / notice-filing states | Raw ADV only (not normalized) | **Not** exported as office location |
| County | Unsupported | |

Florida registration alone never implies Boca Raton.

## Profile / Trust Report maturity

`trust_report_available = true` only for firms that pass Trust Report eligibility (sourced CRD, classification, observation, evidence, snapshot, consumer fact). Wave 1 indexable firms meet this bar.

## Discovery eligibility (fail-closed)

1. Non-synthetic  
2. Valid CRD  
3. Display/legal name  
4. Clear RIA/ERA/pending class  
5. Trust Report eligible  
6. Wave indexable (`search_documents.indexable`) **or** published Wave 1 sitemap membership  
7. Usable US principal-office state  
8. Canonical HTTPS Investor profile URL  

**Not used:** RAUM, AUM, firm size, Premium, payment, popularity, reviews, Trust Score.

## Cohort algorithm

1. Load Wave 1 / indexable firm set  
2. Apply eligibility  
3. Sort by `network_entity_id` ascending  
4. Take first **200**  

Query-independent. Not biased by RAUM, geography quotas, or QA queries.

## Fail-closed investment products

These never match advisory firms:

Apple stock · S&P 500 fund · ETF Florida · crypto investment · investment property lender · hedge fund performance

## Security / data minimization

No RAUM, disciplinary narratives, full ADV, client PII, phones, emails, credentials, Premium, rankings, or Trust Score internals in the feed.

## Ask compatibility

Ready for future Ask ingestion after Move/Insurance paths are proven. Adapter maturity may later move from `soft_handoff` toward `ready` — **Ask adapter not changed in this task**.

## Source modes

| Mode | When |
|------|------|
| `database_wave_indexable` | `DATABASE_URL` available |
| `production_sitemap_pages` | Fallback: read-only HTTPS to own Hub sitemap + firm pages |
