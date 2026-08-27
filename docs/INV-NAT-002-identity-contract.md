# INV-NAT-002A identity contract

Implemented in `services/ingestion/src/ith_ingestion/sec_adv/relational_identity.py`. No fuzzy name merge. PERSON, ORGANIZATION, and FIRM stay distinct.

## Filing identity

The official IARD filing key is **`FilingID`** (numeric). Do not invent an accession number.

Version of a filing:

| Field | Source column | Role |
| --- | --- | --- |
| `filing_id` | `FilingID` | Unique per source dataset |
| `form_version` | `FormVersion` (e.g. `10/2021`) | Form revision |
| `date_submitted` | `DateSubmitted` | Observation time |
| `crd` | Base **`1E1`** | Firm CRD (CONFIRMED) |
| `sec_file_number` | Base **`1D`** (`801-` / `802-`) | Secondary firm identifier |
| `legal_name` | Base **`1A`** | Display only |
| `business_name` | Base **`1B1`** | Display only |
| `dataset_kind` | `IA_*` vs `ERA_*` vs ADV-W | RIA and ERA never collapse |

`1C-Legal` / `1C-Business` are Y/N flags, not names.

2011-11-05–2024-12-31: 471,129 IA filings (0 duplicate FilingID) + 72,618 ERA filings. Union of FilingIDs is 542,123 (1,624 FilingIDs appear in both IA and ERA extracts → REVIEW_REQUIRED, do not collapse). 2025-01–2026-07 monthlies add 91,220 distinct FilingIDs.

## Entity identity ladder

1. Official identifier (CRD, Fund ID `805-`, SEC file number, LEI, CRS_ID)
2. Firm CRD from `1E1` when joining a filing
3. Deterministic source key (`FilingID` + table + row digest, or office key)
4. Name-only → `REVIEW_REQUIRED`
5. Blank / unparseable → `UNRESOLVED`

Never: name similarity, address similarity, or “same officer title.”

## Confidence

| Code | When |
| --- | --- |
| `CONFIRMED` | Firm CRD `1E1` digits; related/relying/prime/marketer CRD; private-fund ID matching `805-` + digits; CRS row with `FIRM_CRD_NB` + `CRS_ID` |
| `HIGH_CONFIDENCE` | Schedule A/B `OwnerID` populated (IARD owner PK, **not** a person CRD); SEC number or LEI without CRD; office `Branch Number` present |
| `REVIEW_REQUIRED` | Name-only person, organization, fund, related person, custodian, auditor, administrator |
| `UNRESOLVED` | Blank name and no identifier; unknown `DE/FE/I` with no name |

`OwnerID` is not CONFIRMED as a person. 12,605 OwnerID values map to more than one normalized person name across historical Schedule A/B. Do not merge those.

## Type rules

| Source | Canonical type |
| --- | --- |
| `DE/FE/I = I` | PERSON |
| `DE/FE/I = DE` or `FE` | ORGANIZATION (not a firm unless it has its own CRD) |
| Base `1E1` / roster CRD | FIRM |
| Schedule D 7.B.(1) `Fund ID` / `Fund Name` | PRODUCT candidate (`private_fund`), not a firm |
| Schedule D 1.F | OFFICE / branch candidate of the filing firm |
| Schedule R relying CRD | FIRM candidate; public only if that CRD is independently on the official roster |

## Historical firms

CRDs in relational filings or ADV-W that are absent from the 2026-08-03 roster (23,622 firms):

- Status: `HISTORICAL_ENTITY_CANDIDATE`
- `publication_allowed = FALSE`
- No public profile, no indexable page

17,108 relational CRDs are absent from the current roster. 10,830 of those have ADV-W evidence. 6,278 do not: **absence is not withdrawal.**
