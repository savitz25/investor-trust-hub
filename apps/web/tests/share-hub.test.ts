import { describe, expect, it } from 'vitest';
import { pageMetadata } from '../src/lib/seo';
import { isForbiddenShareHost, resolveShareOrigin, SHARE_HUB } from '../src/lib/share-hub';

describe('SHARE-002 InvestorTrustHub social baseline', () => {
  it('pins the Investor production host', () => {
    expect(SHARE_HUB.id).toBe('investor');
    expect(SHARE_HUB.host).toBe('www.investortrusthub.com');
    expect(resolveShareOrigin()).toBe('https://www.investortrusthub.com');
    expect(SHARE_HUB.twitterCard).toBe('summary_large_image');
  });

  it('treats localhost and preview hosts as forbidden share origins', () => {
    expect(isForbiddenShareHost('localhost')).toBe(true);
    expect(isForbiddenShareHost('127.0.0.1')).toBe(true);
    expect(isForbiddenShareHost('investor-trust-hub-web.vercel.app')).toBe(true);
    expect(isForbiddenShareHost('www.movetrusthub.com')).toBe(true);
  });

  it('emits absolute Investor Open Graph and Twitter image URLs', () => {
    const meta = pageMetadata({ title: 'Methodology', path: '/methodology' });
    const blob = JSON.stringify(meta);
    expect(blob).not.toContain('localhost');
    expect(blob).not.toContain('127.0.0.1');
    expect(blob).toContain('https://www.investortrusthub.com/methodology');
    expect(blob).toContain('https://www.investortrusthub.com/opengraph-image');
    expect(meta.twitter?.card).toBe('summary_large_image');
    expect(meta.openGraph?.images).toBeTruthy();
  });

  it('keeps the default social card at 1200×630', () => {
    expect(SHARE_HUB.ogWidth).toBe(1200);
    expect(SHARE_HUB.ogHeight).toBe(630);
  });
});
