import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IL_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('IL-INV-001 publication', () => {
  it('publishes /illinois without local routes or ranking language and binds State ERA', () => {
    const page = readFileSync('apps/web/src/app/illinois/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/il-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/illinois/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/illinois/chicago')).toBe(false);
    expect(existsSync('apps/web/src/app/illinois/cook')).toBe(false);
    expect(routes).toContain("href: '/illinois'");
    expect(page).toContain("path: '/illinois'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toContain('snap.stateRia.approvedDistinctCrd');
    expect(ui).toContain('snap.stateEra.activeDistinctCrd');
    expect(ui).toContain('snap.federalNotice.noticeFiledDistinctCrd');
    expect(ui).toContain('ilPrincipalOfficeCountFromNationalRoster');
    expect(ui).toMatch(/<h3>State ERA<\/h3>/);
    expect(ui).toMatch(/ERA is not an RIA/);
    expect(ui).not.toMatch(/793 \+ 855|Illinois advisers total/i);
    expect(ui).toMatch(/unknown — not zero/i);
    expect(ui).not.toMatch(/zero SOS actions|SOS regulatory activity rows = 0/i);
    expect(ui).not.toContain('observationRows');
    expect(IL_PUBLIC_SNAPSHOT.route).toBe('/illinois');
    expect(IL_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd).toBe(55);
    expect(IL_PUBLIC_SNAPSHOT.iar.illinoisPersonDirectory).toBe('NOT_PUBLISHED');
    expect(IL_PUBLIC_SNAPSHOT.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
  });

  it('does not add Illinois SOS identities to claim validation', () => {
    const claim = readFileSync(
      'packages/domain/src/investor-customer-claim-validation-v1.ts',
      'utf8',
    );
    expect(claim).not.toMatch(/illinois sos|il-sos|815 ilcs/i);
  });
});
