# INV-NAT-002A metric dictionary

No Trust Score. No fee-only inference. No misconduct inference. Counts below are **source rows / candidates from the dry-run**, not published entities.

Release for named A/B/D: IARD relational Part 1 2011-11-05–2024-12-31 plus IAPD monthly filings 2025-01–2026-07. Current roster clock: 2026-08-03 FOIA.

| Metric | Source | Field | Definition | Limitations | Safe public display |
| --- | --- | --- | --- | --- | --- |
| filing_id | Part 1 Base | `FilingID` | Official IARD filing key | Not an EDGAR accession | Internal / citation only |
| firm_crd | Part 1 Base | `1E1` | Firm CRD | `1D` is SEC file number, not CRD | Yes, as CRD |
| sec_file_number | Part 1 Base | `1D` | `801-` RIA / `802-` ERA | Display secondary | Yes, labeled SEC file number |
| direct_owners | Schedule A/B `Schedule=A` | `Full Legal Name`, `DE/FE/I`, `OwnerID`, `Control Person`, `Ownership Code` | Named direct owners as filed | Name-only = REVIEW_REQUIRED. OwnerID ≠ person CRD | Only CONFIRMED/HIGH_CONFIDENCE after 002B resolve; never “control means conflict” |
| indirect_owners | `Schedule=B` | same | Named indirect owners | Same identity limits | Same |
| related_persons | Schedule D 7.A | `Legal Name`, `CRD Number`, `SEC Number or Other` | Named related persons | CRD present = CONFIRMED. Not a conflict score | Named + CRD as reported |
| named_private_funds | Schedule D 7.B.(1) | `Fund Name`, `Fund ID` | Named funds | Item 7.B Y/count is **not** this metric. 81 named rows lack Fund ID | Fund name + 805- ID as reported |
| fund_custodian | 7.B.(1) A.25 | `Legal Name of Custodian` | Named custodian | Almost no CRD in this table | Name as reported, REVIEW_REQUIRED without CRD/LEI |
| fund_auditor | 7.B.(1) A.23 | `Name of Auditing Firm` | Named auditor | Name-only | Name as reported |
| fund_administrator | 7.B.(1) A.26 | `Name of Administrator` | Named administrator | Name-only | Name as reported |
| fund_prime_broker | 7.B.(1) A.24 | `Name of Prime Broker`, `CRD Number` | Named prime broker | CRD often present | Name + CRD |
| fund_marketer | 7.B.(1) A.28 | `Name of Marketer`, `CRD Number` | Named marketer / placement agent | Not inferred from 7.A | Name + CRD when present |
| other_offices | Schedule D 1.F | street / city / `Branch Number` | Other offices | Key = address + branch number | Address as reported; not a quality signal |
| relying_advisers | Schedule R | `Relying Advisor CRD Number` | Named relying advisers | 100% CRD in historical SCH_R | CRD + name; public firm only if on roster |
| adv_w_status | ADV-W | `Filing Type` FULL/PARTIAL | Withdrawal evidence | Not discipline. Partial ≠ gone | “ADV-W filed FULL/PARTIAL on date” |
| part2a_document | IAPD brochure archives / `brochureVersionID` | mapping id | Brochure exists | PDFs not ingested in 002A | “Brochure on file as of…” without quoting narrative |
| form_crs_document | CRS mapping | `CRS_ID`, `FIRM_CRD_NB` | CRS mapped to CRD | Monthly files are incremental. Union 2025-01–2026-07: 15,924 IDs / 8,870 CRDs | “Form CRS on file” + date |

## Dry-run magnitudes (historical 2011–2024 unless noted)

- Schedule A/B rows: 3,617,137 (people 2,713,556 / organizations 903,581; A 2,702,116 / B 915,021)
- Named 7.B.(1) fund rows: 2,014,361; distinct Fund IDs: 174,826
- Related persons: 2,372,009 IA + 281,600 ERA
- Other offices: 1,379,778 IA + 20,605 ERA
- Relying advisers: 85,337 rows / 5,447 CRDs (historical)
- ADV-W: 21,076 filings through 2024 + 1,516 IAPD 2025–2026 rows
- 2025–2026 monthly incremental A/B rows: 576,904; named fund rows: 544,011
