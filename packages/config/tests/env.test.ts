import { describe, expect, it } from 'vitest';
import { SERVER_ONLY_ENV_KEYS, parsePublicEnv, parseServerEnv } from '../src/env';

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
  });
});
