# EA-INV-IAPD-OR-AZ-WA productization prep

This packet is a dry-run. It does not ingest production, create firms, or change publication policy.

## Acquired inputs

The only local compilation already on disk is `iapd-compilation-2026-09-10` under the Oregon worktree `data/raw/sec/form-adv`. It is the same feed named by `data/oregon/or-inv-001/iapd-or-census.json`. Do not download a newer compilation for this ticket.

Committed Oregon census approved distinct CRDs: 335. Evidence Activation's reference of 337 is not forced.

Arizona and Washington have no committed IAPD census JSON. Their current public snapshots still say the state-IA roster was not acquired. The dry-run reads those jurisdictions from the same already-acquired compilation and reports the counts it finds.

## Destination

`state_registration_observations` already exists and defaults to `public_eligibility = internal_only`.

Join key is exact firm CRD against `firm_identifiers.identifier_type = 'crd'`. This dry-run does not query that table. Unmatched CRDs stay `firm_id` null. No name join. No new firm.

Classes stay separate: `state_ia`, `state_era`, `notice_filing`.

## Commands

```text
python scripts/iapd_state_ia_productize.py --check
python scripts/iapd_state_ia_productize.py --dry-run
```

`--apply` exits 2. A second dry-run on the same file must report `idempotent_second_run: true`.

## Rollback

Nothing is written to a database. Delete `artifacts/ea-inv-iapd-or-az-wa/dry-run-receipt.json` to discard the receipt. If a later approved apply uses `observation_fingerprint`, delete rows for source dataset ids `iapd_*_or_2026_09_10`, `iapd_*_az_2026_09_10`, and `iapd_*_wa_2026_09_10` only.
