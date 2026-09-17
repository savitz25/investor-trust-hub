import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PA_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('PA-INV-001 publication', () => {
  it('publishes /pennsylvania without local routes, ranking, or copied-state residue', () => {
    const page = readFileSync('apps/web/src/app/pennsylvania/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/pa-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/pennsylvania/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/pennsylvania/philadelphia')).toBe(false);
    expect(existsSync('apps/web/src/app/pennsylvania/pittsburgh')).toBe(false);
    expect(existsSync('apps/web/src/app/pennsylvania/allegheny')).toBe(false);
    expect(routes).toContain("href: '/pennsylvania'");
    expect(page).toContain("path: '/pennsylvania'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toContain('snap.stateRia.approvedDistinctCrd');
    expect(ui).toContain('snap.stateEra.activeDistinctCrd');
    expect(ui).toMatch(/<h3>State ERA<\/h3>/);
    expect(ui).toMatch(/ERA is not an RIA/);
    expect(ui).toMatch(/unknown — not zero/i);
    expect(ui).not.toContain('observationRows');
    expect(PA_PUBLIC_SNAPSHOT.route).toBe('/pennsylvania');
    expect(ui).toContain('Research Pennsylvania-headquartered SEC/IARD firms');
    expect(ui).toContain('principal-office region PA');
    expect(ui).toContain('MainAddr=@State=PA');
    expect(ui).toContain('registration jurisdiction = PA');
    expect(ui).toContain('id="pa-title"');
    expect(ui).toContain('aria-labelledby="pa-title"');
    expect(ui).not.toMatch(/Research IL-headquartered|Research OR-headquartered|Oregon DFR|Illinois/);
    expect(ui).not.toMatch(/principal-office region IL|principal-office region OR/);
    expect(ui).not.toMatch(/MainAddr=@State=IL|MainAddr=@State=OR/);
    expect(ui).not.toMatch(/registration jurisdiction = IL|registration jurisdiction = OR/);
    expect(ui).not.toMatch(/aria-labelledby="il-|aria-labelledby="or-/);
    expect(ui).not.toMatch(/\bid="il-|\bid="or-/);
  });
});
