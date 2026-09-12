# R1-012 source clock follow-up

Read-only Production certification at 2026-09-12T18:07:51Z found CRD 105958 firm facts attached to source release c0e02f60-ba4b-452c-b3af-5cff8de471b5, dataset sec_ia_ria, release label 2026-08-03, retrieved 2026-08-18T15:12:53.676808Z. published_at and checksum_sha256 are NULL. The 2026-08-27 compilation manifest is a separate reference snapshot, not this row's official source date.

Root cause: the pre-existing result provenance used V1_SOURCE globally; the first R1-012 implementation still used its date as a fallback for a NULL row publication date. The bounded live cohort/identity behavior passed, but that did not certify field-level source clocks. No data correction or source ingestion is authorized or performed.

Repair: retain NULL official dates; project the actual returned-row dataset, release label, retrieval date and recorded fingerprint. Never infer official publication from a release label, retrieval time or global reference snapshot. Native/API/structured consumers share this projection. Trace distinguishes returned-row sources from reference snapshot metadata; a miss remains a search of the published firm-fact index without invented row provenance.

Regression: fixture with known retrieval, separate release label and NULL official date/fingerprint must preserve NULL and must not borrow the global snapshot date. Existing identity and city results remain unchanged. Full/focused tests and optimized browser verification apply before a normal follow-up release.

Prior automated Vercel review completed SUCCESS for 7a3558b; its statistics report one suggestion, but GitHub review/comment/annotation endpoints expose no actionable finding. No claim of independent human review or zero suggestions. The final dff7f0b name-boundary change received self-review, clean CI and optimized browser tests.
