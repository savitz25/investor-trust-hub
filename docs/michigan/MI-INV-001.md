# MI-INV-001 — Michigan securities intelligence

Starting `origin/main`: `693eb80e0083f4cf3ad20069d20f0ccca1435ae2`.

## Authority and registration

Michigan LARA's Corporations, Securities & Commercial Licensing Bureau (CSCL), Securities & Audit Division regulates state investment advisers, broker-dealers, agents and representatives. State IA firms apply through IARD. [CSCL's active-license list](https://www.michigan.gov/lara/bureau-list/cscl/licensing/critical-links/cscl-license-list-and-data) requires a submitted form and email delivery; a public CSCL bulk roster is **NOT_ACQUIRED**. MiCLEAR/IAPD/BrokerCheck verification is known. The separate IAPD compilations below are not a new national firm population.

`scripts/michigan/acquire_mi_inv_001.py` reuses the existing IAPD parser on the accepted 2026-09-17 STATE and SEC compilation files. Source SHA-256: STATE `5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02`; SEC `f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22`. The script takes `MI_INV_ACCEPTED_IAPD_DIR` for the directory containing those files. Only aggregate counts and firm-CRD sets are committed—no filer address, email, phone or other contact details.

| Source lens (2026-09-17) | Exact filter | Firm CRDs |
| --- | --- | ---: |
| State IA, APPROVED | `StateRgstn/Rgltr/@Cd=MI` plus `@St=APPROVED` | 574 |
| State IA, all statuses | Same jurisdiction; 574 APPROVED, 9 TERMREQUEST | 583 |
| Active ERA reporting | `ERA/Rgltr/@Cd=MI`, `ACTIVE` | 75 |
| Federal-covered notice, FILED | `NoticeFiled/States/@RgltrCd=MI`, `FILED` | 2,453 |
| Principal office | SEC compilation `MainAddr/@State=MI` | 332 |

Exact CRD intersections: APPROVED state IA ∩ FILED notice = 5; state IA ∩ active ERA = 0; active ERA ∩ notice = 0; principal office ∩ notice = 303. They are diagnostic intersections, not ingredients for a deduplicated “Michigan advisers” count. Form ADV is a filing, not a separate firm. ERA is not RIA. Status words are source text, not endorsement. Current status requires live verification.

## Enforcement

The [CSCL Published Enforcement Orders](https://www.michigan.gov/lara/bureau-list/cscl/complaints/disciplinary/securities) public SXA index reported 440 mixed-index rows at retrieval. The bounded extract selects 107 Michigan Uniform Securities Act-tagged document entries under `SecuritiesOrders/2022..2026`; all 107 public PDFs were checked. Index path year is retained separately and is **not** presumed to be the signed date. The index can include a document whose action predates its path year. This is not a complete disciplinary census or unique-matter count; [Disciplinary Action Reports](https://www.michigan.gov/lara/bureau-list/cscl/complaints/disciplinary/licensing-disciplinary-action-report) and MiCLEAR may contain additional or later actions.

Six PDFs print a single firm CRD in an organization respondent caption. Two of those CRDs exactly overlap an accepted IAPD Michigan-lens firm CRD. These are read-only exact crosswalks, **not profile evidence attachments**. Other printed CRDs can be persons, third parties or firms outside this IAPD lens and are held. No exact SEC file number was found in the inspected captions; no SEC link was created. Exact enforcement attachments 0; name-only attachments 0; new canonical firms 0; graph writes 0; claim changes 0.

## Examination and complaints

CSCL publishes an [Investment Adviser Examination Program guide](https://www.michigan.gov/lara/bureau-list/cscl/securities/spotlight/mi-guide-investment-adviser-examination-program). Examination capability is **KNOWN**; provider-level exam outcomes are **NOT_ACQUIRED**. [MiCLEAR securities complaint intake](https://www.michigan.gov/lara/bureau-list/cscl/complaints/file-a-complaint-miclear) is **KNOWN**; provider-level complaint cases and outcomes are **NOT_ACQUIRED**. Missing evidence is not a clean record.

## Source clocks and limits

IAPD STATE and SEC source dates: 2026-09-17, accepted retrieval recorded as 2026-09-17T15:15:00Z; accepted file hashes were rechecked for this extract. CSCL index retrieval is in `data/michigan/mi-inv-001/securities-orders.json`; generatedAt is in the lens JSON. There is no universal Michigan investor as-of clock. No city routes, ratings, paid ranking or investment advice were added.
