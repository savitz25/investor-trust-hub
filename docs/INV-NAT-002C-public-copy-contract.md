# INV-NAT-002C public copy contract

Applies to Wave-1 Firm Trust Report profile intelligence only.

## Required frames

Use these labels when the corresponding evidence is published:

| Evidence | Copy |
| --- | --- |
| Generic sourcing | Reported in Form ADV |
| Filing | SEC Form ADV filing |
| Schedule A owner | Reported direct owner |
| Schedule B owner | Reported indirect owner |
| Control/title row | Reported executive/control relationship |
| Schedule D 7.A CRD-linked | Related organization reported by the adviser |
| Named 805- fund | Private fund reported by the adviser |
| Item 7.B count | Item 7.B private-fund count as reported (not a named-fund list) |
| ADV-W | Form ADV-W withdrawal filing |
| CRS | Form CRS |

Ownership percentages use the SEC Schedule A/B band (A–F) when present. Do not infer a precise percent.

## Forbidden frames

Do not use in published 002C modules:

- verified owner / verified assets
- parent company / controlling owner / ultimate owner
- fee-only
- clean record / no disciplinary history
- misconduct / disciplinary withdrawal / forced closure
- approved provider / trusted provider / preferred provider
- conflict of interest
- SEC approved
- Trust Score / ranking

## Item 11

- Y → “Firm reported one or more Item 11 disclosure indicators in this source record.”
- N → “Firm reported No for Item 11 in this filing.”
- Missing → not a clean-record finding.

## Custody and compensation

- Custody is reported as filed. It is not a risk score.
- Compensation methods are the boxes checked on Form ADV. Not a fee-only determination.

## Current vs historical

Current reported relationships and filing/historical evidence are separate headings. Historical rows include a filing/source date. A historical ADV-W does not mark a current roster firm inactive.

Implemented in `packages/domain/src/adv-profile-intelligence.ts` (`ADV_PUBLIC_COPY`, `findForbiddenAdvPublicCopy`).
