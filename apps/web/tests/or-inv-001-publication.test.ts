import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OR_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('OR-INV-001 publication', () => {
  it('publishes /oregon without local routes or ranking language and binds State ERA', () => {
    const page = readFileSync('apps/web/src/app/oregon/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/or-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/oregon/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/oregon/portland')).toBe(false);
    expect(existsSync('apps/web/src/app/oregon/multnomah')).toBe(false);
    expect(routes).toContain("href: '/oregon'");
    expect(page).toContain("path: '/oregon'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toContain('snap.stateRia.approvedDistinctCrd');
    expect(ui).toContain('snap.stateEra.activeDistinctCrd');
    expect(ui).toContain('snap.federalNotice.noticeFiledDistinctCrd');
    expect(ui).toContain('orPrincipalOfficeCountFromNationalRoster');
    expect(ui).toMatch(/<h3>State ERA<\/h3>/);
    expect(ui).toMatch(/ERA is not an RIA/);
    expect(ui).not.toMatch(/793 \+ 855|Oregon advisers total/i);
    expect(ui).toMatch(/unknown — not zero/i);
    expect(ui).not.toMatch(/zero DFR actions|DFR regulatory activity rows = 0/i);
    expect(ui).not.toContain('observationRows');
    expect(OR_PUBLIC_SNAPSHOT.route).toBe('/oregon');
    expect(OR_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd).toBe(26);
    expect(OR_PUBLIC_SNAPSHOT.iar.oregonPersonDirectory).toBe('NOT_PUBLISHED');
    expect(OR_PUBLIC_SNAPSHOT.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
  });

  it('does not add Oregon DFR identities to claim validation', () => {
    const claim = readFileSync(
      'packages/domain/src/investor-customer-claim-validation-v1.ts',
      'utf8',
    );
    expect(claim).not.toMatch(/oregon sos|il-sos|815 ilcs/i);
  });
});
