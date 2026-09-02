# Investor customer firm validation V1

- Endpoint: `POST /api/customer-claim-validation/v1`
- Contract: `investor-customer-claim-validation-v1`
- Version: `1.0.0`
- Schema fingerprint: `51d41f55eb6ff85f1ecf85e8feb0742647e6d50c730ad37859cd9918625018f3`
- Contract fingerprint: `80cc14c9d9756972d87aaf3a51ac2336888a9dc77048d3d3c298343b25086032`

## Request

```json
{
  "contract": "investor-customer-claim-validation-v1",
  "entityType": "firm",
  "nativeProfileId": "canonical-firms-uuid",
  "firmCrd": "312385",
  "canonicalProfileUrl": "https://www.investortrusthub.com/firm/sec-crd-312385"
}
```

All fields are required. Name, geography, RAUM, compensation method, and RIA/ERA
label are not identity keys.

## Success

`EXACT_IDENTITY` proves one current, existing public firm profile bound to the
canonical `firms.id`, exact organization CRD, and exact canonical profile URL. The
response includes the regulatory class as evidence. That class does not create a
second customer profile and does not prove customer control.

## Fail-closed states

- `INVALID_QUERY`: malformed or incomplete exact inputs.
- `NO_CONFIDENT_MATCH`: native ID, CRD, or destination mismatch.
- `PUBLICATION_RESTRICTED`: representative request or an exact firm that is not a
  current public profile.
- `BACKEND_UNAVAILABLE`: the canonical research store could not be checked.

Responses use `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
Research-only firms, unpublished firms, representatives, and fuzzy/name-only
candidates are never claimable. A null or absent public destination cannot validate.
