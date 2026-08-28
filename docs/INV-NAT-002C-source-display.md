# INV-NAT-002C source display

Every published 002C module cites Form ADV / IAPD context.

## Profile-level

Sources & methodology:

> Information shown is based on adviser-reported Form ADV filings and related SEC/IAPD records.

> InvestorTrustHub organizes the filing. It does not independently verify every adviser-reported fact.

Existing Trust Report already shows SEC/IARD release label and retrieval timestamp.

## Relationship rows

Minimum:

- “Reported in Form ADV”
- filing date when `date_submitted` is present
- RIA vs ERA filing family when known
- official identifier when that identifier is the publication key (Fund ID, related CRD, branch number)

## Historical rows

Filing history and ADV-W include filing/source date and are labeled historical. They are not merged into current ownership, funds, or related-organization lists.

## Snapshot

`investor-trust-report-v2` stores `sources.lead` and `sources.notIndependentVerification` with current vs historical structures.
