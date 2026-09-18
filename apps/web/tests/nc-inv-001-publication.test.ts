import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NC_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('NC-INV-001 publication', () => {
  it('publishes /north-carolina without local routes, ranking, or copied-state residue', () => {
    const page = readFileSync('apps/web/src/app/north-carolina/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/nc-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/north-carolina/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/north-carolina/charlotte')).toBe(false);
    expect(existsSync('apps/web/src/app/north-carolina/raleigh')).toBe(false);
    expect(routes).toContain("href: '/north-carolina'");
    expect(page).toContain("path: '/north-carolina'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toMatch(/<h1 id="nc-title">/);
    expect(ui).toContain('aria-labelledby="nc-title"');
    expect(ui).toMatch(/summary cease and desist is not a final finding/i);
    expect(NC_PUBLIC_SNAPSHOT.route).toBe('/north-carolina');
    expect(ui).not.toMatch(/DoBS|IDFPR|Oregon DFR|Illinois/);
    expect(ui).not.toMatch(/principal-office region PA|MainAddr=@State=PA|registration jurisdiction = PA/);
    expect(ui).not.toMatch(/aria-labelledby="pa-|id="pa-title"/);
  });
});
