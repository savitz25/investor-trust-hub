import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isAutomatedBrowser, posthogKey, publicAnalyticsEnv, shouldEnablePosthog } from '@/lib/analytics/environment';
import {
  isReplayEvent,
  stripElementsChainText,
  sanitizeAnalyticsUrl,
  sanitizeCaptureResult,
  sanitizePathname,
  stripForbiddenProperties,
} from '@/lib/analytics/privacy';

describe('analytics URL sanitizer', () => {
  it('strips q and other free-text query params while keeping structured filters', () => {
    const url = sanitizeAnalyticsUrl(
      'https://www.investortrusthub.com/ask?q=who%20should%20I%20hire&state=FL&page=2&utm_source=preview&identity=Secret%20Firm&raum=Under%20%2425M',
    );
    expect(url).toBe('https://www.investortrusthub.com/ask?state=FL&page=2&utm_source=preview&raum=Under+%2425M');
    expect(url).not.toContain('who');
    expect(url).not.toContain('Secret');
    expect(url).not.toContain('identity=');
    expect(url).not.toContain('q=');
  });

  it('strips credential and phrase params from relative and absolute URLs', () => {
    const auth = sanitizeAnalyticsUrl('https://www.investortrusthub.com/firm/example?code=secret&email=person%40example.com&next=/my');
    expect(auth).toBeTruthy();
    expect(auth).not.toMatch(/secret|person@|code=|email=/);
    const phrase = sanitizeAnalyticsUrl('/firms?note=find+me+an+advisor&firmType=RIA');
    expect(phrase).toBe('https://www.investortrusthub.com/firms?firmType=RIA');
  });

  it('drops userinfo and hash fragments', () => {
    expect(sanitizeAnalyticsUrl('https://user:pass@www.investortrusthub.com/ask?q=hidden#section')).toBe(
      'https://www.investortrusthub.com/ask',
    );
  });

  it('does not throw on garbage and returns undefined', () => {
    expect(() => sanitizeAnalyticsUrl('http://[')).not.toThrow();
    expect(sanitizeAnalyticsUrl('http://[')).toBeUndefined();
    expect(sanitizeAnalyticsUrl('')).toBeUndefined();
    expect(sanitizeAnalyticsUrl(null)).toBeUndefined();
  });

  it('strips q from $current_url, $session_entry_url, $referrer, and $pathname before send', () => {
    const event = sanitizeCaptureResult({
      event: '$pageview',
      properties: {
        token: 'phc_test_token',
        distinct_id: 'anon-1',
        $current_url: 'https://www.investortrusthub.com/ask?q=secret+question&state=TX',
        $session_entry_url: 'https://www.investortrusthub.com/firms?q=Vanguard&page=3',
        $referrer: 'https://www.google.com/search?q=best+advisor+in+miami',
        $pathname: '/ask?q=secret+question',
        $title: 'Ask: secret question · InvestorTrustHub',
        query: 'secret question',
        email: 'person@example.com',
        hub: 'investor',
      },
    });
    expect(event?.properties?.token).toBe('phc_test_token');
    expect(event?.properties?.distinct_id).toBe('anon-1');
    expect(event?.properties?.$current_url).toBe('https://www.investortrusthub.com/ask?state=TX');
    expect(event?.properties?.$session_entry_url).toBe('https://www.investortrusthub.com/firms?page=3');
    expect(event?.properties?.$referrer).toBe('https://www.google.com/search');
    expect(event?.properties?.$pathname).toBe('/ask');
    expect(event?.properties?.$title).toBe('Ask InvestorTrustHub');
    expect(event?.properties?.query).toBeUndefined();
    expect(event?.properties?.email).toBeUndefined();
    expect(event?.properties?.hub).toBe('investor');
    expect(JSON.stringify(event)).not.toContain('secret');
    expect(JSON.stringify(event)).not.toContain('Vanguard');
    expect(JSON.stringify(event)).not.toContain('advisor');
  });

  it('keeps a valid capture when there is nothing sensitive to remove', () => {
    const result = sanitizeCaptureResult({
      event: 'search_submitted',
      properties: { token: 'phc_test_token', hub: 'investor', surface: 'specialist_search' },
    });
    expect(result).not.toBeNull();
    expect(result?.event).toBe('search_submitted');
    expect(result?.properties?.token).toBe('phc_test_token');
  });

  it('sanitizes a pathname that is only a path', () => {
    expect(sanitizePathname('/firm/sec-crd-1')).toBe('/firm/sec-crd-1');
    expect(sanitizePathname('/firms?q=hello&state=CA')).toBe('/firms');
  });

  it('drops raw search text and email from explicit event properties', () => {
    expect(
      stripForbiddenProperties({
        hub: 'investor',
        query: 'Find CRD 123456',
        email: 'person@example.com',
        q: 'secret',
        result_count: 3,
        success: true,
      }),
    ).toEqual({ hub: 'investor', result_count: 3, success: true });
  });
});

