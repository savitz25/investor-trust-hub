import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DECISION_LAB_TOOLS, HOME_PATHS, WHAT_WE_ARE_NOT } from '@ith/config';
import { findForbiddenGuidance } from '@ith/domain';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, '..', rel), 'utf8');
}

describe('site copy does not endorse or rank', () => {
  it('keeps configured marketing copy clean', () => {
    const corpus = [
      ...HOME_PATHS.map((path) => `${path.title} ${path.body}`),
      ...WHAT_WE_ARE_NOT,
      ...DECISION_LAB_TOOLS.map((tool) => `${tool.name} ${tool.purpose}`),
    ].join('\n');
    expect(findForbiddenGuidance(corpus)).toEqual([]);
  });

  it('keeps homepage and about pages free of ranking language', () => {
    const corpus = [
      read('src/components/home-hero.tsx'),
      read('src/components/home-intel.tsx'),
      read('src/components/home-paths.tsx'),
      read('src/components/home-principles.tsx'),
      read('src/app/page.tsx'),
      read('src/app/about/page.tsx'),
      read('src/app/methodology/page.tsx'),
      read('src/components/firm-trust-report.tsx'),
      read('src/components/firm-profile-intelligence.tsx'),
      read('src/components/firm-search.tsx'),
    ].join('\n');
    expect(findForbiddenGuidance(corpus)).toEqual([]);
    expect(corpus.toLowerCase()).not.toContain('verified advisor');
    expect(corpus.toLowerCase()).not.toContain('★★★★★');
    expect(corpus.toLowerCase()).not.toContain('research a professional');
    expect(corpus.toLowerCase()).not.toContain('aggregateRating'.toLowerCase());
  });

  it('keeps the official brand mark free of SVG title tags', () => {
    const mark = read('../../packages/ui/src/BrandMark.tsx');
    const icon = read('src/app/icon.svg');
    const publicMark = read('public/brand/mark.svg');
    expect(mark).not.toMatch(/<title[\s>]/i);
    expect(icon).not.toMatch(/<title[\s>]/i);
    expect(publicMark).not.toMatch(/<title[\s>]/i);
    expect(mark).toContain('aria-label');
  });
});
