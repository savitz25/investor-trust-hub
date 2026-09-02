import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, PRIMARY_ROUTES } from '@ith/config';

const webRoot = join(import.meta.dirname, '..');
const appRoot = join(webRoot, 'src/app');
const repoRoot = join(webRoot, '..', '..');

describe('NJ-INV-002 publication firewall', () => {
  it('does not add a public /new-jersey route or directories', () => {
    expect(existsSync(join(appRoot, 'new-jersey'))).toBe(false);
    const hrefs = PRIMARY_ROUTES.map((route) => route.href);
    expect(hrefs).not.toContain('/new-jersey');
    expect(INDEXABLE_PATHS).not.toContain('/new-jersey');
    const dirs = readdirSync(appRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(dirs).not.toContain('iar');
    expect(dirs).not.toContain('crowdfunding');
  });

  it('does not expand sitemap or indexing contracts', () => {
    expect([...INDEXABLE_PATHS]).toEqual([
      '/',
      '/firms',
      '/research',
      '/tools',
      '/methodology',
      '/sources',
      '/about',
      '/disclaimer',
      '/privacy',
      '/terms',
    ]);
    const sitemap = readFileSync(join(appRoot, 'sitemap.ts'), 'utf8');
    expect(sitemap).not.toMatch(/new-jersey|trust score|iar-directory/i);
  });

  it('does not add Vercel project files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
