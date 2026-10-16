import 'server-only';

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

export class DatabaseUnavailableError extends Error {
  constructor(message = 'The research database is temporarily unavailable.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

let pool: Pool | undefined;

// pg-pool applies connectionTimeoutMillis to callers waiting for a checked-out
// client, and this pool keeps max at 1. One in-flight checkout per instance
// keeps that wait from being reported as a failed connection.
//
// The queue wait uses the same 12s research execution window as
// SPECIALIST_EXECUTION_TIMEOUT_MS. Only the wait is bounded. A checkout that
// has started keeps its client until that operation settles.
export const CHECKOUT_QUEUE_WAIT_MS = 12_000;

let checkout: Promise<void> = Promise.resolve();

function withCheckout<T>(task: () => Promise<T>): Promise<T> {
  const previous = checkout;
  let started = false;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let releaseLane: () => void = () => undefined;
  const lane = new Promise<void>((resolve) => {
    releaseLane = resolve;
  });
  checkout = lane;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (started) return;
      expired = true;
      reject(new DatabaseUnavailableError());
    }, CHECKOUT_QUEUE_WAIT_MS);

    void previous.then(start, start);

    function start() {
      if (timer !== undefined) clearTimeout(timer);
      if (expired) {
        releaseLane();
        return;
      }
      started = true;
      void Promise.resolve()
        .then(task)
        .then(
          (value) => {
            releaseLane();
            resolve(value);
          },
          (error: unknown) => {
            releaseLane();
            reject(error);
          },
        );
    }
  });
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function runtimeConnectionString(raw: string): string {
  // Session-mode pooler (port 5432) allows ~15 clients and is exhausted by
  // Vercel isolates. Transaction mode (6543) is the serverless-safe endpoint.
  // Operator/ingest jobs keep using the configured session URL.
  if (process.env.VERCEL === '1' && raw.includes('pooler.supabase.com')) {
    return raw.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }
  return raw;
}

function createPool(): Pool {
  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new DatabaseUnavailableError('DATABASE_URL is not configured.');
  }
  const connectionString = runtimeConnectionString(configured);
  const supabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');
  // pg v8 treats sslmode=require as verify-full. The Supabase pooler chain is
  // not verifiable here, so keep TLS but skip CA verification.
  const nodeUrl = connectionString.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/\?&/, '?').replace(/[?&]$/, '');
  return new Pool({
    connectionString: nodeUrl,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    ssl: supabase ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withCheckout(() => getPool().query<T>(text, params));
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        throw error;
      }
      lastError = error;
      if (attempt < 2) {
        await sleep(200 * (attempt + 1));
      }
    }
  }
  const message = lastError instanceof Error ? lastError.message : 'Database query failed.';
  console.error('database_query_failed', message.replace(/postgresql:\/\/[^@]+@/g, 'postgresql://[redacted]@'));
  throw new DatabaseUnavailableError(message);
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withCheckout(async () => {
    const client = await getPool().connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  });
}
