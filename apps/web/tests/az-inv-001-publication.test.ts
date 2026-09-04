import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import {
  AZ_PUBLIC_SNAPSHOT,
  azPrincipalOfficeCountFromNationalRoster,
  exactCrdAzProfileAttachments,
  mayAttachAzEvidenceToProfile,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('AZ-INV-001 Arizona publication', () => {
  it('publishes an indexable /arizona route', () => {
    expect(existsSync(join(webRoot, 'src/app/arizona/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/arizona');
    expect(shouldNoIndex('/arizona')).toBe(false);
  });

  it('lists /arizona in the sitemap contract and never lists Arizona cities or counties', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/arizona');
    expect(INDEXABLE_PATHS.some((path) => /\/arizona\/.+/.test(path))).toBe(false);
    for (const local of ['phoenix', 'maricopa', 'tucson', 'pima', 'mesa', 'scottsdale', 'tempe', 'chandler', 'glendale']) {
      expect(existsSync(join(webRoot, 'src/app/arizona', local))).toBe(false);
    }
  });

  it('uses the national AZ principal-office overlay without claiming it is the state-RIA universe', () => {
    expect(azPrincipalOfficeCountFromNationalRoster()).toBe(213);
    expect(AZ_PUBLIC_SNAPSHOT.nationalOverlay.azPrincipalOfficeSecIardFirms).toBe(213);
    expect(AZ_PUBLIC_SNAPSHOT.nationalOverlay.caveat.toLowerCase()).toContain(
      'not the arizona state-registered',
    );
    expect(AZ_PUBLIC_SNAPSHOT.stateRia.AZ_STATE_IA_BUSINESS_ROSTER).toBe('SOURCE_AVAILABLE_BY_REQUEST');
    expect(AZ_PUBLIC_SNAPSHOT.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(AZ_PUBLIC_SNAPSHOT.stateRia.requestFiled).toBe(false);
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(AZ_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdAzProfileAttachments('123456')).toEqual([]);
    expect(mayAttachAzEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachAzEvidenceToProfile('EXACT_CRD')).toBe(true);
  });

  it('does not introduce rankings, Trust Scores, or local routes', () => {
    const page = readFileSync(join(webRoot, 'src/components/az-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score is');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(page).not.toMatch(/\/arizona\/[a-z-]+/);
    expect(page).toContain('WebPage');
    expect(page).toContain('Dataset');
    expect(page).not.toContain('AggregateRating');
    expect(page).toContain('SOURCE_AVAILABLE_BY_REQUEST');
    expect(page).toContain('213');
    expect(page).toContain('principal office');
  });

  it('keeps sibling state pages and does not invent Florida', () => {
    expect(existsSync(join(webRoot, 'src/app/washington/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/texas/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/california/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/new-jersey/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/florida'))).toBe(false);
    expect(INDEXABLE_PATHS).toContain('/washington');
    expect(INDEXABLE_PATHS).toContain('/texas');
    expect(INDEXABLE_PATHS).toContain('/california');
    expect(INDEXABLE_PATHS).toContain('/new-jersey');
  });

  it('does not change Vercel project files or customer/claim identity', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
    const claim = readFileSync(
      join(repoRoot, 'packages/domain/src/investor-customer-claim-validation-v1.ts'),
      'utf8',
    );
    expect(claim).toContain('firmCrd');
    expect(claim).not.toMatch(/azcc|acc file/i);
  });
});
