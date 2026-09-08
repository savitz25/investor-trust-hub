# Trust Hub Specialist Search V1 — Investor port

Status: Investor reference-compatible implementation. Reviewed 2026-09-08.

## Shared network behavior

Investor implements the locked six-Hub anatomy: question-first bounded input, one Research action, examples, Advanced filters, visible interpretation, deterministic refinement, result identity, structure-derived “Why this matched,” evidence availability, result-level trace, explicit capability states, safe empty/partial handling, privacy-safe analytics vocabulary, and accessible layouts from 320px upward. `/ask` remains `noindex,follow`; public firm reports retain their independent publication gate.

## Investor domain adapter

The existing `consumer language → InvestorResearchQuery → parameterized SEC/IARD/Form ADV execution` engine remains authoritative. The adapter owns firm CRD and SEC-file syntax, RIA/ERA classes, principal-office geography, RAUM, Item 5.E methods, affiliations, state coverage, source dates, and firm-card fields. Natural language interprets; source data establishes facts.

The implementation never equates firm CRD with person CRD, principal office with client geography, RAUM with performance, compensation checkboxes with fee amounts, registration with endorsement, or missing disclosure evidence with a clean history. New Jersey state-RIA coverage is `REQUEST_ONLY`; California is `NOT_ACQUIRED`; client service territory and historical ADV diffs are `UNSUPPORTED`; ownership/disclosure execution is `PARTIAL` unless firm-specific evidence proves the requested fact.

## Homepage and precision utility

Specialist Search is the primary homepage research entry and submits to `/ask`. `/firms` remains the secondary precision directory for exact name, CRD, SEC file, city, ZIP and state lookup. The homepage WebSite `SearchAction` deliberately remains `/firms`: it is the stable directory target while `/ask` query pages remain noindex.

## Execution and safety

Inputs are capped at 400 characters, pages at 200, page size at 20, sort/filter choices are typed, name wildcards are escaped, SQL remains parameterized, and database failure is rendered as unavailable rather than zero. Results are ordered by identity/relevance or an explicitly named source metric, never adviser quality. Search does not bypass Wave-1 profile publication.
