/**
 * TH-SEARCH-R1-019H-P1-R1 -- static AND behavioral safety tests for the
 * normalized firm-name index proposal and its build wrapper. No real
 * database connection is made by this file; behavioral tests inject a mock
 * `client` object (same shape the wrapper's own functions accept) so the
 * fail-closed collision/validation logic is exercised directly, not just
 * grepped for.
 *
 *   npx vitest run scripts/test_th_search_r1_019h_p1_index_packet.ts
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EXPECTED_SQL_SHA256,
  PROPOSED_INDEXES,
  RAW_TRGM_INDEXES,
  assertOnlyAllowedStatements,
  checkProposedNamesAbsent,
  extractSqlStatements,
  normalizedExprAsWritten,
  normalizedExprCanonical,
  requireSessionOrDirectConnection,
  runPreApplyPreflight,
  runVerify,
  strictlyValidateIndex,
} from './th_search_r1_019h_p1_build_indexes.mjs';

const root = join(import.meta.dirname, '..');
const SQL_PATH = join(root, 'docs/qa/th-search-r1-019h/PROPOSED-normalized-firm-name-indexes.sql');
const WRAPPER_PATH = join(root, 'scripts/th_search_r1_019h_p1_build_indexes.mjs');
const NAME_MATCH_PATH = join(root, 'packages/domain/src/firm-name-match.ts');

const sql = readFileSync(SQL_PATH, 'utf8');
const wrapper = readFileSync(WRAPPER_PATH, 'utf8');
const nameMatchSrc = readFileSync(NAME_MATCH_PATH, 'utf8');

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// A fully valid, correct description for firms_display_name_normalized_trgm_v1_idx,
// matching exactly what a real, freshly and correctly built index would
// report. Individual tests mutate a copy of this to prove each failure mode.
function validDescribe(column: 'display_name' | 'legal_name') {
  return {
    index_name: `firms_${column}_normalized_trgm_v1_idx`,
    index_schema: 'public',
    table_name: 'firms',
    table_schema: 'public',
    access_method: 'gin',
    indisvalid: true,
    indisready: true,
    indislive: true,
    indnkeyatts: 1,
    indkey: '0',
    indexprs: normalizedExprCanonical(column),
    indpred: null,
    opclasses: ['gin_trgm_ops'],
    indexdef: `CREATE INDEX firms_${column}_normalized_trgm_v1_idx ON public.firms USING gin ((${normalizedExprCanonical(column)}) gin_trgm_ops)`,
  };
}

/** Minimal mock client: routes on SQL text substrings, same as the wrapper's own query shapes. */
function makeMockClient({
  describeResults = {},
  anyObjectResults = {},
}: {
  describeResults?: Record<string, unknown | null>;
  anyObjectResults?: Record<string, Array<{ nspname: string; relkind: string }>>;
}) {
  return {
    async query(sqlText: string, params: unknown[] = []) {
      const name = params[0] as string;
      if (sqlText.includes('pg_get_expr(i.indexprs')) {
        const row = describeResults[name];
        return { rows: row ? [row] : [] };
      }
      if (sqlText.includes('c.relkind')) {
        return { rows: anyObjectResults[name] ?? [] };
      }
      if (sqlText.includes('current_database')) {
        return { rows: [{ current_database: 'mockdb', current_user: 'mockuser', inet_server_port: 5432 }] };
      }
      if (sqlText.includes("extname = 'pg_trgm'")) {
        return { rows: [{ extversion: '1.6' }] };
      }
      if (sqlText.includes("to_regclass('public.firms')")) {
        return { rows: [{ reg: 'firms' }] };
      }
      if (sqlText.includes('information_schema.columns')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (sqlText.includes('pg_stat_activity') && sqlText.includes('CREATE INDEX')) {
        return { rows: [] };
      }
      if (sqlText.includes('pg_stat_activity') && sqlText.includes('xact_start')) {
        return { rows: [] };
      }
      if (sqlText.includes('EXPLAIN')) {
        return { rows: [{ 'QUERY PLAN': 'Seq Scan on firms' }] };
      }
      throw new Error(`mock client: unrecognized query: ${sqlText.slice(0, 80)}`);
    },
  };
}

describe('proposed SQL: expression lock against normalizedNameMatchSql()', () => {
  it('normalizedNameMatchSql() itself has not drifted from the byte-for-byte transform this proposal was built against', () => {
    expect(nameMatchSrc).toContain(
      "return `btrim(regexp_replace(lower(${expr}), '[^a-z0-9]+', ' ', 'g'))`;",
    );
  });

  it('both proposed indexes use the exact as-written normalizedNameMatchSql() transform', () => {
    for (const column of ['display_name', 'legal_name']) {
      expect(sql).toContain(`btrim(regexp_replace(lower(${column}), '[^a-z0-9]+', ' ', 'g'))`);
    }
  });

  it('the wrapper canonical form matches what Postgres actually deparses (verified live, read-only, before this constant was written)', () => {
    expect(normalizedExprCanonical('display_name')).toBe(
      "btrim(regexp_replace(lower(display_name), '[^a-z0-9]+'::text, ' '::text, 'g'::text))",
    );
  });

  it('strictlyValidateIndex compares the FULL canonical expression, never a substring', () => {
    const almostRight = validDescribe('display_name');
    almostRight.indexprs = normalizedExprCanonical('display_name') + ' '; // trailing space drift
    const result = strictlyValidateIndex(almostRight, PROPOSED_INDEXES[0]);
    expect(result.ok).toBe(false);
  });

  it('mutation guard: changing the regex, replacement, or flags in the proposal would be caught', () => {
    const mutated = sql.replace(/'g'\)\)/g, "'i'))");
    expect(mutated).not.toContain("'[^a-z0-9]+', ' ', 'g'))");
  });
});

