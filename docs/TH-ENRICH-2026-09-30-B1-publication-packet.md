# TH-ENRICH-2026-09-30-B1 — Investor publication packet

**Superseded for release review:** this packet preserves the August 27 frozen candidate. Use the [September 30 Investor release candidate](TH-ENRICH-2026-09-30-B1-investor-release-candidate.md) and its PR migration for the current Founder gate.

Production changed: **NO**. Official source snapshots and derived rows are in the [source manifest](TH-ENRICH-2026-09-30-B1-source-manifest.json); raw releases remain local. The four state lenses use the already-owned IAPD state compilation dated 2026-08-27. The Pennsylvania PDF is dated 2026-08-31.

## Source and identity decisions

| Dataset | Raw / parsed / unique | Identity, bridge, and publication rule |
| --- | ---: | --- |
| FL OFR AI + JZ | 11,463 / 11,463 / 11,463 licenses | 9,188 IA and 2,275 BD. Already owned: do not reload. Zero exact OFR-to-CRD bridges; all 11,463 source licenses unlinked. No status column. Monthly presence is a snapshot, not proof of continuous licensure. 56 firm-name strings have multiple licenses. No adviser denominator change. |
| CA IAPD state IA | 3,381 state observations; 3,341 APPROVED | 260 membership rows exact-bridge to existing CRD; 3,081 memberships need new CRD firm identities. State is issuing regulator code. |
| TX IAPD state IA | 4,681 state observations; 1,985 APPROVED | 246 exact-bridge memberships; 1,739 need new CRD firms. `CONDREST` 2,642, `TERMREQUEST` 49, `LIMITED` 5 excluded. |
| AZ IAPD state IA | 680 state observations; 673 APPROVED | 72 exact-bridge memberships; 601 need new CRD firms. `TERMREQUEST` 7 excluded. |
| WA IAPD state IA | 610 state observations; 600 APPROVED | 34 exact-bridge memberships; 566 need new CRD firms. `SUSPENDED` 2 and `TERMREQUEST` 8 excluded. |
| PA registered securities | 73 / 73 / 73 source record hashes | Issuer/offering evidence only; no native issuer ID, no exact issuer bridge, no adviser identity or denominator change. 20 coordination and 53 qualification entries. |

The four approved state slices contain **6,599 registration rows**, **5,939 distinct CRDs**, **456 distinct CRDs already in the firm spine**, and **5,483 distinct CRDs that are new firm candidates**. There are zero ambiguous CRD-to-firm collisions. One CRD may legitimately have several state registration rows; the 6,599 rows must not become 6,599 firms. Existing non-synthetic firm count is **25,777**; the possible count after the exact new CRDs is **31,260**, pending approval and publication checks. Principal-office state overlays already exist and are not duplicated.

OFR primary-address state is not issuing jurisdiction. The August OFR file's most common primary states are FL 2,617, NY 1,482, CA 692, IL 473, and TX 449. OFR `AFFILIATION` is SEC 7,206, FLA 1,982, FNRA 2,225, CAN 50; it is a source class, not identity. The associated-person zip has zero data rows and was not converted into people.

## Staged preview

- [Approved registration rows](../artifacts/th-enrich-b1/iapd_approved_state_advisers.csv): native CRD, state, APPROVED status, date, raw firm names.
- [New firm candidates](../artifacts/th-enrich-b1/iapd_state_new_firm_candidates.csv): 5,483 distinct native CRDs, source names.
- [Existing firm bridges](../artifacts/th-enrich-b1/iapd_state_existing_firm_bridges.csv): 456 exact CRD-to-firm IDs.
- [PA issuer evidence](../artifacts/th-enrich-b1/pa_registered_securities.jsonl): 73 source entry hashes, original names, security descriptions, dates, pages. These hashes are source record keys, not regulator issuer IDs.
- [OFR unresolved licenses](../artifacts/th-enrich-b1/ofr_unresolved_licenses.csv): 11,463 already-owned source licenses held without official CRD bridge; [OFR QA](TH-ENRICH-2026-09-30-B1-ofr-qa.json).
- [State QA](TH-ENRICH-2026-09-30-B1-state-slices-qa.json), [live overlap](TH-ENRICH-2026-09-30-B1-live-overlap.json), and [PA QA](TH-ENRICH-2026-09-30-B1-pa-qa.json).

## Founder gate — exact production change proposed

The live `jurisdiction_registrations.registration_type` check currently permits Florida-specific state IA rows only. Its actual constraint was queried read-only on 2026-09-30; the proposal preserves every allowed live value. Builder B1 has not changed this shared schema. The proposed additive migration is:

```sql
ALTER TABLE jurisdiction_registrations
  DROP CONSTRAINT jurisdiction_registrations_registration_type_check;
ALTER TABLE jurisdiction_registrations
  ADD CONSTRAINT jurisdiction_registrations_registration_type_check
  CHECK (registration_type IN (
    'FL_NOTICE_FILED_SEC_RIA', 'FL_STATE_REGISTERED_IA',
    'FL_STATE_ERA_REPORTING', 'investment_adviser_representative',
    'FL_CURRENT_IAR', 'FL_APP_PEND_IARCE',
    'STATE_REGISTERED_IA'
  ));
```

After the shared migration is coordinated with B2, approve an idempotent transaction that loads exactly the 6,599 staged state registration rows from the immutable IAPD release, attaches 612 rows to the 456 existing CRDs, creates at most 5,483 `sec-crd-{CRD}` firm shells with one `firm_identifiers(type='crd')` each, and inserts the remaining registration rows by exact CRD. Use `jurisdiction` CA/TX/AZ/WA, `registration_type='STATE_REGISTERED_IA'`, `status='APPROVED'`, `identity_confidence='CONFIRMED'`, `match_basis='exact_crd'`, `source_dataset_id='iapd_state_compilation'`, and `publication_allowed=false`. Keep all new search documents `indexable=false`. Require a post-load recount of 6,599 registration rows, 5,483 newly created CRD firms, zero duplicate CRD identifiers, zero SEC roster changes, and zero new indexable firm pages before any public lens is enabled.

The Pennsylvania source requires an issuer/evidence design decision because it has no native issuer ID. Do not mint adviser firms or canonical issuers from name alone. OFR licenses remain unattached until an official unique OFR-to-CRD bridge is available. No public-record request was filed.

QA run: `python -m py_compile` for the five B1 scripts, `python artifacts/th-enrich-b1-verify.py`, and `python artifacts/th-enrich-b1-ofr-queue.py` passed. The verifier checks the 6,599 unique state/CRD rows, approved-only status, 5,483/456 disjoint new/existing CRD sets, and all 73 unique Pennsylvania source entries. The OFR queue reconciles 11,463 owned licenses. The Investor overlap and live registration constraint were queried read-only.
