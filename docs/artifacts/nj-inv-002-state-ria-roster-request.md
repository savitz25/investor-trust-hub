# NJ-INV-002 records request — NJ state-registered investment adviser FIRM roster

## Finding

No public machine-readable New Jersey **state-registered** investment adviser firm roster was
located. Official HTML industry/forms pages are Incapsula-gated. IAPD is the national public
firm lookup; it is not a deterministic bulk extract of New Jersey state-only registrants.

NJBOS Form 2 (Request for CRD or IARD Information) remains the official request path.

Do not bulk-harvest individual IARs.

## Request

Current and historical **firm-level** registration records.

### Current fields

- CRD firm number
- legal name
- DBA
- principal office address
- NJ registration status
- NJ registration effective date
- SEC/state classification
- termination/withdrawal date where applicable
- source last-updated date

### Historical period

2018-01-01 through current.

Status-change fields:

- CRD
- prior status
- new status
- effective date
- state-to-SEC transition
- SEC-to-state transition
- withdrawal
- termination

No individual IAR roster is requested.

Preferred format: CSV or XLSX.

Coverage state: `SOURCE_AVAILABLE_BY_REQUEST`.
