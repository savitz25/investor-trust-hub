import { describe, expect, it } from 'vitest';
import { MY_TRUSTHUB_SIGN_IN_HREF, myTrustHubSignInHref } from '@/lib/my-investor/my-trusthub-return';

const origin = 'https://www.investortrusthub.com';

describe('myTrustHubSignInHref', () => {
  it('adds return for a registered prefix at a segment boundary', () => {
    for (const path of ['/firms', '/firms/example-llc', '/advisers', '/advisers/jane', '/auth/network-handoff']) {
      const current = `${origin}${path}`;
      const href = myTrustHubSignInHref(current);
      expect(href.startsWith(`${MY_TRUSTHUB_SIGN_IN_HREF}&return=`)).toBe(true);
      expect(decodeURIComponent(href.split('return=')[1])).toBe(current);
    }
  });

  it('omits return outside the registered prefixes', () => {
    for (const path of ['/', '/my-investor-trust-hub', '/firmsy', '/ask', '/ohio']) {
      expect(myTrustHubSignInHref(`${origin}${path}`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    }
  });

  it('omits return for hostile or oversize URLs', () => {
    const long = `${origin}/firms/${'a'.repeat(500)}`;
    expect(long.length).toBeGreaterThan(512);
    expect(myTrustHubSignInHref(long)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref('https://user:pass@www.investortrusthub.com/firms')).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref(`${origin}/firms/a\\b`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref(`${origin}/firms/\u0001`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref(`${origin}/firms/%2e%2e/admin`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref(`${origin}/firms/%2f%2fexample`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref(`${origin}/firms/../secret`)).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref('javascript:alert(1)')).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
    expect(myTrustHubSignInHref('')).toBe(MY_TRUSTHUB_SIGN_IN_HREF);
  });
});
