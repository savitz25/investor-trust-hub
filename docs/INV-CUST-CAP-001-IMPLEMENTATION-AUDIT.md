# INV-CUST-CAP-001 implementation audit

Audit date: 2026-09-02  
Audited source: `origin/main` at `7752cdc1a58c822d510f06180faf8dfea5889cde`  
Production specialist contract: `trusthub-specialist-execution-v2` `2.0.0`

## Production finding

Production exact-CRD execution is correct for research but is insufficient for a
customer claim. `CRD 166089` returns `EXACT_IDENTITY`, the exact firm CRD,
publication state, and source destination, but correctly has no public profile.
An indexable example (`CRD 312385`) returns its canonical public profile URL.
Neither response exposes Investor's stable native profile identity.

The existing V2 contract must remain unchanged: it intentionally excludes internal
database identifiers from public research rows. Adding a customer-only identity field
to every research response would weaken that boundary.

## Canonical identity proof

Investor already has a stable native firm identity: `firms.id`, a UUID primary key
created by migration `0005_canonical_entities.sql`. `firm_identifiers.firm_id`,
registrations, evidence, snapshots, ADV facts, and search publication records attach
to that same UUID. Organization CRD has a unique typed identifier constraint.

Canonical profile eligibility is not derived from the UUID or CRD alone. It requires:

- a non-synthetic canonical `firms` row;
- exact organization CRD attachment;
- the existing `search_documents.indexable` decision;
- the existing content/current-observation indexability gate;
- the exact canonical `/firm/{slug}` destination.

RIA and ERA are regulatory classifications on that one canonical firm identity. They
do not create separate customer identities. People and their CRDs remain in separate
canonical tables and are never accepted by this firm-validation path.

## Smallest safe prerequisite

Add a versioned, POST-only `/api/customer-claim-validation/v1` contract. It requires
all three public identity assertions plus the native UUID: native firm ID, exact firm
CRD, and exact canonical profile URL. It resolves one row through the existing firm
repository and publication logic. A mismatch never falls back to a name, geography,
RAUM, compensation method, or regulatory class.

This endpoint performs no customer verification. AskTrustHub remains responsible for
proving control and managing claims. The endpoint performs no writes, creates no
profile, changes no publication rule, and is absent from the sitemap.
