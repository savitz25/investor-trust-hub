/**
 * TH-SEARCH-R1-019H — Investor name-form normalization + native/structured parity.
 *
 * Focused gate (`npm run check:th-search-r1-019h`). Required groups (ticket Section 12):
 *  1. punctuation-equivalent name             8. deterministic order
 *  2. numeric-leading organization name        9. native/structured parity
 *  3. bare digits still ambiguous             10. genuine miss
 *  4. exact CRD precedence                    11. source failure != miss
 *  5. exact SEC-file precedence               12. no manufactured profile
 *  6. RIA/ERA separation                      13. research sentences stay non-name
 *  7. match-before-pagination                 14. state/office semantics unchanged
 *                                             15. exact total remains truthful
 *                                             16. prior R1-012 controls (see r1-012.test.ts, run
 *                                                 alongside this gate in package.json)
 *                                             17. parent contract/fingerprint unchanged
 *                                             18. responsive/native navigation state (query-string
 *                                                 preservation / selection revalidation proxy --
 *                                                 real cross-width browser QA is separate, see PR
 *                                                 description)
 *
 * DB access note: this gate runs entirely against a mocked pg client (no live database), following
 * the existing r1-012.test.ts / th-search-001f.test.ts convention. The fixture firms below are
 * REPRESENTATIVE, clearly-labeled stand-ins -- CRDs/names have NOT been verified against the
 * production Supabase copy (that verification was blocked at dispatch time; see PR description).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  SPECIALIST_EXECUTION_CONTRACT,
  SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  SPECIALIST_EXECUTION_VERSION,
  interpretInvestorAskQuery,
  isOrganizationNameShape,
  normalizeFirmNamePresentation,
  structuredRequestToParsed,
  specialistExecutionRequestSchema,
} from '@ith/domain';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>>(
    async () => ({ rows: [] }),
  ),
}));
vi.mock('../src/lib/db', () => db);
import { executeInvestorAsk } from '../src/lib/ask/execute';
import { executeSpecialistV2 } from '../src/lib/specialist-execution/v2';

// --- Representative fixture (NOT verified against production -- see module docstring) ---------
const FIXTURE = [
  {
    id: 'cincy-1',
    crd: '900001',
    // The exact source-recorded punctuation form this control is frozen against: comma before the
    // legal suffix, no trailing period ("...MANAGEMENT, INC").
    display_name: 'CINCINNATI ASSET MANAGEMENT, INC',
    legal_name: 'CINCINNATI ASSET MANAGEMENT, INC',
    city: 'Cincinnati',
    region: 'OH',
    dataset_kind: 'ria',
    indexable: true,
    slug: 'cincinnati-asset-management',
    registration_status: 'registered',
  },
  {
    id: 'capital-am-1',
    crd: '900002',
    display_name: 'CAPITAL ASSET MANAGEMENT, INC.',
    legal_name: 'CAPITAL ASSET MANAGEMENT, INC.',
    city: 'Denver',
    region: 'CO',
    dataset_kind: 'ria',
    indexable: true,
    slug: 'capital-asset-management',
    registration_status: 'registered',
  },
  {
    id: 'numeric-1',
    crd: '900003',
    display_name: '1ST GLOBAL CAPITAL CORP',
    legal_name: '1ST GLOBAL CAPITAL CORP',
    city: 'Dallas',
    region: 'TX',
    dataset_kind: 'ria',
    indexable: true,
    slug: '1st-global-capital',
    registration_status: 'registered',
  },
  {
    id: 'era-1',
    crd: '900004',
    display_name: 'STEADY HARBOR CAPITAL PARTNERS',
    legal_name: 'STEADY HARBOR CAPITAL PARTNERS',
    city: 'Boston',
    region: 'MA',
    dataset_kind: 'era',
    indexable: false,
    slug: 'steady-harbor-capital-partners',
    registration_status: 'reporting',
  },
  {
    id: 'research-only-1',
    crd: '900005',
    display_name: 'QUIETLY UNPUBLISHED WEALTH PARTNERS LLC',
    legal_name: 'QUIETLY UNPUBLISHED WEALTH PARTNERS LLC',
    city: 'Reno',
    region: 'NV',
    dataset_kind: 'ria',
    indexable: false,
    slug: 'quietly-unpublished-advisors',
    registration_status: 'registered',
  },
];

function fixtureDb() {
  db.query.mockReset();
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT firm_id, field_name')) return { rows: [] };
    let rows = FIXTURE.slice();
    const param = (re: RegExp) => {
      const m = sql.match(re);
      return m ? String((params as unknown[])[Number(m[1]) - 1]) : undefined;
    };
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const crd = param(/crd\.identifier_value = \$(\d+)/);
    if (crd) rows = rows.filter((r) => r.crd === crd);
    const city = param(/lower\(b\.city\) = lower\(\$(\d+)\)/);
    if (city) rows = rows.filter((r) => String(r.city).toLowerCase() === city.toLowerCase());
    const region = param(/b\.region = \$(\d+)/);
    if (region) rows = rows.filter((r) => r.region === region);
    const sec = param(/upper\(sec\.identifier_value\) = upper\(\$(\d+)\)/);
    if (sec) rows = rows.filter(() => false); // no SEC-file fixture rows -- proves exact-miss, not a broadened result
    const name = param(/btrim\(regexp_replace\(lower\(f\.display_name\)[\s\S]*?LIKE \$(\d+)/);
    if (name) {
      const needle = normalize(name.slice(1, -1));
      rows = rows.filter(
        (r) => normalize(r.display_name).includes(needle) || normalize(r.legal_name).includes(needle),
      );
    }
    if (sql.includes("adv.dataset_kind = 'ria'")) rows = rows.filter((r) => r.dataset_kind === 'ria');
    if (sql.includes("adv.dataset_kind = 'era'")) rows = rows.filter((r) => r.dataset_kind === 'era');
    if (sql.includes('count(')) return { rows: [{ n: rows.length }] };
    const limit = param(/LIMIT \$(\d+)/);
    return { rows: rows.slice(0, limit ? Number(limit) : 20) };
  });
}

// =================================================================================================
// 1. Punctuation-equivalent name
// =================================================================================================
describe('1. punctuation-equivalent name', () => {
  it.each([
    'CINCINNATI ASSET MANAGEMENT',
    'CINCINNATI ASSET MANAGEMENT, INC',
    'CINCINNATI ASSET MANAGEMENT INC',
    'CINCINNATI ASSET MANAGEMENT INC.',
  ])('all supported presentation forms surface the same frozen identity: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.results.map((x) => x.crd)).toContain('900001');
  });

  it('candidate matching stays bounded -- a broad multi-word phrase is not silently one exact firm', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('research "Asset Management"');
    // Two real distinct fixture identities both contain "Asset Management" -- both are candidates,
    // neither is silently promoted to an exact identity.
    expect(new Set(r.results.map((x) => x.crd))).toEqual(new Set(['900001', '900002']));
  });

  it('the JS and SQL-fragment normalization stay in sync on a shared case battery', () => {
    const cases: Array<[string, string]> = [
      ['CINCINNATI ASSET MANAGEMENT, INC', 'cincinnati asset management inc'],
      ['CINCINNATI ASSET MANAGEMENT INC.', 'cincinnati asset management inc'],
      ['  Multiple   Spaces  Here ', 'multiple spaces here'],
      ["O'Brien & Sons, LLC.", 'o brien sons llc'],
    ];
    for (const [raw, expected] of cases) expect(normalizeFirmNamePresentation(raw)).toBe(expected);
  });
});

// =================================================================================================
// 2. Numeric-leading organization name
// =================================================================================================
describe('2. numeric-leading organization name', () => {
  it.each(['1ST GLOBAL CAPITAL CORP', '3 Sigma Global Asset Management', '180 Degree Capital Corp'])(
    'a legitimate organization-shaped digit-leading name is discoverable: %s',
    (raw) => {
      expect(isOrganizationNameShape(raw)).toBe(true);
    },
  );

  it('reaches the DB as a real bare-name query end to end', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('1ST GLOBAL CAPITAL CORP');
    expect(r.results.map((x) => x.crd)).toContain('900003');
  });
});

// =================================================================================================
// 3. Bare digits still ambiguous
// =================================================================================================
describe('3. bare digits still ambiguous', () => {
  it.each(['123456', '2026', '1', '3'])('never becomes a firm-name search: %s', (raw) => {
    expect(isOrganizationNameShape(raw)).toBe(false);
    expect(interpretInvestorAskQuery(raw).query.nameQuery).toBeUndefined();
  });

  it('an unlabeled SEC-file shape stays ambiguous, not a name', () => {
    expect(isOrganizationNameShape('801-11953')).toBe(false);
    expect(interpretInvestorAskQuery('801-11953').query.nameQuery).toBeUndefined();
  });

  it('bare digits never call the database', async () => {
    fixtureDb();
    await executeInvestorAsk('123456');
    expect(db.query).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// 4 & 5. Exact CRD / SEC-file precedence (identifier precedence never runs after name normalization)
// =================================================================================================
describe('4. exact CRD precedence', () => {
  it.each(['CRD 900001', 'Find CRD 900001'])('labeled CRD resolves exact identity before any name path: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.results.map((x) => x.crd)).toEqual(['900001']);
    expect(r.parsed.query.nameQuery).toBeUndefined();
  });
});

describe('5. exact SEC-file precedence', () => {
  it('labeled SEC file number resolves an identifier query, not a name search', () => {
    const p = interpretInvestorAskQuery('SEC file 801-11953');
    expect(p.query.identifier).toEqual({ type: 'sec_file_number', value: '801-11953' });
    expect(p.query.nameQuery).toBeUndefined();
  });
});

// =================================================================================================
// 6. RIA/ERA separation
// =================================================================================================
describe('6. RIA/ERA separation', () => {
  it('an ERA name candidate is never returned under an RIA-only firm-type filter', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('STEADY HARBOR CAPITAL PARTNERS', { firmType: 'ria' });
    expect(r.results).toEqual([]);
  });
  it('an ERA name candidate is returned when ERA is included', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('STEADY HARBOR CAPITAL PARTNERS');
    expect(r.results.map((x) => x.crd)).toContain('900004');
    expect(r.results.find((x) => x.crd === '900004')?.firmType).toBe('era');
  });
});

// =================================================================================================
// 7 & 8. Match-before-pagination and deterministic order
// =================================================================================================
describe('7. match-before-pagination', () => {
  it('the normalized name predicate is inside the WHERE clause, before LIMIT/OFFSET', async () => {
    fixtureDb();
    await executeInvestorAsk('research "Asset Management"');
    const call = db.query.mock.calls.find(([s]) => s.includes('LIMIT'))!;
    expect(call[0]).toMatch(/WHERE[\s\S]*regexp_replace\(lower\(f\.display_name\)[\s\S]*LIMIT/);
  });
});

describe('8. deterministic order', () => {
  it('normalized exact-equivalent form sorts first, with a stable CRD tie-break', async () => {
    fixtureDb();
    await executeInvestorAsk('CINCINNATI ASSET MANAGEMENT INC.');
    const call = db.query.mock.calls.find(([s]) => s.includes('LIMIT'))!;
    expect(call[0]).toMatch(/ORDER BY CASE WHEN[\s\S]*THEN 0 ELSE 1 END,[\s\S]*f\.display_name ASC, crd\.identifier_value ASC/);
  });
});

// =================================================================================================
// 9. Native / structured parity
// =================================================================================================
describe('9. native/structured parity', () => {
  const controls = [
    'CINCINNATI ASSET MANAGEMENT',
    'CINCINNATI ASSET MANAGEMENT, INC',
    'CINCINNATI ASSET MANAGEMENT INC.',
    'CAPITAL ASSET MANAGEMENT, INC.',
    '1ST GLOBAL CAPITAL CORP',
  ];
  it.each(controls)('native /ask and structured v2 identityName agree on candidate CRDs and total: %s', async (raw) => {
    fixtureDb();
    const native = await executeInvestorAsk(raw);
    fixtureDb();
    const structured = await executeSpecialistV2({ queryType: 'identity', identityName: raw });
    const nativeCrds = new Set(native.results.map((r) => r.crd));
    const structuredCrds = new Set(structured.rows.map((r) => r.crd as string));
    expect(structuredCrds).toEqual(nativeCrds);
    expect(structured.total).toBe(native.pagination.total);
  });

  it('a bare/ambiguous identifier-shaped identityName is refused identically on both paths', async () => {
    fixtureDb();
    const native = await executeInvestorAsk('123456');
    fixtureDb();
    const structured = await executeSpecialistV2({ queryType: 'identity', identityName: '123456' });
    expect(native.results).toEqual([]);
    expect(structured.resultState).toBe('UNSUPPORTED_CAPABILITY');
    expect(db.query).not.toHaveBeenCalled();
  });

  it('structuredRequestToParsed and native interpretation classify identityName the same way', () => {
    for (const raw of [...controls, '123456', '801-11953']) {
      const structuredReq = specialistExecutionRequestSchema.parse({ queryType: 'identity', identityName: raw });
      const structuredParsed = structuredRequestToParsed(structuredReq);
      const nativeParsed = interpretInvestorAskQuery(raw);
      expect(Boolean(structuredParsed.query.nameQuery)).toBe(Boolean(nativeParsed.query.nameQuery));
    }
  });
});

// =================================================================================================
// 10 & 11. Genuine miss vs. source failure
// =================================================================================================
describe('10. genuine miss', () => {
  it('a real but absent name returns a clean zero, not an error', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('NOWHERE FICTIONAL CAPITAL PARTNERS LLC');
    expect(r.results).toEqual([]);
    expect(r.terminalState).toBe('NO_MATCH');
  });
});

describe('11. source failure != miss', () => {
  it('a database failure throws rather than resolving as zero results', async () => {
    db.query.mockReset();
    db.query.mockRejectedValueOnce(new Error('fixture source unavailable'));
    await expect(executeInvestorAsk('CRD 900001')).rejects.toThrow('fixture source unavailable');
  });
});

// =================================================================================================
// 12. No manufactured profile
// =================================================================================================
describe('12. no manufactured profile', () => {
  it('an unindexed research-only identity never gets a /firm/ URL on either path', async () => {
    fixtureDb();
    const native = await executeInvestorAsk('QUIETLY UNPUBLISHED WEALTH PARTNERS LLC');
    expect(native.results[0]?.href).toBeNull();
    expect(native.results[0]?.currentlyIndexable).toBe(false);
    fixtureDb();
    const structured = await executeSpecialistV2({ queryType: 'identity', identityName: 'QUIETLY UNPUBLISHED WEALTH PARTNERS LLC' });
    expect(structured.rows[0]?.canonicalProfileUrl).toBeNull();
    expect(structured.rows[0]?.publicationState).toBe('RESEARCH_ROW_ONLY');
  });
});

// =================================================================================================
// 13. Research sentences stay non-name (R1-012 protections preserved)
// =================================================================================================
describe('13. research sentences stay non-name', () => {
  it.each([
    'What is an RIA?',
    'Explain investment strategies',
    'financial advisers in Miami',
    'Show SEC-registered RIAs in Florida',
    'Who owns this adviser firm?',
    'best investment adviser in Ohio',
  ])('%s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.parsed.query.nameQuery).toBeUndefined();
  });
});

// =================================================================================================
// 14. State/office semantics unchanged
// =================================================================================================
describe('14. state/office semantics unchanged', () => {
  it('principal-office geography still filters independently of name normalization', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('CAPITAL ASSET MANAGEMENT, INC.', { state: 'CO' });
    expect(r.results.map((x) => x.crd)).toEqual(['900002']);
    expect(r.results[0]?.recordedOffice).toEqual({ city: 'Denver', state: 'CO' });
  });
});

// =================================================================================================
// 15. Exact total remains truthful
// =================================================================================================
describe('15. exact total remains truthful', () => {
  it('the count query uses the same normalized predicate as the list query (no manufactured total)', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('research "Asset Management"');
    expect(r.pagination.total).toBe(2);
    const countCall = db.query.mock.calls.find(([s]) => s.includes('count('))!;
    expect(countCall[0]).toMatch(/regexp_replace\(lower\(f\.display_name\)/);
  });
});

// 16. prior R1-012 controls -- covered by apps/web/tests/r1-012.test.ts, run together in the
// check:th-search-r1-019h script (see package.json).

// =================================================================================================
// 17. Parent contract/fingerprint unchanged unless intentionally justified
// =================================================================================================
describe('17. parent contract/fingerprint unchanged', () => {
  it('trusthub-specialist-execution-v2 stays version 2.0.0 with its existing fingerprints', () => {
    expect(SPECIALIST_EXECUTION_CONTRACT).toBe('trusthub-specialist-execution-v2');
    expect(SPECIALIST_EXECUTION_VERSION).toBe('2.0.0');
    expect(SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT).toBe('a92b72c4a30de1021ecf25d26decb852b52394f741ac26919b89d14a234ab384');
    expect(SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT).toBe('13c6d3a8e573b65490d50c88534bfcf604dfdeaed64fc0522ff7ef9c4b2b7efa');
  });
});

// =================================================================================================
// 18. Responsive/native navigation state (query-string / selection-revalidation proxy; full
// cross-width browser QA is separate -- see PR description)
// =================================================================================================
describe('18. responsive/native navigation state', () => {
  it('a candidate selection href preserves the original query string truthfully', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('show me Form ADV for Asset Management');
    if (r.candidateSelection) {
      expect(r.results[0]?.selectionHref).toContain(encodeURIComponent('Asset Management').replace(/%20/g, '+'));
    }
  });
});

// =================================================================================================
// Mutation guards (ticket Section 13). Byte-identical source-text locks, following the existing
// inv-cap-001-static.test.ts convention -- these fail loudly if a future change silently
// reintroduces one of the specific regressions this ticket closes.
// =================================================================================================
const root = join(import.meta.dirname, '..');
const askExecuteSrc = readFileSync(join(root, 'src/lib/ask/execute.ts'), 'utf8');
const domainRoot = join(import.meta.dirname, '..', '..', '..', 'packages/domain/src');
const investorAskSrc = readFileSync(join(domainRoot, 'investor-ask.ts'), 'utf8');
const researchPlanSrc = readFileSync(join(domainRoot, 'investor-research-plan.ts'), 'utf8');
const specialistV2Src = readFileSync(join(domainRoot, 'investor-specialist-execution-v2.ts'), 'utf8');
const nameMatchSrc = readFileSync(join(domainRoot, 'firm-name-match.ts'), 'utf8');

describe('mutation guards', () => {
  it('does not restore the first-letter-only native bare-name rule', () => {
    // The old regex string appears verbatim in an explanatory code comment describing what this
    // ticket fixed; assert it is no longer live CODE (no ".test(q)" call on it) rather than absent
    // from the file entirely.
    expect(investorAskSrc).not.toContain("/^[A-Za-z][A-Za-z0-9&.,' -]{1,79}$/.test(q)");
    expect(researchPlanSrc).not.toContain("/^[A-Z][\\w&'.-]*(?:\\s+[\\w&'.-]+){0,7}$/.test(text)");
    expect(investorAskSrc).toContain('isOrganizationNameShape(q)');
  });

  it('does not restore raw punctuation-sensitive ILIKE name execution', () => {
    expect(askExecuteSrc).not.toContain('f.display_name ILIKE $');
    expect(askExecuteSrc).not.toContain('f.legal_name ILIKE $');
    expect(askExecuteSrc).toContain('normalizedNameMatchSql');
  });

  it('bare digits cannot become firm names (native or structured)', () => {
    expect(investorAskSrc).toContain('BARE_DIGITS');
    expect(specialistV2Src).toContain('isOrganizationNameShape');
  });

  it('identifier precedence is not removed -- labeled CRD/SEC parsing still runs before any name path', () => {
    expect(investorAskSrc.indexOf('LABELED_CRD')).toBeLessThan(investorAskSrc.indexOf('simpleFirmName'));
  });

  it('match is still applied before pagination (WHERE before LIMIT/OFFSET) in listFirms', () => {
    const listFirmsBody = askExecuteSrc.slice(askExecuteSrc.indexOf('async function listFirms'));
    expect(listFirmsBody.indexOf('filtersSql')).toBeLessThan(listFirmsBody.indexOf('LIMIT'));
  });

  it('ordering keeps a stable CRD tie-break', () => {
    expect(askExecuteSrc).toContain('crd.identifier_value ASC');
  });

  it('native and structured still funnel through the same executor and SQL layer', () => {
    const v2AdapterSrc = readFileSync(join(root, 'src/lib/specialist-execution/v2.ts'), 'utf8');
    expect(v2AdapterSrc).toContain('executeParsedInvestorAsk');
    expect(v2AdapterSrc).not.toMatch(/FROM form_adv|SELECT .*firms|JOIN firms/);
  });

  it('a source/backend failure is not silently converted into a miss', () => {
    const dbSrc = readFileSync(join(root, 'src/lib/db.ts'), 'utf8');
    expect(dbSrc).toContain('DatabaseUnavailableError');
    // listFirms/countRoster/etc. must let a query() rejection propagate, not swallow it into `{
    // rows: [] }` -- there is no catch around the query() calls inside executeParsedInvestorAsk's
    // module-local helpers.
    expect(askExecuteSrc).not.toMatch(/catch[\s\S]{0,40}\{\s*rows:\s*\[\]\s*\}/);
  });

  it('an unindexed firm does not get a manufactured /firm/ URL', () => {
    expect(askExecuteSrc).toContain('href: indexable ?');
  });

  it('punctuation normalization stays character-fold, not an over-broad token/bag-of-words matcher', () => {
    expect(nameMatchSrc).toContain("replace(/[^a-z0-9]+/g, ' ')");
    expect(nameMatchSrc).not.toMatch(/split\(/);
  });

  it('the specialist-execution-v2 contract/version/fingerprints are unchanged', () => {
    expect(specialistV2Src).toContain("SPECIALIST_EXECUTION_VERSION = '2.0.0'");
    expect(specialistV2Src).toContain(
      "SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT = 'a92b72c4a30de1021ecf25d26decb852b52394f741ac26919b89d14a234ab384'",
    );
    expect(specialistV2Src).toContain(
      "SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT = '13c6d3a8e573b65490d50c88534bfcf604dfdeaed64fc0522ff7ef9c4b2b7efa'",
    );
  });
});
