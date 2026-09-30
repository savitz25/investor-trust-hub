# TH-ENRICH-B1 Investor final technical preflight

Target: Investor PR #66. Official September 30 IAPD firm-state feed SHA-256: `23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c`. Scout's approximate historical baseline is unavailable and is outside this certified release. Florida OFR is excluded.

**LIVE_SCHEMA_COMPATIBLE = YES**  
**DISPOSABLE_MIGRATION_TEST = PASS**  
**CURRENT_ALREADY_PRESENT = 451**  
**CURRENT_INSERT_CANDIDATES = 5,491**  
**NEW_FIRM_REGISTRATIONS = 5,993**  
**EXISTING_FIRM_REGISTRATIONS = 609**  
**DUPLICATE_KEYS = 0** CRDs in the candidate file; **0** `(CRD,state)` keys; **0** conflicting source records  
**AMBIGUOUS = 0**  
**ROLLBACK_READY = YES**  
**PRODUCTION_MUTATIONS = NO**

## Live inspection, 2026-09-30 15:56 UTC

The [read-only audit](TH-ENRICH-2026-09-30-B1-final-preflight.json) ran with PostgreSQL's read-only transaction setting and rolled back. The live `jurisdiction_registrations` table has the expected firm/person subject check, all columns used by the proposed insert, and a partial unique firm index on `(firm_id,jurisdiction,registration_type,source_dataset_id,source_record_id)`. Its named registration-type constraint allows exactly the six values preserved by migration 0016; `STATE_REGISTERED_IA` is absent. `schema_migrations` does not yet record 0016. `iapd_state_compilation` and `state_securities` exist. There are zero CA/TX/AZ/WA registration rows from any source.

The current 6,602-row approved file has 5,942 distinct authoritative firm CRDs. A fresh exact `firm_identifiers(type='crd')` join finds 451 live canonical firms and 5,491 absent CRDs, matching the versioned candidate file exactly. All 451 existing CRDs have their expected slugs; no absent CRD has a conflicting `sec-crd-{CRD}` slug. No matched firm is synthetic. Candidate legal and business names are present and agree across state rows. No duplicate or conflicting `(CRD,state)` source record exists.

The input is the official **firm-state** XML compilation parsed from `<Firm><Info FirmCrdNb>` and `<StateRgstn><Rgltrs><Rgltr>`, filtered to `APPROVED` for CA/TX/AZ/WA. The [execution SQL](../artifacts/th-enrich-b1-investor-execute.sql) accepts only `source_system='iapd'` and `source_dataset='iapd_state_compilation'`; it inserts `subject_kind='firm'` with `person_id=NULL`. It does not read the IAPD individual, branch, or notice-filing feeds, and does not write `people`, `branches`, or notice-filing registrations. Its only persistent inserts are `source_releases`, new `firms`, their `firm_identifiers`, and `jurisdiction_registrations`. It has no `UPDATE` or `DELETE` of existing canonical firms. It does not write `search_documents` or principal-office overlays; the 4,595 existing firm search documents observed in those address regions remain untouched.

The disposable [GitHub Actions test](https://github.com/savitz25/investor-trust-hub/actions/runs/36740098248) passed on PostgreSQL 16. It applied the exact branch migration, loaded all 5,491 candidate firms and 6,602 registrations into a disposable test schema with 451 seeded existing CRDs, ran the exact guarded data rollback, and restored the original six-value constraint and migration ledger. The test schema was reconstructed from the inspected live table definition on top of repository migrations; it was not a copy of production data. [Migration](../database/migrations/0016_b1_state_adviser_registration_type.sql), [data rollback](../artifacts/th-enrich-b1-investor-rollback.sql), and [constraint rollback](../database/rollback/0016_b1_state_adviser_registration_type.sql) are versioned in PR #66.

## Exact Founder-gated execution packet

Run from this repository root with a separately authorized production `DATABASE_URL`. The first command is read only and aborts unless the current live ownership and LF-normalized staged-file hashes remain exactly certified. Execute the later commands only after Founder approval:

```sh
python artifacts/th-enrich-b1-final-preflight.py
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0016_b1_state_adviser_registration_type.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f artifacts/th-enrich-b1-investor-execute.sql
```

The stage CSV SHA-256 after LF normalization is `a558a5a08afec69008623772d7a2db0a977a0eef98b30ba0ed8a24996b5da48a`; the new-firm candidate CSV is `2b8c728e0b50c009e31c2a6a57887695090b948d5c4839bf78c8e12168bf6698`. The execution script checks exact cardinalities, source/dataset/status/grain, live CRD ownership, absent slugs, migration presence and allowed type, lack of existing target registrations, and a 5,491/6,602/5,993 post-load recount. Its data transaction is serializable and aborts as a unit if any check fails.

## Exact rollback packet

If rollback is required, run these commands in order from the same approved revision:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f artifacts/th-enrich-b1-investor-rollback.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/rollback/0016_b1_state_adviser_registration_type.sql
```

The data rollback requires the exact source-release checksum and row counts, verifies the 5,491 target firm IDs and source names, and refuses to delete any firm that acquired another identifier, registration, search document, foreign-key dependent record, or other later enrichment. It removes only the 6,602 B1 registrations, 5,491 B1-created firms, their CRD identifiers, and the B1 source release. The second script refuses to restore the old constraint while any `STATE_REGISTERED_IA` row remains, then removes the 0016 schema-ledger entry. A guard failure requires manual review; it does not cascade-delete unrelated records.

No production command above has been executed in this preflight.
