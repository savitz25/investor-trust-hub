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

export type BrowserSignals = {
  webdriver?: boolean;
  userAgent?: string | null;
};

/**
 * Playwright sets navigator.webdriver. Headless Chrome and crawlers identify
 * themselves in the user agent. Same skip as Contractor #194 and Insurance #129.
 */
const AUTOMATED_BROWSER_UA =
  /bot|crawl|spider|slurp|headless|phantom|selenium|puppeteer|playwright|lighthouse|wget|curl\/|python-requests|go-http-client|bytespider|gptbot|claudebot|ahrefs|semrush|pingdom|facebookexternalhit/i;

export function isAutomatedBrowser(signals?: BrowserSignals): boolean {
  try {
    const webdriver =
      signals?.webdriver ?? (typeof navigator !== 'undefined' && navigator.webdriver === true);
    if (webdriver) return true;
    const userAgent =
      signals && 'userAgent' in signals
        ? signals.userAgent || ''
        : typeof navigator !== 'undefined'
          ? navigator.userAgent || ''
          : '';
    return AUTOMATED_BROWSER_UA.test(userAgent);
  } catch {
    return false;
  }
}

/** Missing key, development without the debug flag, or an automated browser is a no-op. Never throws. */
export function shouldEnablePosthog(input: NodeJS.ProcessEnv = process.env, signals?: BrowserSignals): boolean {
  try {
    if (!posthogKey(input)) return false;
    if (analyticsEnvironment(input) === 'development' && !posthogDebugEnabled(input)) return false;
    if (isAutomatedBrowser(signals)) return false;
    return true;
  } catch {
    return false;
  }
}
