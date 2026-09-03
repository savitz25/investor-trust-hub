# CA-INV-001 — California investment-adviser & securities intelligence

Public route: `/california`

Contract: `investor-ca-state-intel-v1`

Snapshot: `packages/domain/src/ca-public-snapshot.ts`

## Overlay (not a state roster)

- SEC/IARD firms with principal-office region CA: **2,699** as of IA_FIRM_SEC_Feed_08_27_2026
- National RIA facts: 17,018
- National ERA facts: 6,604
- California state-RIA bulk roster: **SOURCE_NOT_ACQUIRED** (count UNKNOWN)

CA principal office ≠ California state registration. SEC RIA ≠ state RIA. ERA ≠ registered RIA.

## Rules

No California county routes. No DFPI/BrokerCheck/IARD scraping. No Trust Score. Missing ≠ zero.
