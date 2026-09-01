# InvestorTrustHub specialist execution V2

Contract: `trusthub-specialist-execution-v2`

Version: `2.0.0`

Endpoint: `GET|POST /api/specialist-execution/v2`

Schema fingerprint: `a92b72c4a30de1021ecf25d26decb852b52394f741ac26919b89d14a234ab384`

Contract fingerprint: `13c6d3a8e573b65490d50c88534bfcf604dfdeaed64fc0522ff7ef9c4b2b7efa`

This endpoint is a public-safe normalization adapter over the existing
`investor-ask-v1` interpreter and firm query engine. It does not maintain a second
search index, write to the database, or change publication eligibility.

## Methods

`POST` is preferred for structured execution. `GET` supports either natural language
through `q` or equivalent structured query parameters. Existing `GET /api/ask`
behavior remains backward compatible.

All responses carry `X-Robots-Tag: noindex, follow`. Successful responses use a
bounded 60-second public cache with stale-while-revalidate. The endpoint creates no
indexable page or sitemap entry.

## Entity classes

- `ria`: registered investment-adviser firm facts.
- `era`: exempt reporting-adviser firm facts.
- `ria_and_era`: both firm classes in one cohort, with every row retaining its class.

Firm is not an individual investment-adviser representative. Individual-person
requests return `PUBLICATION_RESTRICTED`; they are never silently replaced with firm
rows.

## Structured request

```json
{
  "contract": "trusthub-specialist-execution-v2",
  "queryType": "cohort",
  "entityClass": "ria",
  "geography": {
    "stateCode": "FL",
    "intent": "PRINCIPAL_OFFICE"
  },
  "filters": {
    "minimumRaum": 1000000000,
    "maximumRaum": 10000000000,
    "compensationMethods": ["percentage_of_assets"]
  },
  "page": 1,
  "limit": 20
}
```

Supported query types are `cohort`, `identifier`, `identity`, and source-safe
`evidence`. Maximum page size is 20. Page is bounded to 1–200. Unknown fields and
invalid enum values are rejected.

### Exact CRD

```json
{
  "contract": "trusthub-specialist-execution-v2",
  "queryType": "identifier",
  "identifier": { "type": "CRD", "value": "166089" }
}
```

CRD is an exact firm identifier. No fuzzy or name fallback occurs. Bare ambiguous
digits are not accepted as a structured identifier.

### Firm name

```json
{
  "queryType": "identity",
  "identityName": "Example Advisory"
}
```

This delegates to the accepted Investor firm-name semantics. Zero matches return
`NO_CONFIDENT_MATCH`; multiple matches return `AMBIGUOUS_IDENTITIES`. An identity
failure never becomes a generic cohort.

## Normalized response

Every response contains:

- contract, version, schema fingerprint, and contract fingerprint;
- query interpretation and applied filters;
- explicit result state;
- bounded public-safe firm rows and exact total;
- pagination and available source-native refinements;
- provenance and source clocks;
- limitations and destinations;
- safe diagnostics such as elapsed time and row count.

Rows may contain firm name, source/legal name, organization CRD, RIA/ERA class,
registration status, principal office, filer-reported RAUM, Item 5.E compensation
methods, filing/source date, publication state, why-matched text, and safe
destinations. They do not contain internal database IDs, private contacts,
representative records, customer data, paid state, risk flags, rankings, or scores.

## Result states and HTTP behavior

| State | HTTP | Meaning |
| --- | ---: | --- |
| `SUPPORTED_RESULTS` | 200 | Supported cohort/evidence query returned rows. |
| `ZERO_MATCHING_ROWS` | 200 | Supported filters produced a true zero. |
| `EXACT_IDENTITY` | 200 | One exact CRD or unambiguous accepted firm identity. |
| `NO_CONFIDENT_MATCH` | 200 | Valid identity query found no source-safe match. |
| `AMBIGUOUS_IDENTITIES` | 200 | Multiple accepted firm identities match the name. |
| `UNSUPPORTED_CAPABILITY` | 422 | Valid request asks for evidence InvestorTrustHub cannot support. |
| `PUBLICATION_RESTRICTED` | 422 | The requested entity class is not public through this contract. |
| `INVALID_QUERY` | 400 | Malformed JSON, missing slot, invalid enum, or invalid bound. |
| `BACKEND_UNAVAILABLE` | 503 | Research database is unavailable; not a zero result. |
| `TIMEOUT` | 504 | The bounded server execution window elapsed. |

