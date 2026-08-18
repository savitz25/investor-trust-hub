import { describe, expect, it } from 'vitest';
import {
  SERVER_ONLY_ENV_KEYS,
  isApprovedIndexableHost,
  isHostLaunchIndexable,
  isSiteIndexingEnabled,
  parseIndexableHosts,
  parsePublicEnv,
  parseServerEnv,
  resolvePublicSiteUrl,
} from '../src/env';

describe('environment validation', () => {
  it('applies safe public defaults', () => {
    const env = parsePublicEnv({});
    expect(env.NEXT_PUBLIC_SITE_NAME).toBe('InvestorTrustHub');
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('accepts a valid server configuration', () => {
    const env = parseServerEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/investor_trust_hub',
    });
    expect(env.DATABASE_URL).toContain('postgresql://');
  });

  it('rejects an invalid public site URL', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: 'not-a-url' })).toThrow();
  });

  it('keeps credentials in the server-only key list', () => {
    expect(SERVER_ONLY_ENV_KEYS).toContain('DATABASE_URL');
    expect(SERVER_ONLY_ENV_KEYS).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(SERVER_ONLY_ENV_KEYS).toContain('SITE_INDEXING_ENABLED');
  });

  it('defaults site indexing to off unless explicitly enabled', () => {
    expect(isSiteIndexingEnabled({})).toBe(false);
    expect(isSiteIndexingEnabled({ SITE_INDEXING_ENABLED: 'false' })).toBe(false);
    expect(isSiteIndexingEnabled({ SITE_INDEXING_ENABLED: 'true' })).toBe(true);
  });

  it('resolves canonical origin from env without hard-coding a Vercel host', () => {
    expect(resolvePublicSiteUrl({})).toBe('http://localhost:3000');
    expect(resolvePublicSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://example.test' })).toBe('https://example.test');
    expect(
      resolvePublicSiteUrl({
        VERCEL: '1',
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
        VERCEL_PROJECT_PRODUCTION_URL: 'qa.example.app',
      }),
    ).toBe('https://qa.example.app');
    expect(
      resolvePublicSiteUrl({
        VERCEL: '1',
        NEXT_PUBLIC_SITE_URL: 'https://www.investortrusthub.example',
        VERCEL_PROJECT_PRODUCTION_URL: 'qa.example.app',
      }),
    ).toBe('https://www.investortrusthub.example');
  });

  it('derives approved hosts from the public site URL when INDEXABLE_HOSTS is empty', () => {
    expect(
      parseIndexableHosts({
        NEXT_PUBLIC_SITE_URL: 'https://www.investortrusthub.com',
      }),
    ).toEqual(['www.investortrusthub.com', 'investortrusthub.com']);
    expect(
      isHostLaunchIndexable('www.investortrusthub.com', {
        SITE_INDEXING_ENABLED: 'true',
        NEXT_PUBLIC_SITE_URL: 'https://www.investortrusthub.com',
      }),
    ).toBe(true);
  });

  it('never treats Vercel staging hosts as indexable even when listing is wrong', () => {
    const env = {
      SITE_INDEXING_ENABLED: 'true',
      INDEXABLE_HOSTS: 'www.example.test,investor-trust-hub-web.vercel.app',
    };
    expect(parseIndexableHosts(env)).toEqual(['www.example.test']);
    expect(isApprovedIndexableHost('investor-trust-hub-web.vercel.app', env)).toBe(false);
    expect(isHostLaunchIndexable('investor-trust-hub-web.vercel.app', env)).toBe(false);
    expect(isHostLaunchIndexable('www.example.test', env)).toBe(true);
    expect(isHostLaunchIndexable(undefined, env)).toBe(true);
    expect(isHostLaunchIndexable('www.example.test', { ...env, VERCEL_ENV: 'preview' })).toBe(false);
    expect(isHostLaunchIndexable('www.example.test', { SITE_INDEXING_ENABLED: 'false', INDEXABLE_HOSTS: 'www.example.test' })).toBe(false);
  });
});
