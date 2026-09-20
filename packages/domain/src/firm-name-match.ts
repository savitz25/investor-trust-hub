/**
 * firm-name-match.ts — TH-SEARCH-R1-019H
 *
 * The ONE authoritative firm-name normalization/matching primitive shared by every Investor call
 * site that decides (a) whether raw text is organization-name shaped, or (b) whether two
 * presentation forms of a firm name refer to the same source identity. It is used by:
 *   - investor-ask.ts (native bare-name discovery, `simpleFirmName`)
 *   - investor-research-plan.ts (the sentence-level bare-name heuristic that gates native /ask)
 *   - investor-specialist-execution-v2.ts (structured `identityName`)
 *   - apps/web/src/lib/ask/execute.ts (SQL execution: WHERE predicate and exact-match ordering)
 *
 * This module intentionally does NOT:
 *   - implement a second full sentence/intent parser (that stays in investor-ask.ts /
 *     investor-research-plan.ts, which keep their own context-specific exclusion heuristics);
 *   - do fuzzy / edit-distance matching;
 *   - hold company-specific aliases;
 *   - fold "&" to "AND" (no existing accepted source-name equivalence for that was found
 *     elsewhere in Investor, so it is not invented here — see docs/firm-search.md and
 *     firm-search-query.ts, neither of which does this either).
 *
 * It only answers two questions, identically everywhere they are asked:
 *   1. isOrganizationNameShape(raw) — does this look like an organization name rather than a bare
 *      ambiguous numeric identifier (CRD/CIK/SEC-file/year)? A digit-leading name ("1ST GLOBAL",
 *      "3 SIGMA", "180 DEGREE CAPITAL CORP") is allowed only when the string also contains a
 *      letter. A string that is nothing but digits/whitespace/hyphens (bare digits, an unlabeled
 *      SEC-file-number shape such as "801-11953") is never name-shaped.
 *   2. normalizeFirmNamePresentation(raw) — folds case, whitespace, and ALL ordinary punctuation
 *      (commas, periods, ampersands, hyphens, apostrophes, legal-suffix punctuation) to single
 *      spaces, so "CINCINNATI ASSET MANAGEMENT, INC" and "CINCINNATI ASSET MANAGEMENT INC."
 *      normalize identically. normalizedNameMatchSql() is the byte-for-byte identical transform
 *      expressed as an inline SQL expression (no CREATE FUNCTION, no schema/index change) for use
 *      in a WHERE/ORDER BY clause.
 */

/** Characters ordinary firm-name presentation uses. Shared verbatim by every name-shape regex in
 * this module and by investor-ask.ts / investor-research-plan.ts, so punctuation tolerance cannot
 * silently drift between native bare-name discovery, the sentence-level bare-name heuristic, and
 * structured identityName (the root cause this ticket closes: those three previously used three
 * different, mutually inconsistent character classes). */
export const FIRM_NAME_CHAR_CLASS = "A-Za-z0-9&.,'\\- ";

/** Ordinary US legal-entity suffix words used as a content signal (not a shape rule) by the
 * sentence-level bare-name heuristic in investor-research-plan.ts: a bare sentence ending in one of
 * these generic entity-type words is more likely a deliberately-entered firm name than an ordinary
 * question. This is a small set of standard entity-type suffixes (not company-specific aliases). */
export const FIRM_LEGAL_SUFFIX_WORDS =
  'capital|advisors?|advisers?|llc|inc|corp|co|ltd|lp|group|management|partners|investments|financial';

const FIRM_NAME_FULL_SHAPE = new RegExp(`^[${FIRM_NAME_CHAR_CLASS}]+$`);
const FIRM_NAME_FIRST_CHAR = /^[A-Za-z0-9]/;
const HAS_LETTER = /[A-Za-z]/;

/** A string containing only digits, whitespace, and hyphens is an ambiguous identifier shape (a
 * bare CRD/CIK, an unlabeled SEC file number such as "801-11953", a bare year, a lone digit) —
 * never a firm name, regardless of length. Mirrors investor-ask.ts's BARE_DIGITS fail-closed rule
 * and generalizes it to the hyphenated unlabeled-SEC-file shape. */
const AMBIGUOUS_IDENTIFIER_SHAPE = /^[\d\s-]+$/;

/**
 * True when `raw` (already trimmed of surrounding whitespace by the caller's usual pipeline, but
 * trimmed again here defensively) is organization-name shaped: 2-80 characters, limited to
 * ordinary firm-name punctuation, containing at least one letter, and not a bare ambiguous
 * identifier shape.
 */
export function isOrganizationNameShape(raw: string): boolean {
  const q = raw.trim();
  if (q.length < 2 || q.length > 80) return false;
  if (AMBIGUOUS_IDENTIFIER_SHAPE.test(q)) return false;
  if (!FIRM_NAME_FIRST_CHAR.test(q)) return false;
  if (!FIRM_NAME_FULL_SHAPE.test(q)) return false;
  if (!HAS_LETTER.test(q)) return false;
  return true;
}

/**
 * Presentation-equivalence normalization for firm display_name / legal_name comparison. Folds
 * case, whitespace, and ALL punctuation to single spaces, then trims. This is ordinary
 * presentation equivalence only — it preserves every meaningful alphanumeric token and performs no
 * fuzzy/edit-distance matching, so "Asset Management" alone still only normalizes to itself, not to
 * any specific firm.
 *
 * Keep this in exact sync with normalizedNameMatchSql() below: one is the JS-side primitive (used
 * by the interpretation layer and by tests), the other is the identical transform expressed as
 * inline SQL (used by the execution layer). A change to the folding rule here must be mirrored
 * there, and check:th-search-r1-019h asserts they agree on a shared case battery.
 */
export function normalizeFirmNamePresentation(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Inline SQL expression (no CREATE FUNCTION / no schema or index change) computing the identical
 * transform as normalizeFirmNamePresentation() above, for a given SQL expression `expr` (a column
 * reference or a bound parameter cast to text).
 */
export function normalizedNameMatchSql(expr: string): string {
  return `btrim(regexp_replace(lower(${expr}), '[^a-z0-9]+', ' ', 'g'))`;
}

export type NameQueryResolution =
  | { kind: 'name'; nameQuery: string }
  | { kind: 'ambiguous_identifier'; reason: string }
  | { kind: 'not_a_name' };

export const AMBIGUOUS_IDENTIFIER_REASON =
  'Bare digits or an unlabeled identifier-shaped value are ambiguous (CRD, CIK, SEC file number, or other identifiers). Use a labeled CRD such as "Find CRD 123456."';

/**
 * Resolve a raw bare string into either a candidate firm-name query or an ambiguous-identifier
 * classification. This is the ONE decision both native bare-name discovery
 * (investor-research-plan.ts / investor-ask.ts) and the structured identityName path
 * (investor-specialist-execution-v2.ts) run through, so a digit-only or unlabeled
 * identifier-shaped string is refused identically on both sides instead of silently becoming an
 * unbounded name search on only one of them.
 */
export function resolveBareNameCandidate(raw: string): NameQueryResolution {
  const q = raw.trim();
  if (!q) return { kind: 'not_a_name' };
  if (AMBIGUOUS_IDENTIFIER_SHAPE.test(q)) {
    return { kind: 'ambiguous_identifier', reason: AMBIGUOUS_IDENTIFIER_REASON };
  }
  if (!isOrganizationNameShape(q)) return { kind: 'not_a_name' };
  return { kind: 'name', nameQuery: q };
}
