/**
 * TH-SEARCH-R1-019H-P1-R1 -- normalized firm-name index build wrapper.
 *
 * Invoke as `node scripts/th_search_r1_019h_p1_build_indexes.mjs <mode>`
 * (no shebang: this module is also statically imported by
 * test_th_search_r1_019h_p1_index_packet.ts for behavioral testing, and a
 * leading shebang breaks Vite's import-analysis transform for a file with
 * real package imports -- verified empirically, not assumed).
 *
 * NOT EXECUTED AGAINST PRODUCTION DDL BY THIS TICKET. --check (read-only)
 * was run once against the real, connected database as part of this
 * ticket's own required Section 9 verification -- see
 * docs/qa/th-search-r1-019h/P1-R1-PROD-READONLY-CHECK.md. --apply was never
 * run. Requires separate founder/owner authorization before --apply is ever
 * run against Production.
 *
 * Applies docs/qa/th-search-r1-019h/PROPOSED-normalized-firm-name-indexes.sql
 * -- and ONLY that exact, hash-locked file -- one CREATE INDEX CONCURRENTLY
 * statement at a time, outside any transaction block, refusing the
 * transaction-mode pooler (port 6543).
 *
 * P1-R1 corrections over the original P1 wrapper (coordinator review):
 *   1. The proposed SQL no longer uses IF NOT EXISTS. A same-name object
 *      appearing between preflight and CREATE must fail the CREATE itself,
 *      never be silently skipped.
 *   2. --check / --apply preflight now blocks if EITHER proposed index name
 *      already exists as ANY object, regardless of valid/invalid/ready --
 *      a previous partial execution is a separate recovery state that must
 *      never be silently resumed by this wrapper.
 *   3. A single reusable strict definition validator now checks schema,
 *      table, access method, opclass, exact canonical expression (including
 *      Postgres's own ::text deparse casts), absence of a partial predicate,
 *      single-expression shape, and valid/ready/live -- for both --apply's
 *      post-create validation and --verify.
 *   4. --verify now has its own semantics, separate from preflight: it
 *      REQUIRES both proposed indexes to exist and strictly validates each,
 *      plus confirms the existing raw trigram indexes are still present and
 *      valid. It no longer reuses the absence-requiring preflight.
 *
 * Modes:
 *   --check   (default, read-only) fail-closed pre-apply preflight. Safe
 *             anytime. Requires BOTH proposed index names to be ABSENT.
 *   --apply   (requires --i-understand-this-touches-production) builds
 *             indexes one at a time, strictly validating each immediately
 *             after its own CREATE returns. Stops on first failure. No
 *             retry. No automatic cleanup of a failed/invalid/partial build.
 *   --verify  (read-only) REQUIRES both proposed indexes to already exist
 *             and strictly validates each; also confirms the existing raw
 *             trigram indexes remain present and valid.
 *
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --check
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --apply --i-understand-this-touches-production
 *   node scripts/th_search_r1_019h_p1_build_indexes.mjs --verify
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
// proposal file (even whitespace) invalidates the lock and every mode
// refuses before connecting.
export const EXPECTED_SQL_SHA256 =
  '717890384c16dc0bde162710eddd4b77ca0dc0e676638b497fa9167b1202d12e';

const TARGET_SCHEMA = 'public';
const TARGET_TABLE = 'firms';
const TARGET_COLUMNS = ['display_name', 'legal_name'];

// Byte-for-byte the same transform as packages/domain/src/firm-name-match.ts
// normalizedNameMatchSql(). Locked here so a silent drift between the
// application's WHERE-clause expression and this wrapper's expected index
// expression fails closed instead of building a useless (or worse,
// misleading) index.
export function normalizedExprAsWritten(column) {
  return `btrim(regexp_replace(lower(${column}), '[^a-z0-9]+', ' ', 'g'))`;
}

// The CANONICAL form pg_get_expr()/ruleutils deparses this exact expression
// to on this database's Postgres version -- string-literal arguments to
// regexp_replace() are resolved from `unknown` to `text` and printed with an
// explicit `::text` cast. Verified empirically via
// `EXPLAIN (VERBOSE) SELECT btrim(regexp_replace(lower(<col>), ...))`
// against the real, connected database (read-only) before writing this
// constant -- never assumed. pg_get_expr(indexprs, indrelid) on a live
// expression index uses the identical deparser, so this is the exact string
// the strict validator must compare against, not the as-written SQL text.
export function normalizedExprCanonical(column) {
  return `btrim(regexp_replace(lower(${column}), '[^a-z0-9]+'::text, ' '::text, 'g'::text))`;
}

export const PROPOSED_INDEXES = [
  {
    name: 'firms_display_name_normalized_trgm_v1_idx',
    column: 'display_name',
  },
  {
    name: 'firms_legal_name_normalized_trgm_v1_idx',
    column: 'legal_name',
  },
];

export const RAW_TRGM_INDEXES = ['firms_display_name_trgm_idx', 'firms_legal_name_trgm_idx'];

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

export class UsageError extends Error {}
export class PreflightBlocked extends Error {}

export function extractSqlStatements(sqlText) {
  return sqlText
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function assertOnlyAllowedStatements(statements) {
  for (const stmt of statements) {
    const normalized = stmt.replace(/\s+/g, ' ').trim();
    // Deliberately NOT "IF NOT EXISTS" -- P1-R1 requires the CREATE itself
    // to fail loudly on a same-name collision, never silently no-op.
    if (!/^CREATE INDEX CONCURRENTLY \S+\s+ON public\.firms\s+USING gin /i.test(normalized)) {
      throw new PreflightBlocked(
        `Refusing: statement is not the exact recognized "CREATE INDEX CONCURRENTLY <name> ON public.firms USING gin (...)" form (no IF NOT EXISTS): ${normalized.slice(0, 140)}`,
      );
    }
    if (/IF NOT EXISTS/i.test(normalized)) {
      throw new PreflightBlocked(`Refusing: statement contains IF NOT EXISTS, which P1-R1 forbids: ${normalized.slice(0, 140)}`);
    }
    const forbidden = /\b(DROP|REINDEX|VACUUM|ANALYZE|ALTER TABLE|ALTER SYSTEM|CREATE EXTENSION|SET\s)\b/i;
    if (forbidden.test(normalized)) {
      throw new PreflightBlocked(`Refusing: statement contains a forbidden keyword: ${normalized.slice(0, 140)}`);
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
  for (const s of statements) {
    if (!TARGET_COLUMNS.some((col) => s.includes(normalizedExprAsWritten(col)))) {
      throw new PreflightBlocked(`Refusing: statement does not contain the expected as-written normalized expression: ${s.slice(0, 140)}`);
    }
  }
  return statements;
}

export function requireSessionOrDirectConnection(connectionString) {
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

/**
 * Full structural facts for a named object on public.firms, or null if it
 * does not exist. Used both by the pre-apply ABSENCE check (Section 2) and,
 * with different pass/fail interpretation, by the strict validator
 * (Section 3) and --verify (Section 5).
 */
