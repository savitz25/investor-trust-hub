import 'server-only';

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | undefined;

export class DatabaseUnavailableError extends Error {
  constructor(message = 'The research database is temporarily unavailable.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DatabaseUnavailableError('DATABASE_URL is not configured.');
  }
  const supabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');
  // pg v8 treats sslmode=require as verify-full. The Supabase pooler chain is
  // not verifiable here, so keep TLS but skip CA verification.
  const nodeUrl = connectionString.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/\?&/, '?').replace(/[?&]$/, '');
  return new Pool({
    connectionString: nodeUrl,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: supabase ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Database query failed.';
    console.error('database_query_failed', message.replace(/postgresql:\/\/[^@]+@/g, 'postgresql://[redacted]@'));
    throw new DatabaseUnavailableError(message);
  }
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
