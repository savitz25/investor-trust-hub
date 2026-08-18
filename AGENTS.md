# AGENTS.md

Guidance for humans and AI builders working on InvestorTrustHub.

This is not a marketing site, a brokerage, or an advice engine. If a change would make the product pick winners, invent regulatory facts, or quietly merge identities, stop.

## Mission

**Research before you invest.**

**We organize the evidence. The consumer decides.**

## Non-negotiable product rules

1. **Cite evidence.** Every material fact shown to a consumer must be traceable to a source record, or explicitly marked not yet researched / unavailable / not found.
2. **Never invent regulatory facts.** No fabricated advisors, registrations, AUM, returns, disclosures, or actions.
3. **Never imply endorsement.** No green checkmarks that mean “approved.” Verification means “the source said this.”
4. **Distinguish missing from clean.** “Not found” never means “none exists” and never means a clean record.
5. **Source freshness matters.** Show retrieved and effective dates. Do not overwrite history without a snapshot.
6. **Preserve raw evidence.** Store raw source values alongside normalized values and a transform version.
7. **No paid ranking.** No featured advisor slots, no pay-to-play directory, no lead marketplace built on research records.
8. **No stock picking.** No “buy this,” “sell that,” or model portfolio as advice.
9. **No opaque Trust Score.** No advisor score, safety score, star ranking, or “#1 advisor” badge.
10. **Never silently merge uncertain identities.** Prefer no match to the wrong match.
11. **BrokerCheck is not a prospecting database.** Research evidence and any future Business Console prospecting system must stay separable.
12. **Synthetic data stays labeled.** Exact phrase: `Synthetic development data — not a real person or firm.`
13. **Do not request financial credentials.** No account aggregation in this product’s current scope.
14. **Do not index empty shells.** Professional/firm/fund/company pages become indexable only when they contain sufficient real sourced content. Firm indexability is a content gate, not a quality ranking. Staging/Vercel hostnames stay noindex unless `SITE_INDEXING_ENABLED` is explicitly true.
15. **ERA is not an RIA.** Exempt reporting advisers must never be presented as SEC-registered investment advisers.
16. **Do not say the SEC approved a firm.** Form ADV / IARD data is filer-supplied. Preserve source text; do not convert `Approved` into endorsement.

## Architecture rules

- Keep domain logic in `packages/domain` or `services/ingestion`, not in React components.
- Do not hard-code a single regulator through the UI. Use the source registry in `packages/config`.
- Identifiers are typed objects (`crd`, `sec_file_number`, `cik`, …), never leftover display strings.
- People, firms, products, and issuers are separate canonical entities. Do not collapse them into `providers`.
- Schema changes go through `database/migrations`. No ORM auto-sync as the source of truth.
- Ingestion must be idempotent on release + transform version.
- Server secrets stay server-only. Validate env with `packages/config` schemas.

## Language

Allowed:

- “Here is how the scenario changes under these assumptions.”
- “Here is what the source reports.”
- “Here are questions you may want to investigate.”
- “We could not verify this claim from the identified sources.”

Forbidden as product guidance:

- “You should buy…”
- “Sell this fund.”
- “This advisor is best for you.”
- “You should convert exactly $X to Roth.”
- “Retire at 62.”
- “This investment is safe.”
- “This investment is a scam.”

Registration copy should say **Reported as registered**, not **Verified advisor**.

## Status vocabulary

Use only:

- verified from official source
- reported by source
- not found
- unavailable
- not yet researched
- conflicting sources

## When adding a feature

1. Does it organize evidence or does it decide for the consumer?
2. Can every new fact point at provenance?
3. Is synthetic data impossible to confuse with official data?
4. Are tests updated for identifiers, copy guardrails, and idempotency?

If you cannot answer those, do not ship the feature.
