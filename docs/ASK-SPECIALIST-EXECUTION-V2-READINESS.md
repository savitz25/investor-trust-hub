# InvestorTrustHub specialist execution V2 readiness

Audit date: 2026-09-01  
Repository: `savitz25/investor-trust-hub`  
Audited `origin/main`: `44f531f81d5912bbc831439f5500bc48a9bf5d15`  
Production deployment: `dpl_5L4gA77SrJaxa6YV9jbqCHX9ZBoL` (`READY`, same Git SHA)  
Current endpoint/contract: `GET /api/ask`, `investor-ask-v1`

This is a read-only capability audit. It authorizes no ingestion, identity creation,
publication expansion, or AskTrustHub change.

## Executive classification

| Entity class | Classification | Reason |
| --- | --- | --- |
| RIA firm | `SMALL_ADAPTER_REQUIRED` | V1 already has structured cohort/identifier execution, bounded rows, totals, pagination, refinements, source clocks, limitations, and publication-aware destinations. Only the V2 envelope/status normalization is missing. |
| ERA firm | `SMALL_ADAPTER_REQUIRED` | ERA is already a separate source-native class with class-correct cohorts and fail-closed incompatible filters. |
| Individual representative | `BLOCKED_BY_PUBLICATION_POLICY` | The accepted product publishes firm research, not individual/IAR profiles. |

InvestorTrustHub is the closest of the three audited hubs to
`trusthub-specialist-execution-v2` readiness.

## V2 field matrix

| V2 field | Status | Current evidence / gap |
| --- | --- | --- |
| Structured requests | `ALREADY_SUPPORTED` | Entity, identifier, count, aggregate, comparison, evidence, definition, and fail-closed modes. |
| Entity classes | `ALREADY_SUPPORTED` | RIA and ERA remain separate; firm is not individual representative. |
| Identifiers | `ALREADY_SUPPORTED` | Labeled exact CRD lookup. |
| Required slots | `SUPPORTED_BUT_NOT_NORMALIZED` | Firm class, geography, RAUM, compensation, affiliation, identifier, sort, and page are typed but not declared in a V2 capabilities envelope. |
| Geography | `ALREADY_SUPPORTED` | Principal-office state/city/ZIP where indexed. Explicitly not client geography or service territory. |
| Actual bounded rows | `ALREADY_SUPPORTED` | Page size 20 from the production SEC/IARD data plane. |
| Totals | `ALREADY_SUPPORTED` | Exact total in pagination and class-correct counts. |
| Pagination | `ALREADY_SUPPORTED` | Page, page size, total, `hasMore`; bounded server execution. |
| Refinements | `SUPPORTED_BUT_NOT_NORMALIZED` | Firm class, state/city/ZIP, RAUM bands, compensation methods, affiliations, and factual sorts exist but are not emitted as V2 `availableRefinements`. |
| Provenance | `ALREADY_SUPPORTED` | SEC/IARD source family, dataset, official-as-of, retrieval date, geography meaning, metric, RAUM units, compensation taxonomy, exclusions, identifier method. |
| Source clocks | `ALREADY_SUPPORTED` | Dataset `IA_FIRM_SEC_Feed_08_27_2026`, official as of `2026-08-27`, retrieved `2026-08-28`; row filing/retrieval clocks where present. |
| Limitations | `ALREADY_SUPPORTED` | RIA/ERA, office geography, RAUM, compensation, disclosure, and publication limits. |
| Structured unsupported response | `SUPPORTED_BUT_NOT_NORMALIZED` | `fail_closed` is deterministic; V2 needs stable status/error code and alternatives. |
| Canonical destinations | `ALREADY_SUPPORTED` for the indexable Wave-1 cohort; otherwise intentionally null | Non-indexable firms may be returned as source rows without minting a profile. |
| Public-only filtering | `SUPPORTED_BUT_NOT_NORMALIZED` | Destination exposure respects `search_documents.indexable`; the V2 contract must state whether non-indexable source rows are permitted or filter strictly to published rows for Ask consumption. |

## Production golden queries

| Query | Safe outcome observed | Classification |
| --- | --- | --- |
| `investment company in New Jersey` | 20 bounded firm rows, 438 total; principal-office geography. | `ROWS` with terminology clarification |
| `Florida RIAs between $1B and $10B RAUM` | 20 bounded rows, 224 total; principal-office Florida and source-native RAUM band. | `ROWS` |
| `CRD 166089` | One exact firm identity. Its public destination is null because it is outside the current indexable profile cohort. | `ROWS` plus publication-aware handoff |
| `advisory firms in Texas` | 20 bounded rows, 1,302 total; principal-office Texas. | `ROWS` |
| `best investment adviser` | Deterministic `fail_closed`, zero rows. | `CLARIFICATION` / neutral research handoff |

## Existing contract strengths

- RIA and ERA are never combined into a fake provider or quality total.
- Exact CRD identity is source-native and does not rely on name guessing.
- RAUM is Form ADV Item 5F(2)(c), not performance.
- Compensation methods are Item 5.E disclosures, not fee amounts.
- SEC registration is not endorsement.
- Principal office is not client geography or service territory.
- No TrustHub score, performance ranking, or “best adviser” result is produced.

## Deep-link readiness

Canonical firm URLs already exist for the accepted Wave-1 indexable cohort. Current
V1 rows correctly return `href: null` for firms outside that cohort. V2 should expose
the canonical profile destination only when present and provide source destinations
(SEC/IAPD) through the normalized provenance/limitations contract. No individual
representative destination may be synthesized.

## Recommended implementation ticket

`INV-CAP-001 — InvestorTrustHub specialist execution V2 adapter`

Build a thin adapter over `investor-ask-v1`. Normalize capabilities, required slots,
request/response field names, available refinements, result statuses, and destination
templates. Decide and document the V2 public-row rule: either strictly filter cohort
rows to the Wave-1 indexable set or retain source-safe non-profile rows with an explicit
`destinationUnavailable` publication state. Do not expand the Wave-1 gate.

Estimated size: small (2–3 focused engineering days).

## Safety result

DB writes: `0`  
Identity delta: `0`  
Public profile delta: `0`  
Sitemap delta: `0`  
AskTrustHub changes: `0`
