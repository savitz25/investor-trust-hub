import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, STATE_DISCOVERY_ROUTES, shouldNoIndex } from '@ith/config';
import {
  CO_PUBLIC_SNAPSHOT,
  coPrincipalOfficeCountFromNationalRoster,
  exactCrdCoProfileAttachments,
  mayAttachCoEvidenceToProfile,
  personCrdMayBecomeFirmCrd,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('CO-INV-001 Colorado publication', () => {
  it('publishes an indexable /colorado route and never a Denver route', () => {
    expect(existsSync(join(webRoot, 'src/app/colorado/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/colorado');
    expect(shouldNoIndex('/colorado')).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/colorado', 'denver'))).toBe(false);
    expect(INDEXABLE_PATHS.some((path) => /\/colorado\/.+/.test(path))).toBe(false);
  });

  it('lists /colorado in the sitemap contract and keeps the prior five state routes', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/colorado');
    expect(INDEXABLE_PATHS).toContain('/new-jersey');
    expect(INDEXABLE_PATHS).toContain('/california');
    expect(INDEXABLE_PATHS).toContain('/texas');
    expect(INDEXABLE_PATHS).toContain('/washington');
    expect(INDEXABLE_PATHS).toContain('/arizona');
    expect(INDEXABLE_PATHS).not.toContain('/florida');
    expect(STATE_DISCOVERY_ROUTES.map((row) => row.href)).toEqual([
      '/new-jersey',
      '/california',
      '/texas',
      '/washington',
      '/arizona',
      '/colorado',
    ]);
    expect(existsSync(join(webRoot, 'src/app/arizona/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/florida'))).toBe(false);
  });

  it('does not treat 589 principal-office firms as the state-RIA denominator', () => {
    expect(coPrincipalOfficeCountFromNationalRoster()).toBe(589);
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.coPrincipalOfficeSecIardFirms).toBe(589);
    expect(CO_PUBLIC_SNAPSHOT.stateRia.completeStateRiaCount).toBe(740);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd).toBe(3673);
    expect(CO_PUBLIC_SNAPSHOT.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=CO');
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.universe).toBe(23622);
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(CO_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdCoProfileAttachments('123456')).toEqual([]);
    expect(mayAttachCoEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachCoEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(personCrdMayBecomeFirmCrd()).toBe(false);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.REJECTED_UNSAFE_JOINS).toBe(10);
  });

  it('does not introduce rankings, Trust Scores, or local routes', () => {
    const page = readFileSync(join(webRoot, 'src/components/co-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score is');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(page.toLowerCase()).not.toContain('top adviser');
    expect(page.toLowerCase()).not.toContain('vetted');
    expect(page).not.toMatch(/\/colorado\/[a-z-]+/);
    expect(page).toContain('WebPage');
    expect(page).toContain('Dataset');
    expect(page).toContain('Organization');
    expect(page).not.toContain('AggregateRating');
    expect(page).toContain('Colorado state-registered investment-adviser firms');
    expect(page).toContain('principal office');
    expect(page).toContain('SOURCE_NOT_ACQUIRED');
    expect(page).not.toMatch(/Colorado has \d+ investment advisers/i);
  });

  it('does not change Vercel project files or customer/claim identity', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
    const claim = readFileSync(
      join(repoRoot, 'packages/domain/src/investor-customer-claim-validation-v1.ts'),
      'utf8',
    );
    expect(claim).toContain('firmCrd');
    expect(claim).not.toMatch(/colorado division|dora file/i);
  });
});
