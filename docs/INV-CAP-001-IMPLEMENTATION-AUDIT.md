# INV-CAP-001 implementation audit

Pre-implementation checkpoint: 2026-09-01

- Canonical base: `44f531f81d5912bbc831439f5500bc48a9bf5d15`.
- Production executes `investor-ask-v1` through `GET /api/ask`.
- Natural language is interpreted by `interpretInvestorAskQuery`, then executed by
  the single server-side query engine in `apps/web/src/lib/ask/execute.ts`.
- That engine already supplies firm-class separation, exact CRD, principal-office
  geography, RAUM, Item 5.E compensation, bounded pagination, provenance, source
  clocks, limitations, and publication-gated profile destinations.
- The V2 implementation must therefore be an adapter, not another parser or SQL
  execution path.
- Current production goldens: New Jersey 438; Texas 1,302; Florida RIA RAUM
  $1B–$10B 224; CRD 166089 exact; ranking request fails closed. These are observed
  baselines, not hard-coded contract values.
- Current source: `IA_FIRM_SEC_Feed_08_27_2026`, official as of 2026-08-27,
  retrieved 2026-08-28.
- Public destinations remain limited to the accepted indexability gate. A source-safe
  research row may have no profile destination.
- No DB, identity, publication-rule, profile, or sitemap writes are required.

Execution path to preserve:

`request → investor-ask-v1 interpretation → existing structured firm query → bounded source rows → publication-gated destination → V2 normalization`
