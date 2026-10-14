# EA-INV-IAPD-OR-AZ-WA productization prep

This packet is a dry-run. It does not ingest production, create firms, or change publication policy.

## Acquired inputs

Pass the directory that already contains both gzip files. The script has no default path, does not search the machine, and does not download.

```text
python scripts/iapd_state_ia_productize.py --check --compilation PATH
python scripts/iapd_state_ia_productize.py --dry-run --compilation PATH
```

`PATH` must already hold `IA_FIRM_STATE_Feed_09_10_2026.xml.gz` and `IA_FIRM_SEC_Feed_09_10_2026.xml.gz`. That pair is the compilation named by `data/oregon/or-inv-001/iapd-or-census.json`. Do not download a newer compilation for this ticket.

Committed Oregon census approved distinct CRDs: 335. Evidence Activation's reference of 337 is not forced.

Arizona and Washington have no committed IAPD census JSON. Their current public snapshots still say the state-IA roster was not acquired. The dry-run reads those jurisdictions from the same already-acquired compilation and reports the counts it finds.

## Destination

`state_registration_observations` already exists and defaults to `public_eligibility = internal_only`.

Join key is exact firm CRD against `firm_identifiers.identifier_type = 'crd'`. This dry-run does not query that table. Unmatched CRDs stay `firm_id` null. No name join. No new firm.

Classes stay separate: `state_ia`, `state_era`, `notice_filing`.

## Commands

`--compilation` is required. `--apply` exits 2. A second dry-run on the same files must report `idempotent_second_run: true`.

## Source dataset foreign keys

`state_registration_observations.source_dataset_id` references `source_datasets(id)`. The nine proposed ids are not in `database/seed` or `database/migrations`. The unapplied seed is `database/proposals/UNAPPLIED_iapd_state_jurisdiction_datasets.sql`. It reuses the existing `iapd` source system. It does not reuse `sec_ia_ria`, `sec_ia_era`, or `sec_ia_iapd_compilation`.

## Later firm-CRD extract

Do not run this against production until that read is separately authorized. On a non-production database that already has the firm spine:

```sql
SELECT firm_id, identifier_type, identifier_value
FROM firm_identifiers
WHERE identifier_type = 'crd';
```

Load `identifier_value` as the CRD set. Do not select `legal_name`.

- Exact match: the CRD appears once. `UNIQUE (identifier_type, identifier_value)` makes that the normal case. Set `match_status = EXACT_CRD` and keep `firm_id` from that one row.
- Unmatched: the CRD is absent. Leave `firm_id` null. Do not insert a firm.
- Collision: `GROUP BY identifier_value HAVING count(*) > 1`. Those CRDs are `REVIEW_REQUIRED` and are not joined. A legal-name disagreement inside the IAPD feed is a separate collision and also is not joined by name.

## Rollback

Nothing is written to a database. Delete `artifacts/ea-inv-iapd-or-az-wa/dry-run-receipt.json` to discard the receipt. If a later approved apply uses `observation_fingerprint`, delete rows for source dataset ids `iapd_*_or_2026_09_10`, `iapd_*_az_2026_09_10`, and `iapd_*_wa_2026_09_10` only.