const ENABLED = { NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', VERCEL_ENV: 'preview' } as const;
const HUMAN = {
  webdriver: false,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

describe('PostHog enablement', () => {
  it('is a no-op without a key, including production', () => {
    expect(shouldEnablePosthog({ VERCEL_ENV: 'production' }, HUMAN)).toBe(false);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_VERCEL_ENV: 'preview' }, HUMAN)).toBe(false);
    expect(() => shouldEnablePosthog({}, HUMAN)).not.toThrow();
  });

  it('stays off in development unless the debug flag is set', () => {
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', VERCEL_ENV: 'development' }, HUMAN)).toBe(false);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' }, HUMAN)).toBe(false);
    expect(
      shouldEnablePosthog(
        {
          NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
          VERCEL_ENV: 'development',
          NEXT_PUBLIC_POSTHOG_DEBUG: '1',
        },
        HUMAN,
      ),
    ).toBe(true);
  });

  it('sends from preview and production when the key is present', () => {
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', VERCEL_ENV: 'preview' }, HUMAN)).toBe(true);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', NEXT_PUBLIC_VERCEL_ENV: 'production' }, HUMAN)).toBe(
      true,
    );
  });

  it('skips init and capture for webdriver and common bot user agents', () => {
    expect(isAutomatedBrowser({ webdriver: true, userAgent: HUMAN.userAgent })).toBe(true);
    expect(shouldEnablePosthog(ENABLED, { webdriver: true, userAgent: HUMAN.userAgent })).toBe(false);
    for (const userAgent of [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Playwright/1.49.0',
      'curl/8.6.0',
    ]) {
      expect(isAutomatedBrowser({ webdriver: false, userAgent }), userAgent).toBe(true);
      expect(shouldEnablePosthog(ENABLED, { webdriver: false, userAgent }), userAgent).toBe(false);
    }
    expect(isAutomatedBrowser(HUMAN)).toBe(false);
    expect(() => isAutomatedBrowser({ webdriver: false, userAgent: '' })).not.toThrow();
  });
});

const ANALYTICS_DIR = path.resolve(__dirname, '../src/lib/analytics');

describe('PostHog key is statically inlined for the browser (Vercel Agent P1)', () => {
  it('reads every NEXT_PUBLIC analytics value as a literal process.env member expression', () => {
    const source = readFileSync(path.join(ANALYTICS_DIR, 'environment.ts'), 'utf8');
    for (const name of ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST', 'NEXT_PUBLIC_POSTHOG_DEBUG', 'NEXT_PUBLIC_VERCEL_ENV']) {
      expect(source).toContain(`${name}: process.env.${name}`);
    }
    expect(source).not.toMatch(/=\s*process\.env\s*[),]/);
  });

  it('uses the literal snapshot by default and still accepts an explicit env bag', () => {
    const before = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = ' phc_inline_test ';
    try {
      expect(publicAnalyticsEnv().NEXT_PUBLIC_POSTHOG_KEY).toBe(' phc_inline_test ');
      expect(posthogKey()).toBe('phc_inline_test');
    } finally {
      if (before === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      else process.env.NEXT_PUBLIC_POSTHOG_KEY = before;
    }
    expect(posthogKey({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_explicit' })).toBe('phc_explicit');
    expect(posthogKey({})).toBe('');
  });
});

describe('autocapture and replay privacy', () => {
  const RAW = 'is my advisor Bernie Madoff';

  it('drops element text and query-bearing attributes from autocapture', () => {
    const event = sanitizeCaptureResult({
      event: '$autocapture',
      properties: {
        token: 'phc_test_token',
        $current_url: `https://www.investortrusthub.com/ask?q=${encodeURIComponent(RAW)}&state=FL`,
        $el_text: RAW,
        $elements_chain: `button.chip:text="${RAW}"nth-child="1";a:attr__href="/ask?q=${encodeURIComponent(RAW)}"attr__title="${RAW}"nth-child="2"`,
        $elements: [
          { tag_name: 'button', $el_text: RAW, text: RAW, 'attr__aria-label': RAW, attr__class: 'chip' },
          { tag_name: 'a', attr__href: `/ask?q=${encodeURIComponent(RAW)}&state=FL`, href: `/ask?q=${encodeURIComponent(RAW)}` },
        ],
      },
    });
    expect(event?.properties?.$el_text).toBeUndefined();
    const serialized = JSON.stringify(event);
    expect(serialized).not.toMatch(/Madoff|Bernie|advisor/i);
    expect(String(event?.properties?.$elements_chain)).toMatch(/^button\.chip:nth-child="1"/);
  });

  it('strips chain text with escaped quotes', () => {
    expect(stripElementsChainText('a.x:attr__href="/f"text="a \\"b\\""nth-child="2";p:text="s"')).toBe('a.x:attr__href="/f"nth-child="2";p:');
  });

  it('custom search events carry no raw search text', () => {
    const event = sanitizeCaptureResult({
      event: 'search_results_returned',
      properties: { token: 'phc_test_token', hub: 'investor', surface: 'ask', result_count: 3, q: RAW, query: RAW, search: RAW },
    });
    expect(JSON.stringify(event)).not.toMatch(/Madoff/);
    expect(event?.properties?.result_count).toBe(3);
  });

  it('recognizes replay payloads and the browser client disables replay', () => {
    expect(isReplayEvent('$snapshot')).toBe(true);
    expect(isReplayEvent('$pageview')).toBe(false);
    const source = readFileSync(path.join(ANALYTICS_DIR, 'posthog-browser.ts'), 'utf8');
    expect(source).toMatch(/disable_session_recording:\s*true/);
    expect(source).toMatch(/mask_all_text:\s*true/);
    expect(source).toMatch(/maskAllInputs:\s*true/);
    expect(source).toMatch(/isReplayEvent\(event\.event\)\) return null/);
  });
});