## Geography

Supported geography is the SEC/IARD roster principal-office state, city, or ZIP.

Principal office is not:

- client geography;
- service territory;
- notice-filing footprint;
- proof that the firm accepts clients in that location.

No national fallback is substituted for an empty state intersection.

## RAUM

RAUM is the amount the RIA filer reports on Form ADV Item 5F(2)(c). Range filters use
the numeric source field. Missing values remain missing; zero remains a reported zero.

RAUM is not performance, returns, profitability, safety, quality, or a promise that a
marketing asset figure is current. ERA filers do not report the RIA RAUM field, so an
ERA+RAUM request is `UNSUPPORTED_CAPABILITY` rather than a misleading zero.

## Compensation methods

Supported values are the accepted Form ADV Item 5.E methods:

- percentage of assets;
- hourly charges;
- subscription fees;
- fixed fees;
- commissions;
- performance-based fees;
- other compensation.

These are filer-reported method checkboxes. They do not establish an exact fee, quote,
price, or whether a firm is appropriate for a consumer. ERA+Item 5.E requests are
unsupported because that source class does not file these RIA fields.

## Available refinements

The response advertises only source-backed refinements relevant to the current class:

- RIA / ERA class;
- principal-office geography;
- RIA RAUM range;
- RIA Item 5.E compensation method;
- exact organization CRD.

Performance, “best,” safety, reviews, ratings, popularity, service territory, and
individual representatives are not emitted as refinements.

## Destinations and publication

Each row always receives an official SEC/IARD verification destination based on its
exact organization CRD. `PUBLIC_PROFILE` and `canonicalProfileUrl` are returned only
when the existing `search_documents.indexable` gate already supplies a public Trust
Report. A legitimate research row may have a null profile destination.

The adapter does not mint slugs, profiles, anchors, or sitemap URLs. Current Wave-1
publication remains a content gate, not a recommendation or quality ranking.

## Provenance and source clock

- Source family: SEC / IARD Form ADV.
- Dataset: `IA_FIRM_SEC_Feed_08_27_2026` / `iapd_sec_compilation`.
- Official as of: `2026-08-27`.
- Retrieved: `2026-08-28`.
- Identity grain: organization CRD on the current firm roster.

Deployment or response-generation time never replaces the official source clock.

## Examples

### New Jersey cohort

```json
{
  "queryType": "cohort",
  "entityClass": "ria_and_era",
  "geography": { "stateCode": "NJ", "intent": "PRINCIPAL_OFFICE" },
  "page": 1,
  "limit": 20
}
```

The total is calculated from the current source. Each row must have NJ principal-office
geography. It does not claim the firm serves New Jersey.

### Florida RAUM cohort

```json
{
  "queryType": "cohort",
  "entityClass": "ria",
  "geography": { "stateCode": "FL", "intent": "PRINCIPAL_OFFICE" },
  "filters": { "minimumRaum": 1000000000, "maximumRaum": 10000000000 }
}
```

### Exact CRD

```json
{
  "queryType": "identifier",
  "identifier": { "type": "CRD", "value": "166089" }
}
```

The expected state is `EXACT_IDENTITY` when the current roster contains that exact
firm. A public-profile destination may still be null under the existing publication
gate.

### Ranking refusal

`GET /api/specialist-execution/v2?q=best%20investment%20adviser` returns 422 with
`UNSUPPORTED_CAPABILITY`. The response explains that InvestorTrustHub does not rank,
predict returns, or make hiring recommendations, while offering neutral research
alternatives through the preserved V1 interpretation.

### Person restriction

```json
{
  "queryType": "cohort",
  "requestedEntityClass": "individual_representative",
  "geography": { "stateCode": "FL", "intent": "PRINCIPAL_OFFICE" }
}
```

Returns 422 `PUBLICATION_RESTRICTED`. No firm substitution and no individual rows.

## Timeouts and failures

Execution is bounded to 12 seconds. A timeout returns a normalized 504 payload. A
database failure returns a normalized 503 payload. Neither is represented as a zero
cohort, and neither changes the durability or publication of source evidence.
