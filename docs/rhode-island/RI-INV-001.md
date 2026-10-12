# RI-INV-001 — Rhode Island securities intelligence

## Source authority and clocks

Rhode Island DBR Securities Division administers the Rhode Island Uniform Securities Act and states that it regulates certain investment advisers, investment adviser representatives, broker-dealers and sales representatives. DBR identifies IARD for investment-adviser and IAR filings and CRD for broker-dealer and sales-representative filings. The IAPD firm feeds provide distinct firm-level registration and notice lenses; they do not supply the full provider-level population for every CRD class.

| Source | Observation | Clock |
| --- | --- | --- |
| IAPD STATE firm compilation | State IA and ERA rows filtered by `Rgltr/@Cd=RI` | Source 2026-10-06; retrieved 2026-10-12 |
| IAPD SEC firm compilation | RI notice filings by `RgltrCd=RI`; principal office separately by address state | Source 2026-10-06; retrieved 2026-10-12 |
| Rhode Island DBR Securities Division enforcement page | 98 linked securities action document rows | Retrieved 2026-10-12 |
| DBR eLicensing portal | Official live lookup and roster generation system | Page reviewed 2026-10-12; provider-level exports not acquired |

The JSON acquisition record contains exact feed URLs, byte lengths, SHA-256 digests, retrieval time, jurisdiction filters, CRD observations and exact intersections. The source date is not asserted as a live DBR status date.

## Separate firm lenses

- State IA: 79 distinct firm CRDs across 79 registration observations; 78 approved and 78 in the current-status set used by the source parser.
- Federal notice: 1,214 firm CRDs with an IAPD notice status of FILED for Rhode Island.
- ERA: 9 distinct firm CRDs and 9 ACTIVE registrations.
- SEC-compilation principal office in Rhode Island: 50 firm CRDs. This is an address lens, not Rhode Island registration or authority.
- One exact firm-CRD overlap between approved state IA and filed notice. It remains an intersection, not another population.

These sets are not added into a combined adviser count. Firms are identified by firm CRD; IARs and sales agents are people and are not folded into firms.

## Orders and unavailable populations

The regulator page exposed 98 linked securities action documents. They are document observations, not unique respondents, provider violations, final findings or a comprehensive adverse-history census. No name-only joins, profile attachments or graph writes were made. Read each source document to determine respondent grain and procedural disposition.

DBR identifies IARD/CRD filing systems and a public eLicensing lookup/roster tool. This acquisition did not obtain bulk records for Rhode Island IARs, broker-dealer firms or sales representatives. Those populations remain **NOT_ACQUIRED**; complaints and provider-level examination outcomes were not acquired either.

## Publication limits

The state route publishes source-derived firm CRD counts, clocks, exact intersections, order-document links and regulator verification paths. It does not rank advisers, infer authority from office geography, publish a combined census, attach orders to providers by name, or claim that no record means no enforcement history. Existing canonical-firm matches and net-new graph entities were not measured because this publication made no canonical-firm or graph writes.
