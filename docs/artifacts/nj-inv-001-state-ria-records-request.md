# NJ-INV-001 records request — NJ state-registered investment adviser roster

## Finding

No public machine-readable New Jersey state-registered investment adviser roster was
located on the Bureau of Securities site. Official HTML indexes are currently
Incapsula-gated (`SOURCE_ACCESS_BLOCKED`).

IAPD / CRD remains the national identity system. It is not a deterministic bulk extract of
*New Jersey state-only* registrants.

## Authoritative request path

**NJBOS Form 2 — CRD / IARD information request**

- Bureau home: https://www.njconsumeraffairs.gov/bos/
- Industry forms: https://www.njconsumeraffairs.gov/bos/Pages/industryforms.aspx
- Regulator: New Jersey Bureau of Securities, P.O. Box 47029, Newark, NJ 07101
- Telephone listed on orders: (973) 504-3600

Ask for a current extract of New Jersey **state-registered** investment advisers (not
SEC-registered notice filers), including:

- legal name
- CRD / IARD number
- SEC file number if any
- registration status and effective dates
- main office address
- state-to-SEC or SEC-to-state transition flags if maintained

## How InvestorTrustHub will use it

- Exact CRD match onto existing `firms` / `firm_identifiers`
- State-registered vs SEC-registered as a **registration status overlay**, not a second firm
- Internal-only until a later publication gate (NJ-INV-002+)
- Name-only rows remain unresolved

Coverage state for this source family: `SOURCE_AVAILABLE_BY_REQUEST`.
