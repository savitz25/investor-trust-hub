# TH-INV-HOME-METRICS-REBASELINE-001 — homepage manifest rebaseline

The homepage census and the published network-metrics manifest now carry the canonical firm population that `/firms` already shows after the September 30 IAPD state compilation was published. This is a manifest and reconciliation update only: no data load, no publication-flag change, no Florida OFR change.

## Reconciliation

| Measure | Before | After |
| --- | ---: | ---: |
| SEC/IARD roster firms (RIA 17,018 + ERA 6,604) | 23,622 | 23,622 |
| Canonical identities outside the roster | 2,155 | 7,646 |
| Canonical firm identities | 25,777 | 31,268 |
| CRD-linked firms | 25,777 | 31,268 |

7,646 = 2,155 earlier identities without ADV facts + 5,491 state-registered adviser firms added by release `a89165b8-b60a-4b31-9009-8b2a0291f8f8`.

## What the 5,491 are

APPROVED California, Texas, Arizona and Washington state-registered investment adviser firms from the official IAPD firm-state compilation, whose firm CRDs were absent from the earlier spine. They have no `form_adv_firm_facts` row in this database, so they sit outside the SEC/IARD roster. That is a statement about what is loaded here, not a claim that those firms never filed Form ADV. The homepage label therefore changes from "Canonical identities without ADV facts" to "Canonical identities outside the SEC/IARD roster".

## Why CRD-linked firms equals canonical firms

- Before the load, 25,777 canonical firms carried 25,777 distinct firm CRDs.
- The load created one firm and one `firm_identifiers(type='crd')` row per new CRD: 5,491 distinct CRDs, none already in the spine, zero duplicate CRDs and zero CRD-to-firm collisions ([final preflight](TH-ENRICH-2026-09-30-B1-final-preflight.json)).
- 25,777 + 5,491 = 31,268 firms, each with exactly one distinct CRD.

## Evidence used

Counts are recorded from the certified production receipts, not from a fresh database recount in this change:

- [TH-ENRICH-2026-09-30-B1-final-preflight.json](TH-ENRICH-2026-09-30-B1-final-preflight.json): 25,777 non-synthetic firms before, 5,491 insert candidates, 31,268 after.
- [TH-INVESTOR-2026-09-30-PUBLICATION-R2.md](TH-INVESTOR-2026-09-30-PUBLICATION-R2.md): 31,268 canonical firms; the new firm CRDs have no `form_adv_firm_facts`.
- PR #67 production receipt: `PUBLIC_COUNT_AFTER = 31268`, `CANONICAL_FIRMS = 31268`, `FIRMS_ACTIVATED = 5491`.

## Guard

`scripts/reconcile-network-metrics-r2-04.mjs` now also requires that the non-roster identities equal the two named parts and that distinct CRD firms equal canonical firms, so the manifest build fails if these drift apart.

## Unchanged

Roster, RIA and ERA facts, Form ADV filings and attributes, SEC-file identifiers, RAUM bands, every state lens, and the source dates of the SEC/IARD roster (2026-08-27 release).
