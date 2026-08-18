# Compliance boundaries

## Research and education (in scope)

- Explaining what a regulatory record contains
- Translating fee language into dollars under stated assumptions
- Showing mathematical scenarios
- Showing historical or regulatory facts with citations
- Explaining assumptions
- Comparing user-selected scenarios
- Explaining investment terminology

## Personalized financial advice (out of scope)

Do not build language or features that tell a specific person what to buy, sell, convert, or when to retire. Do not declare an investment safe or a scam. Do not name a best advisor.

The product is not:

- a broker-dealer
- an investment adviser
- a robo-advisor
- a credit reporting agency substitute
- a lead marketplace

Users must re-check official sources.

## Source-specific constraints

### FINRA BrokerCheck

May have special permitted-use, attribution, freshness, correction, and marketing restrictions.

- Attribute the source.
- Display freshness.
- Do not market BrokerCheck extracts as a prospecting list.
- Keep research storage logically separate from any future Business Console.

### SEC / IAPD / EDGAR / fund data

Public records still require accurate provenance. Amendments and accessions are history, not overwrites. Do not invent identifiers.

### NFA / CFTC

Disciplinary and registration records are not a complete character judgment. Preserve source wording.

## Synthetic data

Synthetic fixtures exist only to exercise the interface. They are fictional. They are `noindex`. They must carry:

`Synthetic development data — not a real person or firm.`

## Uploads (future)

See `FUTURE_UPLOAD_SECURITY_NOTES` in `packages/config/src/security.ts`. Never request brokerage passwords.
