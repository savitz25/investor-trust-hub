import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .pipe(z.string().url().optional());

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('InvestorTrustHub'),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export const serverEnvSchema = publicEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  INGESTION_DATABASE_URL: optionalUrl,
  INGESTION_ARCHIVE_DIR: z.string().optional(),
  INGESTION_STAGING_DIR: z.string().optional(),
  SITE_INDEXING_ENABLED: z.string().optional(),
  INDEXABLE_HOSTS: z.string().optional(),
  CANONICAL_HOST: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function withHttps(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isLocalSiteUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(value);
}

/**
 * Canonical origin. `NEXT_PUBLIC_SITE_URL` always wins when it is a real
 * public URL. On Vercel, a missing or localhost value falls back to the
 * platform hostname so staging canonicals are not hard-coded in source.
 */
export function resolvePublicSiteUrl(input: NodeJS.ProcessEnv = process.env): string {
  const explicit = (input.NEXT_PUBLIC_SITE_URL ?? '').trim();
  const onVercel = input.VERCEL === '1';
  if (explicit && !(onVercel && isLocalSiteUrl(explicit))) {
    return explicit.replace(/\/$/, '');
  }
  const production = (input.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim();
  if (production) {
    return withHttps(production);
  }
  const deployment = (input.VERCEL_URL ?? '').trim();
  if (deployment) {
    return withHttps(deployment);
  }
  return explicit || 'http://localhost:3000';
}

export function parsePublicEnv(input: NodeJS.ProcessEnv = process.env): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: resolvePublicSiteUrl(input),
    NEXT_PUBLIC_SITE_NAME: input.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function parseServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse({
    ...input,
    NEXT_PUBLIC_SITE_URL: resolvePublicSiteUrl(input),
    NEXT_PUBLIC_SITE_NAME: input.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Service-role and database URLs must never be exposed to the client bundle. */
export const SERVER_ONLY_ENV_KEYS = [
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'INGESTION_DATABASE_URL',
  'SITE_INDEXING_ENABLED',
  'INDEXABLE_HOSTS',
  'CANONICAL_HOST',
] as const;

/** Gate A: the deployment may be indexed only when explicitly opted in. Missing = false. */
export function isSiteIndexingEnabled(input: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (input.SITE_INDEXING_ENABLED ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function parseIndexableHosts(input: NodeJS.ProcessEnv = process.env): string[] {
  const raw = input.INDEXABLE_HOSTS ?? '';
  return raw
    .split(',')
    .map((part) => part.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0] ?? '')
    .filter((host) => host.length > 0 && !isBlockedStagingHost(host));
}

export function parseCanonicalHost(input: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = (input.CANONICAL_HOST ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (explicit && !isBlockedStagingHost(explicit)) {
    return explicit.split(':')[0] ?? null;
  }
  const fromSite = resolvePublicSiteUrl(input);
  try {
    const host = new URL(fromSite).hostname.toLowerCase();
    return isBlockedStagingHost(host) || host === 'localhost' || host === '127.0.0.1' ? null : host;
  } catch {
    return null;
  }
}

export function normalizeRequestHost(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().split(',')[0]?.trim().split(':')[0] ?? '';
}

export function isBlockedStagingHost(host: string): boolean {
  const value = normalizeRequestHost(host);
  return value.endsWith('.vercel.app') || value.endsWith('.vercel.sh') || value.endsWith('.now.sh');
}

export function isVercelPreview(input: NodeJS.ProcessEnv = process.env): boolean {
  return (input.VERCEL_ENV ?? '').trim().toLowerCase() === 'preview';
}

/** Gate B: the current request host is an approved production hostname. */
export function isApprovedIndexableHost(host: string | null | undefined, input: NodeJS.ProcessEnv = process.env): boolean {
  if (isVercelPreview(input)) {
    return false;
  }
  const normalized = normalizeRequestHost(host);
  if (!normalized || isBlockedStagingHost(normalized)) {
    return false;
  }
  return parseIndexableHosts(input).includes(normalized);
}

/** Gates A + B. Firm content (Gate C) is applied separately. */
export function isHostLaunchIndexable(host: string | null | undefined, input: NodeJS.ProcessEnv = process.env): boolean {
  return isSiteIndexingEnabled(input) && isApprovedIndexableHost(host, input);
}
