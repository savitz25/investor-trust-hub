# WA-INV-001 — Washington investment-adviser & securities intelligence

Public route: `/washington`

Contract: `investor-wa-state-intel-v1`

Snapshot: `packages/domain/src/wa-public-snapshot.ts`

## Overlay (not a state roster)

- SEC/IARD firms with principal-office region WA: **306** as of IA_FIRM_SEC_Feed_08_27_2026
- National RIA facts: 17,018
- National ERA facts: 6,604
- Washington state-RIA bulk roster: **SOURCE_NOT_ACQUIRED** (count UNKNOWN)

WA principal office ≠ Washington state registration. SEC RIA ≠ state RIA. ERA ≠ registered RIA.

DFI 2024 year-end aggregate of 645 investment advisers is not a live roster.

## Rules

No Washington county routes. No DFI/BrokerCheck/IARD scraping. No Trust Score. Missing ≠ zero.
