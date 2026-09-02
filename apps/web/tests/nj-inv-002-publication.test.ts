import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, PRIMARY_ROUTES } from '@ith/config';

const webRoot = join(import.meta.dirname, '..');
const appRoot = join(webRoot, 'src/app');
const repoRoot = join(webRoot, '..', '..');

describe('NJ-INV-002 publication firewall', () => {
  it('does not add IAR or crowdfunding directories', () => {
    const hrefs = PRIMARY_ROUTES.map((route) => route.href);
    expect(hrefs).not.toContain('/iar');
    const dirs = readdirSync(appRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(dirs).not.toContain('iar');
    expect(dirs).not.toContain('crowdfunding');
  });

  it('does not add ranking or Trust Score surfaces', () => {
    const sitemap = readFileSync(join(appRoot, 'sitemap.ts'), 'utf8');
    expect(sitemap).not.toMatch(/trust score|iar-directory/i);
    expect(INDEXABLE_PATHS).not.toContain('/iar');
  });

  it('does not add Vercel project files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
