# SEC Form ADV / IARD field mapping (Task 002)

Official catalog:

https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers

The monthly zips contain one CSV each (Windows-1252). Column names are taken from the current official files, not from memory. Header snapshots live in:

- `services/ingestion/src/ith_ingestion/sec_adv/ria_headers.json` (448 columns)
- `services/ingestion/src/ith_ingestion/sec_adv/era_headers.json` (171 columns)

If a **required** header disappears, ingest fails. Extra columns are allowed. Unmapped columns remain in `source_snapshots.payload`.

The SEC states that neither the SEC nor state authorities have approved the information filed on Form ADV, and they cannot guarantee its accuracy. InvestorTrustHub reports the dataset; it does not convert filer language such as `Approved` into endorsement.

## Normalized fields

| Official source field | Source meaning | Normalized destination | Transformation | Nullable? | Consumer-facing use |
| --- | --- | --- | --- | --- | --- |
| Organization CRD# | IARD organization CRD | `firm_identifiers` (`crd`) | Trim whitespace; digits only; reject non-numeric | No (quarantine) | Identity; future Trust Report |
| SEC# | SEC file number (`801-` RIA, `802-` ERA) | `firm_identifiers` (`sec_file_number`) | Trim/upper; validate pattern; skip if malformed | Yes | Identity |
| Firm Type | `Registered` or `ERA` | `firms.firm_kinds` + `registrations.registration_type` | RIA file → `registered_investment_adviser`; ERA file → `exempt_reporting_adviser` | No | Classification. ERA is never labeled SEC-registered. |
| Primary Business Name | Item 1 business name | `firms.display_name` | Trim; fall back to Legal Name | If both empty, quarantine | Display |
| Legal Name | Item 1 legal name | `firms.legal_name` | Trim; fall back to Primary Business Name | If both empty, quarantine | Display / identity |
| SEC Current Status | IARD status text (`Approved`, `120-Day Approval`, `ERA - Active`) | `registrations.source_status_text` + normalized `registrations.status` | Preserve exact text. Map `120-Day Approval` → `pending`; RIA otherwise → `registered`; ERA → `reporting`. Never display “SEC approved”. | Yes | Evidence, not endorsement |
| SEC Status Effective Date | Status effective date | `registrations.commenced_on`, `form_adv_firm_facts.sec_status_effective_date` | Parse `MM/DD/YYYY` | Yes | Freshness |
| Latest ADV Filing Date | Most recent ADV in this extract | `form_adv_firm_facts.latest_adv_filing_date` | Parse `MM/DD/YYYY` | Yes | Freshness |
| Form Version | ADV version label | `form_adv_firm_facts.form_version` | Trim | Yes | Methodology |
| Main Office Street Address 1/2 | Principal office street | `branches` (`source_location_key = sec-adv-main-office`) | Trim; raw also in snapshot | Yes | Location |
| Main Office City / State / Postal Code / Country | Principal office | `branches.city/region/postal_code/country` | Country name `United States` → `US`; other names → `ZZ` (CHAR(2) limit) | Yes | Search prep; not SEO pages |
| Website Address | Item 1I website | `form_adv_firm_facts.website` | Trim | Yes | Future report |
| 3A | Form of organization | `form_adv_firm_facts.organization_form` | As reported | Yes | Future report |
| 3B | Fiscal year end month | `form_adv_firm_facts.fiscal_year_end` | As reported | Yes | Future report |
| 5F(1) | Whether the filer reports RAUM (RIA only) | facts JSON | As reported | Yes | Not interpreted |
| 5F(2)(a)/(b)/(c) | Discretionary / non-discretionary / total RAUM (RIA only) | `form_adv_firm_facts.raum_*` | Strip `$` and commas; store exact decimal + `USD` + source field `5F(2)(c)` | Yes | Evidence only. Not a quality or popularity signal. |
| 11 | Disclosure Information indicator | `form_adv_firm_facts.disclosure_indicator` | As reported (`Y`/`N`) | Yes | Indicator only. Not an accusation. |
| CIK# | EDGAR CIK if present | facts JSON | Trim; not invented | Yes | Deferred identifier link |

Mailing addresses, books-and-records locations, notice-filing jurisdictions, and Item 5–12 checkboxes that are not listed above are preserved only in the raw snapshot.

## Intentionally not normalized in Task 002

AUM display as `$1.3B`, performance, “clean record,” termination from absence, BrokerCheck fields, individual professionals, and every Item 5/6/7/8/9/10/11 checkbox interpretation.
