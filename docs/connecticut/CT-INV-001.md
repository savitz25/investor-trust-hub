# CT-INV-001 — Connecticut securities intelligence

Starting `origin/main`: `42bfb2a0a8119b3055b50b96afc6614627734470`.

## Authority and registration

The [Connecticut Department of Banking, Securities and Business Investments Division](https://portal.ct.gov/dob/securities-division-administration/securities-division/securities-and-business-investments-division) registers investment advisers, broker-dealers and their agents, examines registrants and enforces Connecticut securities law. Its [investment-adviser verification page](https://portal.ct.gov/dob/securities-licensing/licensing-general/see-if-an-investment-adviser-is-registered) offers three downloadable statewide lists. The files themselves say **Updated 10/22/2025**, even though retrieved 2026-09-28. They are dated snapshots, not live current-status assertions. `scripts/connecticut/acquire_ct_inv_001.py` records each workbook's URL, SHA-256, retrieval time, row count, status breakdown and exact CRD/SEC-file coverage, while discarding all addresses, phone numbers, websites and personal contact fields.

| Connecticut DOB workbook (2025-10-22) | CRD rows | Status detail | Rows with exact SEC file |
| --- | ---: | --- | ---: |
| State-registered IA list | 442 | 412 Approved; 25 Pending; 1 Conditional Restricted; 4 Termination Requested | 67 |
| SEC adviser notice list | 2,709 | 2,695 Notice Filed; 14 Pending | 2,709 |
| Exempt reporting adviser list | 236 | 236 ERA - Active | 117 |

These workbook rows are CRD-bearing adviser registrations/filings, **not 442, 2,709 or 236 distinct incorporated companies**. Some state advisers are sole proprietors or individual-named firms. No person record becomes an organization profile.

The accepted IAPD STATE and SEC firm compilations of **2026-09-17** (SHA-256 in `registration-lenses.json`) were parsed with the existing state-lens parser using jurisdiction `CT`. The acquisition script accepts `CT_INV_ACCEPTED_IAPD_DIR` for the local accepted-feed directory. This reuses the national IARD spine; it does not duplicate the national population.

| IAPD 2026-09-17 lens | Exact firm-CRD count |
| --- | ---: |
| Connecticut state IA, APPROVED | 398 |
| Connecticut federal-covered notice, FILED | 2,745 |
| Connecticut ERA, ACTIVE | 255 |
| Principal office in Connecticut, SEC compilation | 591 |

Each is a distinct filter, not part of a combined “Connecticut advisers” total. Exact CRD intersections and cross-source overlaps are in `registration-lenses.json`; an overlap is a diagnostic identity intersection, not an additive count. IAPD source status is not a quality endorsement or a substitute for live [DOB verification](https://portal.ct.gov/dob/about-dob/index-pages/verify-a-license). Broker-dealer, agent and investment-adviser-representative verification is known through DOB, [BrokerCheck](https://brokercheck.finra.org/) and [IAPD](https://adviserinfo.sec.gov/). Connecticut-only bulk BD/agent/IAR rosters are **NOT_ACQUIRED**.

## Enforcement

The 2022–2026 [Securities Division administrative-order indexes](https://portal.ct.gov/dob/enforcement/administrative-orders-index-pages) yielded **138 PDF document links** at 2026-09-28 retrieval. **137 PDFs** were readable; the Phillips & Company Securities Inc. PDF was unavailable to the acquisition script and remains index-only. Sixteen documents printed a single organization-caption firm CRD that exactly overlapped an accepted IAPD Connecticut firm lens. These are **read-only exact crosswalks**, not profile evidence attachments. Exact enforcement attachments **0**; name-only joins **0**; new canonical firms **0**; graph writes **0**; claim changes **0**. The index count is neither unique respondents nor final findings. Document labels, index dates and finality must be checked in the source order; allegations are not findings.

## Examinations, complaints and clocks

The DOB describes [adviser examinations](https://portal.ct.gov/dob/securities-division-administration/securities-examination-program/investment-adviser-examination-program-in-connecticut) and [broker-dealer examinations](https://portal.ct.gov/dob/securities-division-administration/securities-examination-program/broker-dealer-examination-program-in-connecticut), including offices inside and outside Connecticut. Examination capability **KNOWN**; provider-level outcomes **NOT_ACQUIRED**. [Securities complaint intake](https://portal.ct.gov/dob/consumer/consumer-complaints/securities-bd-ia) is **KNOWN**; public provider-level complaint rows and outcomes **NOT_ACQUIRED**. A complaint is not an order or finding.

Separate clocks: DOB workbook update 2025-10-22; each workbook retrieval 2026-09-28; IAPD source 2026-09-17; order-index retrieval 2026-09-28; individual index date where labeled; generatedAt in JSON. There is no universal Connecticut securities as-of clock. No city pages, ranking, advice or automated claim eligibility were added.
