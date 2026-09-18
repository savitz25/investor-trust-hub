import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OH_PUBLIC_SNAPSHOT } from '@ith/domain';

describe('OH-INV-001 publication', () => {
  it('publishes /ohio without local routes, ranking, or copied-state residue', () => {
    const page = readFileSync('apps/web/src/app/ohio/page.tsx', 'utf8');
    const ui = readFileSync('apps/web/src/components/oh-state-intel.tsx', 'utf8');
    const routes = readFileSync('packages/config/src/routes.ts', 'utf8');
    expect(existsSync('apps/web/src/app/ohio/page.tsx')).toBe(true);
    expect(existsSync('apps/web/src/app/ohio/columbus')).toBe(false);
    expect(existsSync('apps/web/src/app/ohio/cleveland')).toBe(false);
    expect(routes).toContain("href: '/ohio'");
    expect(page).toContain("path: '/ohio'");
    expect(ui).toMatch(/Trust Score/);
    expect(ui).not.toMatch(/best adviser|safest adviser|vetted adviser/i);
    expect(ui).toMatch(/<h1 id="oh-title">/);
    expect(ui).toContain('aria-labelledby="oh-title"');
    expect(ui).toMatch(/NOH is not a final finding/i);
    expect(OH_PUBLIC_SNAPSHOT.route).toBe('/ohio');
    expect(ui).not.toMatch(/DoBS|IDFPR|Oregon DFR|Illinois|Register of NC/);
    expect(ui).not.toMatch(/principal-office region NC|MainAddr=@State=NC|registration jurisdiction = NC/);
    expect(ui).not.toMatch(/aria-labelledby="nc-|id="nc-title"|id="pa-title"/);
  });
});
