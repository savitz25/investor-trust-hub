# Source registry

Official sources are configuration and documentation in Task 001. They are not ingested yet.

Implementation: `packages/config/src/sources.ts`, `database/seed/0001_source_registry.sql`, `services/ingestion/src/ith_ingestion/registry.py`.

## SEC / IARD / IAPD

**Purpose.** Registered investment adviser and exempt reporting adviser information; investment adviser representatives; Form ADV.

**Entities.** Firm, person, registration, filing, disclosure.

**Notes.** ADV amendments replace the current snapshot but must not erase prior filings.

## FINRA BrokerCheck

**Purpose.** Broker-dealer and registered-person research.

**Entities.** Person, firm, branch, registration, disclosure.

**Constraint.** BrokerCheck information may have permitted-use, attribution, freshness, correction, and marketing restrictions.

**Never** architect BrokerCheck-derived information as a sales-prospecting database. Research/public evidence and a future Business Console must remain logically separable. `prospecting_prohibited = true` on this system.

## SEC EDGAR

**Purpose.** Issuer/company filings and future filing intelligence.

**Entities.** Issuer, product, filing.

**Notes.** Amendments are new accessions. Keep accession-level provenance.

## SEC investment company data

**Purpose.** N-CEN, N-PORT, series/class, registered funds, ETFs.

**Entities.** Product, issuer, filing, identifiers (series/class/CUSIP/ISIN).

**Notes.** Do not invent ticker or CUSIP links.

## NFA / CFTC

**Purpose.** Commodity and futures professional and firm research (BASIC, CFTC public records).

**Entities.** Person, firm, registration, disclosure.

## State securities regulators

**Purpose.** Notice filings, IAR state registrations, enforcement.

**Entities.** Person, firm, registration, disclosure.

## Synthetic development source

Not an authority. Used only for labeled fixtures. Must never be presented as official.
