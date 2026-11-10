export type AnalyticsEnvironment = 'production' | 'preview' | 'development';

export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/**
 * Vercel sets VERCEL_ENV at build and runtime. The client bundle only inlines
 * NEXT_PUBLIC_* values, so next.config copies VERCEL_ENV onto
 * NEXT_PUBLIC_VERCEL_ENV at build time. No dashboard env change is required.
 */
export function analyticsEnvironment(input: NodeJS.ProcessEnv = process.env): AnalyticsEnvironment {
  const vercel = (input.NEXT_PUBLIC_VERCEL_ENV || input.VERCEL_ENV || '').trim().toLowerCase();
  if (vercel === 'production' || vercel === 'preview' || vercel === 'development') return vercel;
  return 'development';
}

export function posthogKey(input: NodeJS.ProcessEnv = process.env): string {
  return (input.NEXT_PUBLIC_POSTHOG_KEY || '').trim();
}

export function posthogHost(input: NodeJS.ProcessEnv = process.env): string {
  const raw = (input.NEXT_PUBLIC_POSTHOG_HOST || '').trim();
  if (!raw) return DEFAULT_POSTHOG_HOST;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return DEFAULT_POSTHOG_HOST;
    return url.origin;
  } catch {
    return DEFAULT_POSTHOG_HOST;
  }
}

/** Development stays quiet unless this public flag is set. Preview and production do not need it. */
export function posthogDebugEnabled(input: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (input.NEXT_PUBLIC_POSTHOG_DEBUG || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Missing key, or development without the debug flag, is a no-op. Never throws. */
export function shouldEnablePosthog(input: NodeJS.ProcessEnv = process.env): boolean {
  try {
    if (!posthogKey(input)) return false;
    if (analyticsEnvironment(input) === 'development' && !posthogDebugEnabled(input)) return false;
    return true;
  } catch {
    return false;
  }
}
