# INV-NAT-002C module readiness

Wave-1 indexable firms only (1,000). REVIEW_REQUIRED / UNRESOLVED never public.

| Module | Status | Exact blocker or limitation |
| --- | --- | --- |
| Identity | READY | Existing CRD / legal name / office |
| Registration | READY | Existing RIA/ERA classification copy |
| RAUM | READY_WITH_LIMITATIONS | RIA Item 5 only; ERA does not file; not a quality signal |
| Client/business scale | READY_WITH_LIMITATIONS | Item 5 RIA; ERA not filed; zeros are reported zeros, blanks are not “no clients” |
| Compensation | READY_WITH_LIMITATIONS | Checked 5E boxes only; never fee-only |
| Custody | READY_WITH_LIMITATIONS | Item 9 Y/N as filed; never risk |
| Item 6 activities | READY_WITH_LIMITATIONS | Yes-boxes only |
| Affiliations | READY_WITH_LIMITATIONS | Type flags only; not named conflict |
| Item 11 | READY_WITH_LIMITATIONS | Top-level Y/N only; 11A–11H / DRP INTERNAL_ONLY |
| Ownership & Control | READY_WITH_LIMITATIONS | Current HIGH_CONFIDENCE OwnerID or CONFIRMED only; name-only hidden; A≠B; executive≠owner |
| Related Organizations | READY_WITH_LIMITATIONS | Current CONFIRMED CRD-linked only |
| Private Funds | READY_WITH_LIMITATIONS | Current official 805- Fund ID + product; no public fund pages; 7.B count separate |
| Fund Service Providers | READY_WITH_LIMITATIONS | Current CONFIRMED/HIGH_CONFIDENCE only; auditors/administrators/GPs mostly hidden |
| Other Offices | READY_WITH_LIMITATIONS | Current branch-number HIGH_CONFIDENCE only |
| Relying Advisers | READY_WITH_LIMITATIONS | Current CONFIRMED CRD; link only if independently on roster |
| Filing History | READY_WITH_LIMITATIONS | Summary + 12 recent rows; not a dump of 635k filings |
| ADV-W | READY_WITH_LIMITATIONS | Historical FULL/PARTIAL; not misconduct; does not inactivate current firms |
| CRS | READY_WITH_LIMITATIONS | Mapping/metadata and official URL only; no narrative extraction |
| Part 2A | NOT_READY | 21 catalog rows, 0 mapped firms, 0 PDFs. Module omitted unless a mapped document exists |

`INTERNAL_ONLY` evidence still in the graph: name-only A/B, name-only related persons/providers, address-only offices, Item 11 category counts, Part 2A archives, historical named relationships, 17,108 historical firm candidates, 156,635 internal owner people, 197,588 internal fund products.
