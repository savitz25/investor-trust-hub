import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VA_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('VA-INV-001 publication', () => {
  it('publishes /virginia without local routes or ranking language', () => {
    const page = readFileSync('apps/web/src/app/virginia/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/va-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/virginia/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/virginia/fairfax')).toBe(false);
    expect(existsSync('apps/web/src/app/virginia/richmond')).toBe(false);
    expect(routes).toContain("href: '/virginia'");
    expect(page).toContain("path: '/virginia'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toMatch(/4,481/);
    expect(ui).toMatch(/not 4,481 firms/);
    expect(VA_PUBLIC_SNAPSHOT.route).toBe('/virginia');
    expect(VA_PUBLIC_SNAPSHOT.iar.virginiaPersonDirectory).toBe('NOT_PUBLISHED');
  });

  it('does not add Virginia SCC identities to claim validation', () => {
    const claim = readFileSync(
      'packages/domain/src/investor-customer-claim-validation-v1.ts',
      'utf8',
    );
    expect(claim).not.toMatch(/virginia scc|va-scc|srf case/i);
  });
});