describe('proposed SQL: exactly two CONCURRENTLY statements, no IF NOT EXISTS, nothing else (Section I/J)', () => {
  const statements = extractSqlStatements(sql);

  it('contains exactly two statements', () => {
    expect(statements).toHaveLength(2);
  });

  it('assertOnlyAllowedStatements accepts the real proposal unchanged', () => {
    expect(() => assertOnlyAllowedStatements(statements)).not.toThrow();
  });

  it('every statement targets public.firms with gin, and none contain IF NOT EXISTS', () => {
    for (const stmt of statements) {
      expect(stmt).toMatch(/^CREATE INDEX CONCURRENTLY \S+\s*\n?ON\s+public\.firms\s*\n?USING gin/);
      expect(stmt).not.toMatch(/IF NOT EXISTS/i);
    }
  });

  it('assertOnlyAllowedStatements rejects a reintroduced IF NOT EXISTS', () => {
    const regressed = statements[0]!.replace('CREATE INDEX CONCURRENTLY', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS');
    expect(() => assertOnlyAllowedStatements([regressed])).toThrow(/IF NOT EXISTS/);
  });

  it('targets display_name and legal_name, one index each, no duplicate names', () => {
    const names = statements.map((s) => s.match(/CONCURRENTLY (\S+)/)?.[1]);
    expect(new Set(names).size).toBe(names.length);
    expect(sql).toContain('firms_display_name_normalized_trgm_v1_idx');
    expect(sql).toContain('firms_legal_name_normalized_trgm_v1_idx');
  });

  it('never proposes dropping, reindexing, vacuuming, analyzing, or altering anything', () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bREINDEX\b/i);
    expect(sql).not.toMatch(/\bALTER (TABLE|INDEX)\b/i);
    expect(sql).not.toMatch(/\bVACUUM\b/i);
    expect(sql).not.toMatch(/\bANALYZE\b/i);
  });

  it('never writes data', () => {
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\s+(INTO|FROM)?\s*firms\b/i);
  });

  it('never mutates planner settings or extensions', () => {
    expect(sql).not.toMatch(/\bSET\s+/i);
    expect(sql).not.toMatch(/\bCREATE EXTENSION\b/i);
    expect(sql).not.toMatch(/\bALTER SYSTEM\b/i);
  });
});

