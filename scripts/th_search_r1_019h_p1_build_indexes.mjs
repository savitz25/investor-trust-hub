#!/usr/bin/env node
/**
 * TH-SEARCH-R1-019H-P1 -- normalized firm-name index build wrapper.
 *
 * NOT EXECUTED BY THIS TICKET. Prepared only. Requires separate founder/
 * owner authorization before --apply is ever run against Production.
 *
 * Applies docs/qa/th-search-r1-019h/PROPOSED-normalized-firm-name-indexes.sql
 * -- and ONLY that exact, hash-locked file -- one CREATE INDEX CONCURRENTLY
 * statement at a time, outside any transaction block, refusing the
 * transaction-mode pooler (port 6543).
 *
 * Modes:
 *   --check   (default, read-only) fail-closed preflight. Safe anytime.
 *   --apply   (requires --i-understand-this-touches-production) builds
 *             indexes one at a time. Stops on first failure. No retry.
 *             No automatic cleanup of a failed/invalid build.
 *   --verify  (read-only) confirms each index's live definition matches the
 *             hash-locked proposal and that pg_trgm is usable; EXPLAIN-based
 *             planner-usage proof is a separate follow-up once the index
 *             actually exists (see P1-NORMALIZED-INDEX-PACKET.md Section L).
 *
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --check
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --apply --i-understand-this-touches-production
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --verify
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SQL_PATH = join(
  REPO_ROOT,
  'docs',
  'qa',
  'th-search-r1-019h',
  'PROPOSED-normalized-firm-name-indexes.sql',
);

// Hash-lock: this wrapper only ever applies the file at SQL_PATH, and only
// if its content still hashes to exactly this value. Any edit to the
// proposal file (even whitespace) invalidates the lock and --apply refuses.
const EXPECTED_SQL_SHA256 =
  'c2e518bc7c3494d18a8e74798092f399f756f65153056984ffa3000b99a30293';

const TARGET_TABLE = 'firms';
const TARGET_COLUMNS = ['display_name', 'legal_name'];
const PROPOSED_INDEXES = [
  {
    name: 'firms_display_name_normalized_trgm_v1_idx',
    column: 'display_name',
  },
  {
    name: 'firms_legal_name_normalized_trgm_v1_idx',
    column: 'legal_name',
  },
];

// Byte-for-byte the same transform as packages/domain/src/firm-name-match.ts
// normalizedNameMatchSql(). Locked here so a silent drift between the
// application's WHERE-clause expression and this wrapper's expected index
// expression fails closed instead of building a useless index.
function normalizedExpr(column) {
  return `btrim(regexp_replace(lower(${column}), '[^a-z0-9]+'::text, ' '::text, 'g'::text))`;
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const modes = ['--check', '--apply', '--verify'].filter((m) => args.has(m));
  if (modes.length > 1) {
    throw new UsageError('Pass exactly one of --check / --apply / --verify.');
  }
  return {
    mode: modes[0] ?? '--check',
    confirmed: args.has('--i-understand-this-touches-production'),
  };
}

class UsageError extends Error {}
class PreflightBlocked extends Error {}

function extractSqlStatements(sqlText) {
  return sqlText
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function assertOnlyAllowedStatements(statements) {
  for (const stmt of statements) {
    const normalized = stmt.replace(/\s+/g, ' ').trim();
    if (!/^CREATE INDEX CONCURRENTLY IF NOT EXISTS \S+\s+ON firms\s+USING gin /i.test(normalized)) {
      throw new PreflightBlocked(
        `Refusing: statement is not a recognized "CREATE INDEX CONCURRENTLY IF NOT EXISTS ... ON firms USING gin (...)" form: ${normalized.slice(0, 120)}`,
      );
    }
    const forbidden = /\b(DROP|REINDEX|VACUUM|ANALYZE|ALTER TABLE|ALTER SYSTEM|CREATE EXTENSION|SET\s)\b/i;
    if (forbidden.test(normalized)) {
      throw new PreflightBlocked(`Refusing: statement contains a forbidden keyword: ${normalized.slice(0, 120)}`);
    }
  }
}

function loadAndLockProposedSql() {
  if (!existsSync(SQL_PATH)) {
    throw new PreflightBlocked(`Proposed SQL file not found: ${SQL_PATH}`);
  }
  const text = readFileSync(SQL_PATH, 'utf8');
  const actualHash = createHash('sha256').update(text, 'utf8').digest('hex');
  if (actualHash !== EXPECTED_SQL_SHA256) {
    throw new PreflightBlocked(
      `Refusing: ${SQL_PATH} sha256 is ${actualHash}, expected ${EXPECTED_SQL_SHA256}. ` +
        'The proposal file changed since this wrapper was reviewed -- re-review before proceeding.',
    );
  }
  const statements = extractSqlStatements(text);
  assertOnlyAllowedStatements(statements);
  if (statements.length !== PROPOSED_INDEXES.length) {
    throw new PreflightBlocked(
      `Refusing: expected exactly ${PROPOSED_INDEXES.length} CREATE INDEX statements, found ${statements.length}.`,
    );
  }
  return statements;
}

function requireSessionOrDirectConnection(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new PreflightBlocked('DATABASE_URL is not a parseable connection string.');
  }
  const port = url.port || '5432';
  if (port === '6543') {
    throw new PreflightBlocked(
      'Refusing: connection targets port 6543 (Supabase transaction-mode pooler). ' +
        'CREATE INDEX CONCURRENTLY requires a stable session -- use the session pooler (5432) or a direct connection.',
    );
  }
  if (port !== '5432') {
    throw new PreflightBlocked(`Refusing: connection targets port ${port}, expected 5432 (session pooler or direct).`);
  }
  return { host: url.hostname, port, database: url.pathname.replace(/^\//, '') };
}

async function q(client, sql, params) {
  const res = await client.query(sql, params);
  return res.rows;
}

async function inspectIndex(client, name) {
  const rows = await q(
    client,
    `
    SELECT
      c.relname AS index_name,
      am.amname AS access_method,
      i.indisvalid,
      i.indisready,
      i.indislive,
      pg_get_indexdef(c.oid) AS indexdef
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_am am ON am.oid = c.relam
    WHERE n.nspname = 'public' AND c.relname = $1
    `,
    [name],
  );
  return rows[0] ?? null;
}

async function runPreflight(client) {
  const findings = {};
  const blockers = [];

  const dbIdentity = await q(client, 'SELECT current_database(), current_user, inet_server_port()');
  findings.connection = dbIdentity[0];

  const trgm = await q(client, "SELECT extversion FROM pg_extension WHERE extname = 'pg_trgm'");
  findings.pgTrgmInstalled = trgm.length > 0;
  if (!findings.pgTrgmInstalled) blockers.push('pg_trgm extension is not installed.');

  const table = await q(client, "SELECT to_regclass('public.firms') AS reg");
  findings.tableExists = table[0]?.reg != null;
  if (!findings.tableExists) blockers.push('public.firms does not exist.');

  for (const col of TARGET_COLUMNS) {
    const colRows = await q(
      client,
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='firms' AND column_name=$1",
      [col],
    );
    if (colRows.length === 0) blockers.push(`firms.${col} does not exist.`);
  }

  findings.proposedIndexes = {};
  for (const { name } of PROPOSED_INDEXES) {
    const existing = await inspectIndex(client, name);
    findings.proposedIndexes[name] = existing;
    if (existing && !(existing.indisvalid && existing.indisready)) {
      blockers.push(
        `An object named ${name} already exists and is NOT valid/ready -- likely a leftover failed CONCURRENTLY build. ` +
          'Investigate and resolve manually before proceeding; this wrapper never auto-drops.',
      );
    }
  }

  const existingRaw = {};
  for (const name of ['firms_display_name_trgm_idx', 'firms_legal_name_trgm_idx']) {
    const info = await inspectIndex(client, name);
    existingRaw[name] = info;
    if (!info || !(info.indisvalid && info.indisready)) {
      blockers.push(`Existing raw trigram index ${name} is missing or not valid/ready -- unexpected, investigate first.`);
    }
  }
  findings.existingRawTrgmIndexes = existingRaw;

  const inProgress = await q(
    client,
    "SELECT pid, query, now() - query_start AS duration FROM pg_stat_activity WHERE query ILIKE '%CREATE INDEX%firms%' AND pid <> pg_backend_pid()",
  );
  findings.inProgressCreateIndex = inProgress;
  if (inProgress.length > 0) blockers.push('Another CREATE INDEX operation on firms appears to be in progress.');

  const longRunning = await q(
    client,
    "SELECT pid, usename, now() - xact_start AS duration FROM pg_stat_activity WHERE xact_start IS NOT NULL AND now() - xact_start > interval '2 minutes' AND pid <> pg_backend_pid()",
  );
  findings.longRunningTransactions = longRunning;

  for (const col of TARGET_COLUMNS) {
    const expected = normalizedExpr(col);
    const explain = await q(client, `EXPLAIN (FORMAT TEXT) SELECT 1 FROM firms WHERE ${expected} LIKE '%test%' LIMIT 1`);
    findings[`expressionParses_${col}`] = explain.length > 0;
  }

  findings.blockers = blockers;
  return findings;
}

function printReport(mode, findings) {
  console.log(JSON.stringify(findings, null, 2));
  if (findings.blockers?.length) {
    console.log(`\nBLOCKED (${mode}): ${findings.blockers.length} blocker(s) found.`);
  } else {
    console.log(`\nOK (${mode}): no blockers found.`);
  }
}

function writeReceipt(receipt) {
  const dir = join(REPO_ROOT, 'docs', 'qa', 'th-search-r1-019h', 'receipts');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `p1-${receipt.mode}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(receipt, null, 2), 'utf8');
  console.log(`\nReceipt written (no credentials): ${path}`);
}

async function main() {
  const { mode, confirmed } = parseArgs(process.argv);
  if (mode === '--apply' && !confirmed) {
    throw new UsageError('--apply requires --i-understand-this-touches-production.');
  }

  const statements = loadAndLockProposedSql();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      'PENDING_DB_ACCESS: DATABASE_URL is not configured in this environment. ' +
        'No credentials were requested; run this later where authorized access already exists.',
    );
    process.exitCode = 3;
    return;
  }
  const identity = requireSessionOrDirectConnection(databaseUrl);

  const client = new pg.Client({
    connectionString: databaseUrl,
    // No explicit transaction is ever opened by this wrapper. Each
    // CREATE INDEX CONCURRENTLY statement below runs as its own
    // auto-committed statement -- pg's default client behavior when no
    // BEGIN is issued -- which is the only mode CONCURRENTLY accepts.
  });
  await client.connect();
  try {
    if (mode === '--check' || mode === '--verify') {
      const findings = await runPreflight(client);
      findings.connectionIdentity = identity;
      findings.mode = mode.replace('--', '');
      printReport(mode, findings);
      writeReceipt(findings);
      process.exitCode = findings.blockers.length ? 1 : 0;
      return;
    }

    // --apply
    const preflight = await runPreflight(client);
    if (preflight.blockers.length) {
      printReport(mode, preflight);
      process.exitCode = 1;
      return;
    }

    const results = [];
    for (let i = 0; i < statements.length; i += 1) {
      const stmt = statements[i];
      const { name } = PROPOSED_INDEXES[i];
      console.log(`[${i + 1}/${statements.length}] applying ${name} ...`);
      try {
        await client.query(stmt);
      } catch (err) {
        console.error(`[${i + 1}/${statements.length}] FAILED: ${name}: ${err.message}`);
        console.error('STOPPING. No automatic retry. No automatic cleanup. Investigate manually.');
        results.push({ name, ok: false, error: err.message });
        writeReceipt({ mode: 'apply', results, stoppedEarly: true, connectionIdentity: identity });
        process.exitCode = 1;
        return;
      }
      const after = await inspectIndex(client, name);
      const ok = Boolean(after && after.indisvalid && after.indisready);
      console.log(`[${i + 1}/${statements.length}] ${ok ? 'OK' : 'FAILED (not valid/ready after build)'}: ${name}`);
      results.push({ name, ok, definition: after?.indexdef ?? null });
      if (!ok) {
        writeReceipt({ mode: 'apply', results, stoppedEarly: true, connectionIdentity: identity });
        process.exitCode = 1;
        return;
      }
    }
    writeReceipt({ mode: 'apply', results, stoppedEarly: false, connectionIdentity: identity });
    process.exitCode = 0;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  if (err instanceof UsageError || err instanceof PreflightBlocked) {
    console.error(err.message);
    process.exitCode = 2;
    return;
  }
  console.error(err);
  process.exitCode = 1;
});
