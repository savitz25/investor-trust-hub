import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import {
  WA_PUBLIC_SNAPSHOT,
  waPrincipalOfficeCountFromNationalRoster,
  exactCrdWaProfileAttachments,
  mayAttachWaEvidenceToProfile,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('WA-INV-001 Washington publication', () => {
  it('publishes an indexable /washington route', () => {
    expect(existsSync(join(webRoot, 'src/app/washington/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/washington');
    expect(shouldNoIndex('/washington')).toBe(false);
  });

  it('lists /washington in the sitemap contract and never lists Washington counties', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/washington');
    expect(INDEXABLE_PATHS.some((path) => /\/washington\/.+/.test(path))).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/washington', 'king-county'))).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/washington', 'seattle'))).toBe(false);
  });

  it('uses the national WA principal-office overlay without claiming it is the state-RIA universe', () => {
    expect(waPrincipalOfficeCountFromNationalRoster()).toBe(306);
    expect(WA_PUBLIC_SNAPSHOT.nationalOverlay.waPrincipalOfficeSecIardFirms).toBe(306);
    expect(WA_PUBLIC_SNAPSHOT.nationalOverlay.caveat.toLowerCase()).toContain(
      'not the washington state-registered',
    );
    expect(WA_PUBLIC_SNAPSHOT.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
    expect(WA_PUBLIC_SNAPSHOT.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.notALiveRoster).toBe(true);
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(WA_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdWaProfileAttachments('123456')).toEqual([]);
    expect(mayAttachWaEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachWaEvidenceToProfile('EXACT_CRD')).toBe(true);
  });

  it('does not introduce rankings, Trust Scores, or county routes', () => {
    const page = readFileSync(join(webRoot, 'src/components/wa-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score is');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(page).not.toMatch(/\/washington\/[a-z-]+-county/);
    expect(page).toContain('WebPage');
    expect(page).toContain('Dataset');
    expect(page).not.toContain('AggregateRating');
    expect(page).toContain('SOURCE_NOT_ACQUIRED');
    expect(page).toContain('year-end');
  });

  it('keeps sibling state pages and does not invent Florida', () => {
    expect(existsSync(join(webRoot, 'src/app/texas/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/california/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/new-jersey/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/florida'))).toBe(false);
    expect(INDEXABLE_PATHS).toContain('/texas');
    expect(INDEXABLE_PATHS).toContain('/california');
    expect(INDEXABLE_PATHS).toContain('/new-jersey');
  });

  it('does not change Vercel project files or customer/claim identity', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
    const claim = readFileSync(join(repoRoot, 'packages/domain/src/investor-customer-claim-validation-v1.ts'), 'utf8');
    expect(claim).toContain('firmCrd');
    expect(claim).not.toMatch(/dfiFile|wa-dfi/i);
  });
});