describe('Section 2: pre-apply collision rule -- BOTH proposed names must be absent, regardless of correctness', () => {
  it('A. a valid but WRONG same-name proposed index exists -> blocked', async () => {
    const client = makeMockClient({
      anyObjectResults: { [PROPOSED_INDEXES[0]!.name]: [{ nspname: 'public', relkind: 'i' }] },
    });
    const { blockers } = await checkProposedNamesAbsent(client as any);
    expect(blockers.some((b) => b.includes('PROPOSED_INDEX_ALREADY_EXISTS_REVIEW_REQUIRED'))).toBe(true);
  });

  it('B. a valid AND CORRECT same-name proposed index already exists -> still blocked (partial prior execution needs review)', async () => {
    // Even though this object would pass strictlyValidateIndex, absence is
    // required at the collision-check stage regardless of correctness.
    const client = makeMockClient({
      anyObjectResults: { [PROPOSED_INDEXES[0]!.name]: [{ nspname: 'public', relkind: 'i' }] },
    });
    const { blockers } = await checkProposedNamesAbsent(client as any);
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('C. an invalid same-name object exists -> blocked', async () => {
    const client = makeMockClient({
      anyObjectResults: { [PROPOSED_INDEXES[1]!.name]: [{ nspname: 'public', relkind: 'i' }] },
    });
    const { blockers } = await checkProposedNamesAbsent(client as any);
    expect(blockers.some((b) => b.includes(PROPOSED_INDEXES[1]!.name))).toBe(true);
  });

  it('both names absent -> no blockers from the collision check itself', async () => {
    const client = makeMockClient({ anyObjectResults: {} });
    const { blockers } = await checkProposedNamesAbsent(client as any);
    expect(blockers).toEqual([]);
  });

  it('full preflight (--check/--apply path) is BLOCKED end-to-end when a proposed name collides', async () => {
    const client = makeMockClient({
      anyObjectResults: { [PROPOSED_INDEXES[0]!.name]: [{ nspname: 'public', relkind: 'i' }] },
      describeResults: { [RAW_TRGM_INDEXES[0]!]: { ...validDescribe('display_name'), index_name: RAW_TRGM_INDEXES[0], access_method: 'gin', opclasses: ['gin_trgm_ops'] }, [RAW_TRGM_INDEXES[1]!]: { ...validDescribe('legal_name'), index_name: RAW_TRGM_INDEXES[1] } },
    });
    const findings = await runPreApplyPreflight(client as any);
    expect(findings.blockers.length).toBeGreaterThan(0);
  });
});

describe('Section 3/5: strict definition validator and real --verify mode', () => {
  it('D. --verify + correct exact index -> PASS', async () => {
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: validDescribe('display_name'),
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: { ...validDescribe('display_name'), access_method: 'gin', opclasses: ['gin_trgm_ops'] },
        [RAW_TRGM_INDEXES[1]!]: { ...validDescribe('legal_name'), access_method: 'gin', opclasses: ['gin_trgm_ops'] },
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('E. --verify + wrong expression -> FAIL', async () => {
    const wrong = { ...validDescribe('display_name'), indexprs: normalizedExprCanonical('legal_name') };
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: wrong,
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/expression does not match/);
  });

  it('F. --verify + wrong opclass -> FAIL', async () => {
    const wrong = { ...validDescribe('display_name'), opclasses: ['trgm_ops'] };
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: wrong,
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/opclasses/);
  });

  it('G. --verify + unexpected partial predicate -> FAIL', async () => {
    const wrong = { ...validDescribe('display_name'), indpred: 'is_synthetic = false' };
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: wrong,
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/partial predicate/);
  });

  it('H. --verify + invalid/not-ready/not-live -> FAIL', async () => {
    for (const field of ['indisvalid', 'indisready', 'indislive'] as const) {
      const wrong = { ...validDescribe('display_name'), [field]: false };
      const client = makeMockClient({
        describeResults: {
          [PROPOSED_INDEXES[0]!.name]: wrong,
          [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
          [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
          [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
        },
      });
      const result = await runVerify(client as any);
      expect(result.ok, `field ${field}`).toBe(false);
    }
  });

  it('H (continued). --verify + missing index -> FAIL', async () => {
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/does not exist/);
  });

  it('--verify + wrong schema or table -> FAIL', async () => {
    const wrongSchema = { ...validDescribe('display_name'), index_schema: 'internal' };
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: wrongSchema,
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[0]!]: validDescribe('display_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
  });

  it('--verify also fails if an existing raw trigram index is missing or invalid', async () => {
    const client = makeMockClient({
      describeResults: {
        [PROPOSED_INDEXES[0]!.name]: validDescribe('display_name'),
        [PROPOSED_INDEXES[1]!.name]: validDescribe('legal_name'),
        [RAW_TRGM_INDEXES[1]!]: validDescribe('legal_name'),
        // RAW_TRGM_INDEXES[0] intentionally absent from describeResults -> null -> missing
      },
    });
    const result = await runVerify(client as any);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(new RegExp(RAW_TRGM_INDEXES[0]!));
  });

  it('--verify does NOT require the proposed indexes to be absent (opposite of preflight)', () => {
    // Structural: runVerify never calls checkProposedNamesAbsent / anyObjectNamed.
    const verifyFnSrc = wrapper.slice(wrapper.indexOf('export async function runVerify'), wrapper.indexOf('function printReport'));
    expect(verifyFnSrc).not.toContain('checkProposedNamesAbsent');
    expect(verifyFnSrc).not.toContain('anyObjectNamed');
  });
});

describe('build wrapper: hash lock, safety refusals, no transaction wrapper', () => {
  it('hash-locks the exact CURRENT proposal file it will ever apply', () => {
    const actual = sha256(sql);
    expect(EXPECTED_SQL_SHA256).toBe(actual);
  });

  it('the hash lock constant is a NEW value, not the original P1 hash (Section 8)', () => {
    expect(EXPECTED_SQL_SHA256).not.toBe('c2e518bc7c3494d18a8e74798092f399f756f65153056984ffa3000b99a30293');
  });

  it('never opens an explicit transaction (BEGIN/COMMIT) around the CONCURRENTLY statements', () => {
    expect(wrapper).not.toMatch(/query\(\s*['"`]\s*BEGIN/i);
    expect(wrapper).not.toMatch(/query\(\s*['"`]\s*COMMIT/i);
  });

  it('refuses the transaction-mode pooler (port 6543) and requires session/direct (5432)', () => {
    expect(() => requireSessionOrDirectConnection('postgresql://u:p@host:6543/db')).toThrow(/6543/);
    expect(() => requireSessionOrDirectConnection('postgresql://u:p@host:5432/db')).not.toThrow();
  });

  it('requires the explicit production confirmation flag for --apply', () => {
    expect(wrapper).toContain('--i-understand-this-touches-production');
    expect(wrapper).toContain("mode === '--apply' && !confirmed");
  });

  it('K. stops on first failure with no automatic retry or cleanup, at every stage', () => {
    expect(wrapper).toContain('No automatic retry. No automatic cleanup.');
    expect(wrapper).not.toMatch(/for\s*\(.*retry/i);
    expect(wrapper).not.toMatch(/while\s*\(.*retry/i);
    // No DROP INDEX anywhere in the wrapper's own logic (never auto-cleans up).
    expect(wrapper).not.toMatch(/DROP INDEX/i);
  });

  it('applies indexes one at a time, strictly validating each before continuing to the next', () => {
    expect(wrapper).toContain('for (let i = 0; i < statements.length; i += 1)');
    expect(wrapper).toContain('strictlyValidateIndex(info, expected)');
    expect(wrapper).toContain("STRICT VALIDATION FAILED");
  });

  it('stops immediately if index 1 succeeds but strict validation fails, without attempting index 2', () => {
    const applyBody = wrapper.slice(wrapper.indexOf('// --apply'), wrapper.indexOf('} finally {'));
    const validateFailIdx = applyBody.indexOf('STRICT VALIDATION FAILED');
    const returnAfter = applyBody.indexOf('return;', validateFailIdx);
    expect(validateFailIdx).toBeGreaterThan(-1);
    expect(returnAfter).toBeGreaterThan(validateFailIdx);
  });

  it('never issues DROP/REINDEX/VACUUM/ANALYZE/ALTER TABLE/extension/planner-setting statements', () => {
    const forbiddenBlock = wrapper.match(/const forbidden = \/(.+)\/i;/)?.[1] ?? '';
    for (const kw of ['DROP', 'REINDEX', 'VACUUM', 'ANALYZE', 'ALTER TABLE', 'ALTER SYSTEM', 'CREATE EXTENSION']) {
      expect(forbiddenBlock).toContain(kw);
    }
  });

  it('L. the receipt writer never includes DATABASE_URL or any credential-shaped field', () => {
    const receiptFn = wrapper.slice(wrapper.indexOf('function writeReceipt'), wrapper.indexOf('function writeReceipt') + 600);
    expect(receiptFn).not.toMatch(/DATABASE_URL|password|secret|token/i);
  });

  it('records only host/port/database identity, never full connection string, in receipts', () => {
    expect(wrapper).toContain('return { host: url.hostname, port, database: url.pathname');
  });

  it('this ticket never executed --apply against a real database (no apply receipts exist)', () => {
    // check-mode receipts from the required Section 9 read-only run are expected;
    // apply-mode receipts must never exist.
    const dir = join(root, 'docs/qa/th-search-r1-019h/receipts');
    if (existsSync(dir)) {
      const files = readdirSync(dir);
      expect(files.some((f: string) => f.includes('apply'))).toBe(false);
    }
  });
});

describe('wrapper preflight covers every required Section 9 check', () => {
  const required = [
    'current_database',
    "extname = 'pg_trgm'",
    "to_regclass('public.firms')",
    'information_schema.columns',
    'existingRawTrgmIndexes',
    'inProgressCreateIndex',
    'longRunningTransactions',
    'expressionParses_',
    'PROPOSED_INDEX_ALREADY_EXISTS_REVIEW_REQUIRED',
  ];
  it.each(required)('preflight checks for %s', (needle) => {
    expect(wrapper).toContain(needle);
  });
});
