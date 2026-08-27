# INV-NAT-002A official source inventory

Acquired 2026-08-27. Production was not written. Wave 1 indexable remains 1,000.

## What each source is

| Source | Official location | What it contains | What it is not |
| --- | --- | --- | --- |
| Historical Part 1 relational CSVs | [SEC Form ADV Data](https://www.sec.gov/foia/docs/form-adv-archive-data.htm) through 2024-12-31 | Multi-table filings: Base, Schedule A/B, Schedule D repeating rows, DRPs, Schedule R | Not current 2025+ named A/B/D. Not the flattened monthly IARD roster |
| IAPD 2025+ Part 1 monthly zips | [IAPD Form ADV Data](https://adviserinfo.sec.gov/adv) via `reports.adviserinfo.sec.gov/reports/foia/reports_metadata.json` | Same relational tables as the historical dump, **incremental filings in that month** | Not a full current roster. July 2026 has 2,878 IA + 294 ERA filings, not 23,622 firms |
| Current IARD FOIA roster | [SEC IA FOIA catalog](https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers) `ia08032026` | Flattened Items 1–11 for currently listed RIA/ERA | **No named Schedule A/B/D.** Item 7.B is a count/checkbox |
| IAPD compilation XML | [IAPD compilation](https://adviserinfo.sec.gov/compilation) `IA_FIRM_SEC_Feed_08_27_2026.xml.gz` | Current SEC IA/ERA snapshot, Items 1–11 subset, 23,780 `Firm` records as of 2026-08-27 | **No named owners, funds, offices, or related persons.** Item7B is a flag |
| ADV-W | SEC archive through 2024-12-31 + IAPD monthly 2025-01–2026-07 | Official withdrawal filings (`FULL` / `PARTIAL`) | Not misconduct. Page labels some 2024 monthly zips “Part 3 Updates”; unzipped contents are ADV-W tables |
| Part 2A brochures | IAPD FOIA `advBrochures` 2025–2026 (21 monthly/split zips) + SEC 2024 PDF archives | Brochure PDFs. IAPD firm DTO exposes `brochureVersionID` | Narrative text is not a metric. Bulk PDFs were cataloged, not ingested |
| Form CRS | IAPD `advFirmCRS` mapping zips (19 months) + `advFirmCRSDocs` PDF zips | Mapping: `FIRM_CRD_NB`, `CRS_ID`, `CRS_FILE`, `FLNG_ID` | Monthly mapping is incremental. Union of 2025-01–2026-07 maps 8,870 CRDs / 15,924 CRS IDs |

## Verified 2025+ availability

SEC.gov states Form ADV data from 2025-01-01 forward lives on IAPD. Confirmed:

- Manifest: `https://reports.adviserinfo.sec.gov/reports/foia/reports_metadata.json`
- Part 1 monthly files `ADV_Filing_Data_YYYYMMDD_YYYYMMDD.zip` for 2025-01 through 2026-07 (19 files)
- No `adv-filing-data-2025.zip` on sec.gov (404)
- Compilation download: `https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_08_27_2026.xml.gz`

IAR / state compilation feeds were **not** acquired. Professionals are out of scope.

## Representative complete historical Part 1 package

Preferred relational package (acquired and SHA-256 fingerprinted):

- `https://www.sec.gov/files/adv-filing-data-20111105-20241231-part1.zip`
- `https://www.sec.gov/files/adv-filing-data-20111105-20241231-part2.zip`

Legacy 2000-10-19–2011-11-04 zip acquired for inventory; it has Schedule A/B and 7.A but not the later 7.B.(1) named-fund / service-provider tables.

## Schedule table map (2011–2024 and 2025+ monthlies)

| Consumer question | Official table | Join |
| --- | --- | --- |
| Filing identity | `ADV_Filing_Types_*`, `IA_ADV_Base_A_*` / `ERA_ADV_Base_*` | `FilingID` |
| Firm CRD / SEC file / legal name | Base `1E1` / `1D` / `1A` | `FilingID` |
| Direct owners | `*_Schedule_A_B_*` where `Schedule=A` | `FilingID` |
| Indirect owners | `*_Schedule_A_B_*` where `Schedule=B` | `FilingID` |
| Related persons | `*_Schedule_D_7A_*` | `FilingID` + `ReferenceID` |
| Named private funds | `*_Schedule_D_7B1_*` | `FilingID` + `ReferenceID` + `Fund ID` |
| Fund GP / manager names | `*_Schedule_D_7B1A3a_*` | `FilingID` + `ReferenceID` |
| Auditors | `*_Schedule_D_7B1A23_*` | `FilingID` + `ReferenceID` |
| Prime brokers | `*_Schedule_D_7B1A24_*` | `FilingID` + `ReferenceID` |
| Custodians | `*_Schedule_D_7B1A25_*` | `FilingID` + `ReferenceID` |
| Administrators | `*_Schedule_D_7B1A26_*` | `FilingID` + `ReferenceID` |
| Marketers | `*_Schedule_D_7B1A28_*` (`Name of Marketer`) | `FilingID` + `ReferenceID` + `SubreferenceID` |
| Other offices | `*_Schedule_D_1F_*` | `FilingID` |
| Relying advisers | `IA_Firm_Download_SCH_R_*` | `Filing ID` / `Reference ID` |
| DRPs | `*_DRP_*` | **Do not mint `disclosure_events` from Item 11 or DRP tables in 002A** |

Fingerprints: `data/reports/inv-nat-002-source-manifest.json` (gitignored raw payload under `data/raw/sec/form-adv/`).
