# ASK-SEARCH-INVESTOR-002 — Ask Handoff Consumer

**Status:** Implemented on InvestorTrustHub (not wired into Ask production deploy)

Receives structured AskTrustHub Universal Search handoffs and preloads the
existing `/firms` adviser search experience. Consumers do not retype the search.

**Preserves ASK-SEARCH-INVESTOR-001** (`739d058`): CRD identity, RIA ≠ ERA,
physical ≠ regulatory geography, Wave-1/held gates, discovery pilot fingerprint
`8f16793a6bbaeb630f5f643c00f0ca8f06539b0bb3cf73a26d6160908467f52a`.

## Entry

| Route | Role |
|-------|------|
| `/from-ask?src=ask&…` | noindex receiver → redirects to `/firms` or unsupported |
| `/from-ask/unsupported` | Investment products / ambiguous / invalid fail-closed |
| `/firms?src=ask&…` | Preloaded adviser results (indexable only) |
| `/firm/sec-crd-{CRD}?src=ask&…` | Trust Report + “Back to Results” (canonical path stays clean) |

## Allowlist

`src`, `journey`, `state`, `county`, `intent`, `entity`, `category`, `city`, `zip`, `sid`

`src` must be `ask`. Forbidden: `query`, `q`, `email`, `phone`, `name`, `ssn`,
`portfolio`, `holdings`, `next`, `redirect`, `returnUrl`, etc.

**County:** ignored (unsupported in Investor-001 — never invented / geocoded).

## Entity behavior

| Entity / category | Behavior |
|-------------------|----------|
| `entity=ria` | RIA-only (`registered_investment_adviser`, incl. pending) |
| `entity=era` | ERA-only (`exempt_reporting_adviser`) |
| `category=advisory_firm` / `investment_adviser` without entity | Broad adviser search; each row keeps actual RIA/ERA status |
| `investment_company`, stocks, funds, ETF, crypto, lender, … | Unsupported — never defaulted to RIA |

## Geography

- **Physical** principal-office city / state / ZIP only
- Regulatory / notice-filing geography ≠ office location
- Florida registration alone never satisfies Boca Raton
- ZIP is principal-office evidence only (not service area)
- No silent widen: city→state, RIA→all, NJ→nationwide

## Held / indexable safety

Ask receiving path sets `indexableOnly=true` so the ~22,622 held/noindex firms
cannot reappear through a different search path. Shell/held profiles are not
promoted merely because a CRD exists.

## Ranking

Ask results order by **display name only**. Never RAUM, AUM, firm size, Premium,
payment, popularity, ratings, reviews, or Trust Score.

## Modules

- `packages/domain/src/ask-handoff.ts` — parse, serialize, destinations, labels, filters
- `packages/domain/src/firm-search-query.ts` — Ask → `ParsedFirmSearch`
- `apps/web/src/app/from-ask/*` — receiver + unsupported
- `apps/web/src/app/firms/page.tsx` — preload banner + filters
- `apps/web/src/app/firm/[slug]/page.tsx` — Back to Results when Ask context present

## External calls (live receiving path)

```text
Google Places: 0
LLM: 0
external geocoding: 0
new enrichment: 0
Ask runtime: 0
```

## Example View More

```text
/from-ask?src=ask&entity=ria&state=FL&city=boca-raton
  → /firms?src=ask&entity=ria&state=FL&city=boca-raton
```
