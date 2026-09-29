# MD-INV-001 — Maryland securities intelligence

Starting `origin/main`: `3eede73a6067ca404350acd9f5f8a3b324f978b3`.

## Registration and identity

The [Maryland Office of the Attorney General, Securities Division](https://oag.maryland.gov/i-need-to/Pages/securities-division.aspx) says consumers may contact it to check Maryland registration and complaints for broker-dealers, stockbrokers, investment advisers and financial planners. It does not expose a clean statewide downloadable firm, agent or IAR roster on that page. Maryland-only bulk registration: **NOT_ACQUIRED**. The [IAPD](https://adviserinfo.sec.gov/) and [BrokerCheck](https://brokercheck.finra.org/) remain exact verification tools. The accepted 2026-09-17 IAPD STATE/SEC files used by earlier state work were inaccessible during this acquisition, so Maryland state IA, notice, ERA, principal-office counts and their exact CRD intersections are **NOT_ACQUIRED**. This release makes no numerical inference from other states or SEC-only counts. These four adviser lenses have distinct meanings and cannot be summed. Individuals are never promoted to firm profiles.

## Administrative actions

The official [Securities Division Administrative Actions](https://oag.maryland.gov/i-need-to/Pages/securities-administrative-actions.aspx) page loads a public SharePoint list and PDF year folders. `scripts/maryland/acquire_md_inv_001.py` reproduces that public index, retaining 2022–2026 rows by the list's displayed date. The frozen index contains **142 rows**: 72 consent, 23 final, 46 show-cause or summary, and 1 other/unresolved by the list's order-type labels. There are 138 resolved PDF links and 99 PDFs readable in this acquisition pass. Sixteen readable documents print CRD candidates; those numbers are not treated as verified firm captions or person-to-firm matches. Where the attachment filename starts with a case-like eight-digit number, it is retained as an *indexed filename candidate*, not independently validated as an official order number. A list date is retained as a list date, not presumed to be an order-signing date. The index is neither a unique-case census nor a final-finding count.

Exact firm-CRD crosswalks **0**; exact SEC-file crosswalks **0**; adverse profile attachments **0**; name-only joins **0**; new canonical firms **0**; graph writes **0**; claim changes **0**. The zero crosswalk count describes this release's confirmed matches, not the absence of printed identifiers or possible future exact matches.

## Examinations, complaints and clocks

Maryland publishes an [Investment Adviser Examination Program overview](https://oag.maryland.gov/i-need-to/Pages/investment-adviser-resources.aspx): capability **KNOWN**, provider-level outcomes **NOT_ACQUIRED**. It accepts [securities complaints](https://oag.maryland.gov/i-need-to/Pages/file-a-securities-complaint.aspx), with personal information described as confidential unless formal legal action is taken: intake **KNOWN**, provider-level complaint rows and outcomes **NOT_ACQUIRED**. A complaint is not an order.

Separate clocks: accepted IAPD compilation source date 2026-09-17, Maryland registration source date unavailable, action-index retrieval in `securities-actions.json`, displayed action-list dates per row, and generatedAt per snapshot. There is no universal Maryland securities as-of date. No city routes, rankings, scores or automatic claim expansion were added.
