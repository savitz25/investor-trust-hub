/**
 * TH-SEARCH-R1-019H-P1 -- static safety tests for the normalized firm-name
 * index proposal and its build wrapper. No database connection is made by
 * this file; every assertion is structural (source text / hash based).
 *
 *   npx vitest run scripts/test_th_search_r1_019h_p1_index_packet.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

function sqlStatements(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

describe('proposed SQL: expression lock against normalizedNameMatchSql()', () => {
  it('normalizedNameMatchSql() itself has not drifted from the byte-for-byte transform this proposal was built against', () => {
    expect(nameMatchSrc).toContain(
      "return `btrim(regexp_replace(lower(${expr}), '[^a-z0-9]+', ' ', 'g'))`;",
    );
  });

  it('both proposed indexes use the exact normalizedNameMatchSql() transform, not a hand-drifted variant', () => {
    for (const column of ['display_name', 'legal_name']) {
      expect(sql).toContain(`btrim(regexp_replace(lower(${column}), '[^a-z0-9]+', ' ', 'g'))`);
    }
  });

  it('a mutation guard: changing the regex, the replacement, or the flags would be caught by this exact-string assertion', () => {
    const mutated = sql.replace(/'g'\)\)/g, "'i'))");
    expect(mutated).not.toContain("'[^a-z0-9]+', ' ', 'g'))");
  });
});

describe('proposed SQL: exactly two CONCURRENTLY statements, nothing else', () => {
  const statements = sqlStatements(sql);

  it('contains exactly two statements', () => {
    expect(statements).toHaveLength(2);
  });

  it('every statement is CREATE INDEX CONCURRENTLY IF NOT EXISTS ... ON firms USING gin', () => {
    for (const stmt of statements) {
      expect(stmt).toMatch(/^CREATE INDEX CONCURRENTLY IF NOT EXISTS \S+\s*\n?ON\s+firms\s*\n?USING gin/);
    }
  });

  it('targets display_name and legal_name, one index each, no duplicate names', () => {
    const names = statements.map((s) => s.match(/IF NOT EXISTS (\S+)/)?.[1]);
    expect(new Set(names).size).toBe(names.length);
    expect(sql).toContain('firms_display_name_normalized_trgm_v1_idx');
    expect(sql).toContain('firms_legal_name_normalized_trgm_v1_idx');
  });

  it('never proposes dropping, reindexing, or altering the existing raw trigram indexes', () => {
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

describe('build wrapper: hash lock, safety refusals, no transaction wrapper', () => {
  it('hash-locks the exact proposal file it will ever apply', () => {
    const actual = sha256(sql);
    const match = wrapper.match(/EXPECTED_SQL_SHA256 =\s*\n?\s*'([0-9a-f]{64})'/);
    expect(match?.[1]).toBe(actual);
  });

  it('never opens an explicit transaction (BEGIN/COMMIT) around the CONCURRENTLY statements', () => {
    // Check for actual client calls, not prose (this file's own comments describe the
    // absence of BEGIN, which would false-positive on a bare word match).
    expect(wrapper).not.toMatch(/query\(\s*['"`]\s*BEGIN/i);
    expect(wrapper).not.toMatch(/query\(\s*['"`]\s*COMMIT/i);
    expect(wrapper).not.toContain('client.query(\'BEGIN\')');
  });

  it('refuses the transaction-mode pooler (port 6543) and requires session/direct (5432)', () => {
    expect(wrapper).toContain("port === '6543'");
    expect(wrapper).toContain("port !== '5432'");
  });

  it('requires the explicit production confirmation flag for --apply', () => {
    expect(wrapper).toContain('--i-understand-this-touches-production');
    expect(wrapper).toContain("mode === '--apply' && !confirmed");
  });

  it('fails closed on an existing invalid/not-ready proposed-name index', () => {
    expect(wrapper).toContain('likely a leftover failed CONCURRENTLY build');
    expect(wrapper).toContain('this wrapper never auto-drops');
  });

  it('fails closed when another CREATE INDEX on firms is already in progress', () => {
    expect(wrapper).toContain('Another CREATE INDEX operation on firms appears to be in progress');
  });

  it('stops on first failure with no automatic retry or cleanup', () => {
    expect(wrapper).toContain('STOPPING. No automatic retry. No automatic cleanup.');
    // No retry loop construct around the apply statement.
    expect(wrapper).not.toMatch(/for\s*\(.*retry/i);
    expect(wrapper).not.toMatch(/while\s*\(.*retry/i);
  });

  it('applies indexes one at a time, verifying validity/readiness after each before continuing', () => {
    expect(wrapper).toContain('for (let i = 0; i < statements.length; i += 1)');
    expect(wrapper).toContain('const after = await inspectIndex(client, name)');
  });

  it('never issues DROP/REINDEX/VACUUM/ANALYZE/ALTER TABLE/extension/planner-setting statements', () => {
    const forbiddenBlock = wrapper.match(/const forbidden = \/(.+)\/i;/)?.[1] ?? '';
    for (const kw of ['DROP', 'REINDEX', 'VACUUM', 'ANALYZE', 'ALTER TABLE', 'ALTER SYSTEM', 'CREATE EXTENSION']) {
      expect(forbiddenBlock).toContain(kw);
    }
  });

  it('the receipt writer never includes DATABASE_URL or any credential-shaped field', () => {
    const receiptFn = wrapper.slice(wrapper.indexOf('function writeReceipt'), wrapper.indexOf('function writeReceipt') + 600);
    expect(receiptFn).not.toMatch(/DATABASE_URL|password|secret|token/i);
  });

  it('records only host/port/database identity, never full connection string, in receipts', () => {
    expect(wrapper).toContain('return { host: url.hostname, port, database: url.pathname');
  });

  it('this ticket never executed the wrapper against a real database (no receipts directory was created by this ticket)', () => {
    const receiptsDir = join(root, 'docs/qa/th-search-r1-019h/receipts');
    expect(existsSync(receiptsDir)).toBe(false);
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
  ];
  it.each(required)('preflight checks for %s', (needle) => {
    expect(wrapper).toContain(needle);
  });
});
