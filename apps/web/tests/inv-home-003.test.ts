import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, PRIMARY_ROUTES, shouldNoIndex } from '@ith/config';
import { buildInvestorHomeIntelV1 } from '@ith/domain';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8');

describe('INV-HOME-003 chrome honesty', () => {
  it('does not put synthetic professionals in public nav or sitemap', () => {
    expect(
      PRIMARY_ROUTES.some((route) => route.href === '/professionals'),
    ).toBe(false);
    expect(INDEXABLE_PATHS).not.toContain('/professionals');
    expect(shouldNoIndex('/professionals')).toBe(true);
    const header = read('src/components/site-header.tsx');
    const footer = read('src/components/site-footer.tsx');
    expect(header).not.toMatch(/label: 'Professionals'/);
    expect(footer).not.toMatch(/href: '\/professionals'/);
  });

  it('keeps the locked census and ERA-is-not-RIA language', async () => {
    const intel = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    expect(intel.contract).toBe('investor-home-intel-v1');
    expect(intel.snapshot.rosterUniverse.value).toBe(23622);
    expect(intel.snapshot.ria.value).toBe(17018);
    expect(intel.snapshot.era.value).toBe(6604);
    expect(intel.snapshot.indexableTrustReports.value).toBe(1000);
    expect(intel.geography.resolved.value).toBe(17997);
    expect(intel.geography.unresolved.value).toBe(5625);
    const blob = JSON.stringify(intel);
    expect(blob).toMatch(/ERA is not an RIA/i);
    expect(blob).not.toMatch(/Research a professional/i);
    expect(intel.score).toBeNull();
    expect(intel.ranking).toBeNull();
  });

  it('does not advertise professional research from the homepage surface', () => {
    const page = [
      read('src/app/page.tsx'),
      read('src/components/home-intel.tsx'),
    ].join('\n');
    expect(page.toLowerCase()).not.toContain('research a professional');
    expect(page).toMatch(
      /Research the firm\.\s+Trace the Form ADV evidence\.\s+Understand the\s+regulatory context\./,
    );
    expect(page).toMatch(
      /Florida firm research is national[^\n]*not a published state surface/,
    );
    expect(page).not.toMatch(/href=["']\/florida["']/);
    expect(page).not.toMatch(
      /AggregateRating|Trust Score|best adviser|top adviser/i,
    );
  });
});
