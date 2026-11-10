import { describe, expect, it } from 'vitest';
import { shouldEnablePosthog } from '@/lib/analytics/environment';
import {
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

describe('PostHog enablement', () => {
  it('is a no-op without a key, including production', () => {
    expect(shouldEnablePosthog({ VERCEL_ENV: 'production' })).toBe(false);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_VERCEL_ENV: 'preview' })).toBe(false);
    expect(() => shouldEnablePosthog({})).not.toThrow();
  });

  it('stays off in development unless the debug flag is set', () => {
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', VERCEL_ENV: 'development' })).toBe(false);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' })).toBe(false);
    expect(
      shouldEnablePosthog({
        NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
        VERCEL_ENV: 'development',
        NEXT_PUBLIC_POSTHOG_DEBUG: '1',
      }),
    ).toBe(true);
  });

  it('sends from preview and production when the key is present', () => {
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', VERCEL_ENV: 'preview' })).toBe(true);
    expect(shouldEnablePosthog({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', NEXT_PUBLIC_VERCEL_ENV: 'production' })).toBe(true);
  });
});