export async function describeIndex(client, name) {
  const rows = await q(
    client,
    `
    SELECT
      c.relname AS index_name,
      n.nspname AS index_schema,
      t.relname AS table_name,
      tn.nspname AS table_schema,
      am.amname AS access_method,
      i.indisvalid,
      i.indisready,
      i.indislive,
      i.indnkeyatts,
      i.indkey::text AS indkey,
      pg_get_expr(i.indexprs, i.indrelid) AS indexprs,
      pg_get_expr(i.indpred, i.indrelid) AS indpred,
      (
        -- Cast to text[]: node-postgres has a built-in type parser for the
        -- text[] OID but not for name[] (opcname's own column type), so an
        -- uncast array_agg(name) comes back as a raw "{...}" literal string,
        -- not a parsed JS array -- verified empirically against the real,
        -- connected database before this cast was added.
        SELECT array_agg(opc.opcname ORDER BY k.ord)::text[]
        FROM unnest(i.indclass) WITH ORDINALITY AS k(opclassoid, ord)
        JOIN pg_opclass opc ON opc.oid = k.opclassoid
      ) AS opclasses,
      pg_get_indexdef(c.oid) AS indexdef
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace tn ON tn.oid = t.relnamespace
    JOIN pg_am am ON am.oid = c.relam
    WHERE c.relname = $1
    `,
    [name],
  );
  return rows[0] ?? null;
}

/**
 * Any object (index or not) named `name` anywhere, for the pre-apply
 * ABSENCE check -- broader than describeIndex, which only matches actual
 * indexes. A same-named table/view/sequence would also collide.
 */
export async function anyObjectNamed(client, name) {
  const rows = await q(client, 'SELECT n.nspname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = $1', [name]);
  return rows;
}

/**
 * Section 3: the ONE reusable strict definition validator. Returns
 * { ok: boolean, failures: string[] } -- never tolerates an "approximately
 * equivalent" expression; every failure is an exact-match miss.
 */
