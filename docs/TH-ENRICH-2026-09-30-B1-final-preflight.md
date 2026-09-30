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

## Live inspection, 2026-09-30 17:36 UTC

The [read-only audit](TH-ENRICH-2026-09-30-B1-final-preflight.json) ran with PostgreSQL's read-only transaction setting and rolled back. The live `jurisdiction_registrations` table has the expected firm/person subject check, all columns used by the proposed insert, and a partial unique firm index on `(firm_id,jurisdiction,registration_type,source_dataset_id,source_record_id)`. Its named registration-type constraint allows exactly the six values preserved by migration 0016; `STATE_REGISTERED_IA` is absent. `schema_migrations` does not yet record 0016. `iapd_state_compilation` and `state_securities` exist. There are zero CA/TX/AZ/WA registration rows from any source.

The current 6,602-row approved file has 5,942 distinct authoritative firm CRDs. A fresh exact `firm_identifiers(type='crd')` join finds 451 live canonical firms and 5,491 absent CRDs, matching the versioned candidate file exactly. All 451 existing CRDs have their expected slugs; no absent CRD has a conflicting `sec-crd-{CRD}` slug. No matched firm is synthetic. Candidate legal and business names are present and agree across state rows. No duplicate or conflicting `(CRD,state)` source record exists.

The input is the official **firm-state** XML compilation parsed from `<Firm><Info FirmCrdNb>` and `<StateRgstn><Rgltrs><Rgltr>`, filtered to `APPROVED` for CA/TX/AZ/WA. The [execution SQL](../artifacts/th-enrich-b1-investor-execute.sql) accepts only `source_system='iapd'` and `source_dataset='iapd_state_compilation'`; it inserts `subject_kind='firm'` with `person_id=NULL`. It does not read the IAPD individual, branch, or notice-filing feeds, and does not write `people`, `branches`, or notice-filing registrations. Its only persistent inserts are `source_releases`, new `firms`, their `firm_identifiers`, and `jurisdiction_registrations`. It has no `UPDATE` or `DELETE` of existing canonical firms. It does not write `search_documents` or principal-office overlays; the 4,595 existing firm search documents observed in those address regions remain untouched.

The disposable [GitHub Actions test](https://github.com/savitz25/investor-trust-hub/actions/runs/36753278471) runs on PostgreSQL 16. It applies the exact branch migration and load to a test schema with 451 seeded existing CRDs and one unrelated FL registration, repeats the load, tests the CRD and registration uniqueness constraints, and runs the bounded rollback. It then seeds certified candidate CRD 8250 as an already-owned firm, repeats the load and rollback, and checks that this firm and the unrelated registration survive. Finally it restores the original six-value constraint and migration ledger. The test schema was reconstructed from the inspected live table definition on top of repository migrations; it is not a copy of production data. [Migration](../database/migrations/0016_b1_state_adviser_registration_type.sql), [data rollback](../artifacts/th-enrich-b1-investor-rollback.sql), and [constraint rollback](../database/rollback/0016_b1_state_adviser_registration_type.sql) are versioned in PR #66.

## Exact Founder-gated execution packet

Run from this repository root with a separately authorized production `DATABASE_URL`. The first command is read only and verifies the current live ownership and LF-normalized staged-file hashes. It allows only deterministic ownership drift where a previously absent certified candidate CRD now belongs to exactly one non-synthetic canonical firm. Execute the later commands only after Founder approval:

```sh
python artifacts/th-enrich-b1-final-preflight.py
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0016_b1_state_adviser_registration_type.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f artifacts/th-enrich-b1-investor-execute.sql
```

The stage CSV SHA-256 after LF normalization is `a558a5a08afec69008623772d7a2db0a977a0eef98b30ba0ed8a24996b5da48a`; the certified absent-CRD candidate CSV is `2b8c728e0b50c009e31c2a6a57887695090b948d5c4839bf78c8e12168bf6698`. The execution script checks exact cardinalities, source/dataset/status/grain, live CRD ownership, absent slugs, migration presence and allowed type, lack of existing target registrations, and a 6,602-row post-load recount. It creates only candidate firms still absent at execution time, records that exact created subset on the batch registrations, and treats an identical rerun as a verified no-op. Its data transaction is serializable and aborts as a unit if any check fails.

The exact production preflight SQL is the parameterized, read-only SQL in [the audit script](../artifacts/th-enrich-b1-final-preflight.py). It binds the complete 5,942-CRD set from the checksummed approved CSV, inspects `pg_constraint`, `pg_indexes`, `information_schema.columns`, `schema_migrations`, the source registry, exact CRD ownership, registration keys, and principal-office search document counts. It sets `default_transaction_read_only=on` and rolls back. The exact migration and load SQL are the versioned files named above; the data command uses `psql` client-side `\copy` to stage the two pinned CSV files in temporary tables.

After authorized execution, run the same audit script again and query the batch itself:

```sql
SELECT count(*) AS registrations, count(DISTINCT firm_id) AS registered_firms,
       count(*) FILTER (WHERE raw->>'b1_created_firm'='true') AS registrations_on_created_firms,
       count(DISTINCT firm_id) FILTER (WHERE raw->>'b1_created_firm'='true') AS created_firms,
       count(*) FILTER (WHERE publication_allowed) AS published_rows
FROM jurisdiction_registrations
WHERE source_release_id=(SELECT id FROM source_releases
  WHERE source_dataset_id='iapd_state_compilation'
    AND release_label='IA_FIRM_STATE_Feed_09_30_2026');

SELECT notes, checksum_sha256 FROM source_releases
WHERE source_dataset_id='iapd_state_compilation'
  AND release_label='IA_FIRM_STATE_Feed_09_30_2026';
```

Expected: 6,602 registrations, 5,942 registered firms, zero published rows. Created firms and their registration rows must equal the two counts in release `notes`; at the 17:36 UTC live baseline those are 5,491 and 5,993. The other 609 registrations attach to existing firms. A change in exact ownership before execution changes the created counts, not the 6,602 source registrations.

## Exact rollback packet

If rollback is required, run these commands in order from the same approved revision:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f artifacts/th-enrich-b1-investor-rollback.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/rollback/0016_b1_state_adviser_registration_type.sql
```

The data rollback requires the exact source-release checksum and 6,602-row count, verifies the batch-created firm IDs and source names against release metadata, and refuses to delete any firm that acquired another identifier, registration, search document, foreign-key dependent record, or other later enrichment. It removes the 6,602 B1 registrations and only the firms marked as created by this batch, their CRD identifiers, and the B1 source release. The second script refuses to restore the old constraint while any `STATE_REGISTERED_IA` row remains, then removes the 0016 schema-ledger entry. A guard failure requires manual review; it does not cascade-delete unrelated records.

## Evidence Activation handoff after Founder-authorized load

Batch: `TH-ENRICH-B1`; dataset: `iapd_state_compilation`; release: `IA_FIRM_STATE_Feed_09_30_2026`; source file: `IA_FIRM_STATE_Feed_09_30_2026.xml.gz`; source SHA-256: `23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c`. Provide Evidence Activation the executed commit SHA, preflight JSON, source-release ID and notes, post-load query output above, and any ownership drift from 451/5,491. All new registrations are `STATE_REGISTERED_IA`, `APPROVED`, `subject_kind='firm'`, `person_id=NULL`, `publication_allowed=false`; no publication denominator changes until Evidence Activation separately approves activation. Florida OFR and principal-office overlays are excluded.

No production command above has been executed in this preflight.
