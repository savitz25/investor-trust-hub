# INV-NAT-001 firm metric dictionary

No Trust Score. Metrics are Form ADV reported values with source, field, and as-of date.

Release used for definitions: SEC IARD FOIA firm roster `2026-08-03` (`Latest ADV Filing Date` per row when present).

| Metric | Source | Field | Definition | Limitations | Safe public display |
| --- | --- | --- | --- | --- | --- |
| regulatory_aum | IARD RIA FOIA | `5F(2)(c)` | Total regulatory AUM as reported | RIA only. Filer-supplied. Not performance. | Yes, with exact amount + as-of + not-quality copy |
| discretionary_aum | IARD RIA FOIA | `5F(2)(a)` | Discretionary RAUM | RIA only | Yes, as reported |
| non_discretionary_aum | IARD RIA FOIA | `5F(2)(b)` | Non-discretionary RAUM | RIA only | Yes, as reported |
| client_count | IARD RIA FOIA | `5C(1)` | Approximate clients, most recent fiscal year | Many rows are `0`. Not a quality signal. ERA does not file Item 5. | Yes, only if field present; never “no clients” from blank |
| employee_count | IARD RIA FOIA | `5A` | Employees | Headcount, not quality | Yes |
| advisory_personnel_count | IARD RIA FOIA | `5B(1)` | Employees who perform advisory functions | Not IARs researched | Yes |
| private_fund_count | IARD FOIA | `Count of Private Funds - 7B(1)` | Count of private funds reported in Item 7.B | **Not** named Schedule D funds. All 6,604 ERAs report 7.B = Y | Yes as a count with Item 7.B as-of |
| affiliation_count | IARD FOIA | `Count of IA Affiliates` + `Count of BD Affiliates` + 7.A Y flags | Counts/types of related financial businesses | Types only. No named affiliates in this file | Yes as reported types, never “conflict” |
| control_person_count | IARD FOIA | `10A` + public-company count | Whether the adviser has control persons that are public reporting companies | Not a full Schedule A owner list | Yes as Y/N + count; not named persons |
| reported_compensation_methods | IARD RIA FOIA | `5E(1)`–`5E(7)` | Methods the filer checked | Do **not** infer fee-only | Yes as a list of source labels |
| custody_reported | IARD RIA FOIA | `9A(1)(a)/(b)`, `9B(1)(a)/(b)`, `Total Custody Amount` | Whether the adviser or a related person has custody of cash/securities | Not a risk score. ERA does not file Item 9 | Yes: “Firm reports custody: Yes/No as of [date]” |
| disclosure_categories | IARD FOIA | `11` + `11A`–`11H` | Checkbox + category counts | Checkbox is not a DRP event. Not found ≠ clean | Yes as “Item 11 reported Y/N” + category names; no misconduct labels |
