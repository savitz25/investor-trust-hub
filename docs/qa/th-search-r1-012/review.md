# Separate review pass

Method: self-review of the complete runtime diff plus automated behavioral, route/render, publication, type/lint and browser checks. No independent human review is claimed. Review performed 2026-09-12 before PR submission.

Reviewed intent precedence, explicit identifier equality, source-name selection, office city/state SQL before count/order/limit, registration versus principal office, RIA/ERA/notice/SEC semantics, privacy/publication, API compatibility, URL state, source clocks and rendering.

Findings resolved during review:
- A selected candidate initially reused the pre-selection name explanation. Cards now use the server-revalidated exact CRD.
- `find investment advisers ...` could still look like a named firm. Added ordinary discovery-verb negatives while retaining explicit/quoted organization names.
- Full request validation replaces old route truncation; duplicate q is also safe during metadata generation.
- Missing-identity/state forms and edits retain unrelated typed filters. State controls include recognized source states rather than the state-page navigation list.
- Long internal intent tokens caused a 320px interpretation overflow. Consumer task labels use words and the result grid permits wrapping.
- Name predicates bind values and escape backslash/percent/underscore; exact source names sort before the candidate limit. Explanations name the actual source field/value.
- Structured natural-language SEC lookup no longer labels its applied identifier CRD. Existing v2 schema/descriptors remain unchanged.

Protected limitations: searchable operational registration rows establish SEC facts, not Wyoming approval. Published CO/VA/NY intelligence remains separate; this ticket does not acquire or publish new state cohorts. Internal-only Item 11 fields are not exposed. No disclosure absence is certified as a clean history. Source/data writes, global settings and other repositories are untouched.

Rollback: reviewed Investor-only revert/deployment preserving safe clarification and no registration-to-office substitution. No database rollback. Do not restore the known broad fallback without equivalent containment.

- Browser continuation exposed duplicate CRD-as-name inference: bare-name detection now excludes an already parsed exact identifier. A miss has no invented name condition or answer claiming identity resolution. Added a production-executor regression.