export function strictlyValidateIndex(info, expected) {
  const failures = [];
  if (!info) {
    failures.push(`index ${expected.name} does not exist`);
    return { ok: false, failures };
  }
  if (info.index_schema !== TARGET_SCHEMA) failures.push(`index schema is ${info.index_schema}, expected ${TARGET_SCHEMA}`);
  if (info.table_schema !== TARGET_SCHEMA) failures.push(`table schema is ${info.table_schema}, expected ${TARGET_SCHEMA}`);
  if (info.table_name !== TARGET_TABLE) failures.push(`table is ${info.table_name}, expected ${TARGET_TABLE}`);
  if (info.access_method !== 'gin') failures.push(`access method is ${info.access_method}, expected gin`);
  if (!info.indisvalid) failures.push('indisvalid is false');
  if (!info.indisready) failures.push('indisready is false');
  if (!info.indislive) failures.push('indislive is false');
  if (info.indpred !== null) failures.push(`unexpected partial predicate: ${info.indpred}`);
  if (Number(info.indnkeyatts) !== 1) failures.push(`indnkeyatts is ${info.indnkeyatts}, expected exactly 1 (one indexed expression only)`);
  if (info.indkey !== '0') failures.push(`indkey is "${info.indkey}", expected "0" (a single expression column, not a plain column reference)`);
  const opclasses = info.opclasses ?? [];
  if (opclasses.length !== 1 || opclasses[0] !== 'gin_trgm_ops') {
    failures.push(`opclasses is ${JSON.stringify(opclasses)}, expected exactly ["gin_trgm_ops"]`);
  }
  const expectedExpr = normalizedExprCanonical(expected.column);
  if (info.indexprs !== expectedExpr) {
    failures.push(`expression does not match canonical form exactly.\n    got:      ${info.indexprs}\n    expected: ${expectedExpr}`);
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Section 2: pre-apply collision rule. BOTH proposed names must be
 * completely ABSENT -- valid, invalid, ready, not-ready, correct, or
 * incorrect all count identically as a blocker. A previous partial
 * execution is a separate, human-reviewed recovery decision; this wrapper
 * never silently resumes it.
 */
export async function checkProposedNamesAbsent(client) {
  const blockers = [];
  const details = {};
  for (const { name } of PROPOSED_INDEXES) {
    const objects = await anyObjectNamed(client, name);
    details[name] = objects;
    if (objects.length > 0) {
      blockers.push(`PROPOSED_INDEX_ALREADY_EXISTS_REVIEW_REQUIRED: an object named ${name} already exists (${JSON.stringify(objects)}). This wrapper does not auto-drop or auto-resume -- review manually before proceeding.`);
    }
  }
  return { blockers, details };
}

export async function runPreApplyPreflight(client) {
  const blockers = [];
  const findings = {};

  findings.connection = (await q(client, 'SELECT current_database(), current_user, inet_server_port()'))[0];

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

  const collision = await checkProposedNamesAbsent(client);
  findings.proposedIndexNameCollisions = collision.details;
  blockers.push(...collision.blockers);

  const existingRaw = {};
  for (const name of RAW_TRGM_INDEXES) {
    const info = await describeIndex(client, name);
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
  if (longRunning.length > 0) blockers.push('A transaction has been open for over 2 minutes -- may delay CONCURRENTLY validation.');

  for (const col of TARGET_COLUMNS) {
    const expected = normalizedExprAsWritten(col);
    const explain = await q(client, `EXPLAIN (FORMAT TEXT) SELECT 1 FROM firms WHERE ${expected} LIKE '%test%' LIMIT 1`);
    findings[`expressionParses_${col}`] = explain.length > 0;
    if (explain.length === 0) blockers.push(`Expression for ${col} did not parse.`);
  }

  findings.blockers = blockers;
  return findings;
}

/**
 * Section 5: real --verify mode. Opposite absence requirement from
 * preflight -- REQUIRES both proposed indexes to exist, strictly validates
 * each, and confirms the raw trigram indexes remain present and valid.
 */
export async function runVerify(client) {
  const failures = [];
  const perIndex = {};
  for (const expected of PROPOSED_INDEXES) {
    const info = await describeIndex(client, expected.name);
    const result = strictlyValidateIndex(info, expected);
    perIndex[expected.name] = { info, ...result };
    if (!result.ok) {
      failures.push(`${expected.name}: ${result.failures.join('; ')}`);
    }
  }

  const rawIndexes = {};
  for (const name of RAW_TRGM_INDEXES) {
    const info = await describeIndex(client, name);
    rawIndexes[name] = info;
    if (!info || !(info.indisvalid && info.indisready)) {
      failures.push(`existing raw trigram index ${name} is missing or not valid/ready`);
    }
  }

  return { ok: failures.length === 0, failures, perIndex, rawIndexes };
}

function printReport(mode, payload) {
  console.log(JSON.stringify(payload, null, 2));
  const failing = payload.blockers ?? payload.failures ?? [];
  if (failing.length) {
    console.log(`\nBLOCKED/FAIL (${mode}): ${failing.length} issue(s) found.`);
  } else {
    console.log(`\nOK (${mode}): no issues found.`);
  }
}

function writeReceipt(receipt) {
  const dir = join(REPO_ROOT, 'docs', 'qa', 'th-search-r1-019h', 'receipts');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `p1r1-${receipt.mode}-${Date.now()}.json`);
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

  // Mirrors apps/web/src/lib/db.ts's own, already-reviewed Supabase TLS
  // handling exactly: pg v8 treats sslmode=require as verify-full, and the
  // Supabase pooler's chain is not verifiable here, so keep TLS (encryption
  // in transit) but skip CA verification. Not a new risk introduced by this
  // wrapper -- the identical pattern this codebase already uses everywhere
  // else it connects to this same database.
  const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
  const cleanedUrl = databaseUrl.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/\?&/, '?').replace(/[?&]$/, '');

  const client = new pg.Client({
    connectionString: cleanedUrl,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    // No explicit transaction is ever opened by this wrapper. Each
    // CREATE INDEX CONCURRENTLY statement below runs as its own
    // auto-committed statement -- pg's default client behavior when no
    // explicit BEGIN call is made -- which is the only mode CONCURRENTLY
    // accepts.
  });
  await client.connect();
  try {
    if (mode === '--check') {
      const findings = await runPreApplyPreflight(client);
      findings.connectionIdentity = identity;
      findings.mode = 'check';
      printReport(mode, findings);
      writeReceipt(findings);
      process.exitCode = findings.blockers.length ? 1 : 0;
      return;
    }

    if (mode === '--verify') {
      const result = await runVerify(client);
      const payload = { ...result, connectionIdentity: identity, mode: 'verify' };
      printReport(mode, payload);
      writeReceipt(payload);
      process.exitCode = result.ok ? 0 : 1;
      return;
    }

    // --apply
    const preflight = await runPreApplyPreflight(client);
    if (preflight.blockers.length) {
      printReport(mode, preflight);
      writeReceipt({ mode: 'apply', preflight, connectionIdentity: identity, applied: false });
      process.exitCode = 1;
      return;
    }

    const results = [];
    for (let i = 0; i < statements.length; i += 1) {
      const stmt = statements[i];
      const expected = PROPOSED_INDEXES[i];
      console.log(`[${i + 1}/${statements.length}] applying ${expected.name} ...`);
      try {
        await client.query(stmt);
      } catch (err) {
        console.error(`[${i + 1}/${statements.length}] CREATE FAILED: ${expected.name}: ${err.message}`);
        console.error('STOPPING. No automatic retry. No automatic cleanup. Requires separately reviewed recovery.');
        results.push({ name: expected.name, ok: false, stage: 'create', error: err.message });
        writeReceipt({ mode: 'apply', results, stoppedEarly: true, connectionIdentity: identity });
        process.exitCode = 1;
        return;
      }
      const info = await describeIndex(client, expected.name);
      const validation = strictlyValidateIndex(info, expected);
      if (!validation.ok) {
        console.error(`[${i + 1}/${statements.length}] STRICT VALIDATION FAILED for ${expected.name}: ${validation.failures.join('; ')}`);
        console.error('STOPPING. No automatic retry. No automatic drop. Requires separately reviewed recovery.');
        results.push({ name: expected.name, ok: false, stage: 'validate', failures: validation.failures, indexdef: info?.indexdef ?? null });
        writeReceipt({ mode: 'apply', results, stoppedEarly: true, connectionIdentity: identity });
        process.exitCode = 1;
        return;
      }
      console.log(`[${i + 1}/${statements.length}] OK: ${expected.name} created and strictly validated.`);
      results.push({ name: expected.name, ok: true, stage: 'validate', indexdef: info.indexdef });
    }
    writeReceipt({ mode: 'apply', results, stoppedEarly: false, connectionIdentity: identity });
    process.exitCode = 0;
  } finally {
    await client.end();
  }
}

// Only run main() when this file is executed directly (`node this-file.mjs`),
// never when imported -- e.g. by test_th_search_r1_019h_p1_index_packet.ts,
// which imports the pure/DB-injectable functions above without triggering a
// real connection attempt or argv parsing against the test runner's own argv.
// pathToFileURL handles platform-specific file:// formatting correctly
// (Windows requires file:///C:/... -- three slashes before the drive
// letter -- which naive string concatenation gets wrong and silently never
// invokes main() at all). Verified against a real run on this machine.
const isDirectlyExecuted = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectlyExecuted) {
  main().catch((err) => {
    if (err instanceof UsageError || err instanceof PreflightBlocked) {
      console.error(err.message);
      process.exitCode = 2;
      return;
    }
    console.error(err);
    process.exitCode = 1;
  });
}
