import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NY_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('NY-INV-001 publication', () => {
  it('publishes /new-york without local routes or ranking language and binds State ERA', () => {
    const page = readFileSync('apps/web/src/app/new-york/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/ny-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/new-york/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/new-york/new-york-city')).toBe(false);
    expect(existsSync('apps/web/src/app/new-york/manhattan')).toBe(false);
    expect(existsSync('apps/web/src/app/new-york/brooklyn')).toBe(false);
    expect(routes).toContain("href: '/new-york'");
    expect(page).toContain("path: '/new-york'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toContain('snap.stateRia.approvedDistinctCrd');
    expect(ui).toContain('snap.stateEra.activeDistinctCrd');
    expect(ui).toContain('snap.federalNotice.noticeFiledDistinctCrd');
    expect(ui).toContain('nyPrincipalOfficeCountFromNationalRoster');
    expect(ui).toMatch(/<h3>State ERA<\/h3>/);
    expect(ui).toMatch(/ERA is not an RIA/);
    expect(ui).not.toMatch(/3152 \+ 1297|New York advisers total/i);
    expect(ui).toMatch(/unknown — not zero/i);
    expect(ui).not.toMatch(/zero OAG actions|OAG regulatory activity rows = 0/i);
    expect(ui).not.toContain('observationRows');
    expect(NY_PUBLIC_SNAPSHOT.route).toBe('/new-york');
    expect(NY_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd).toBe(327);
    expect(NY_PUBLIC_SNAPSHOT.iar.newYorkPersonDirectory).toBe('NOT_PUBLISHED');
    expect(NY_PUBLIC_SNAPSHOT.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
  });

  it('does not add New York OAG identities to claim validation', () => {
    const claim = readFileSync(
      'packages/domain/src/investor-customer-claim-validation-v1.ts',
      'utf8',
    );
    expect(claim).not.toMatch(/new york oag|ny-oag|martin act/i);
  });
});
