import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, PRIMARY_ROUTES } from '@ith/config';

const webRoot = join(import.meta.dirname, '..');
const appRoot = join(webRoot, 'src/app');
const repoRoot = join(webRoot, '..', '..');

describe('NJ-INV-001 publication firewall', () => {
  it('does not add county pages or individual directories', () => {
    const hrefs = PRIMARY_ROUTES.map((route) => route.href);
    expect(hrefs).not.toContain('/iar');
    const appDirs = readdirSync(appRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(appDirs).not.toContain('iar');
    expect(appDirs).not.toContain('agents');
    expect(appDirs).not.toContain('counties');
  });

  it('does not add ranking surfaces or Trust Scores', () => {
    const sitemap = readFileSync(join(appRoot, 'sitemap.ts'), 'utf8');
    expect(sitemap).not.toMatch(/iar-directory|trust score/i);
    expect(INDEXABLE_PATHS).not.toContain('/iar');
  });

  it('does not add Vercel project or deployment files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
