import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import {
  CA_PUBLIC_SNAPSHOT,
  caPrincipalOfficeCountFromNationalRoster,
  exactCrdCaProfileAttachments,
  mayAttachCaEvidenceToProfile,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('CA-INV-001 California publication', () => {
  it('publishes an indexable /california route', () => {
    expect(existsSync(join(webRoot, 'src/app/california/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/california');
    expect(shouldNoIndex('/california')).toBe(false);
  });

  it('lists /california in the sitemap contract and never lists California counties', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/california');
    expect(INDEXABLE_PATHS.some((path) => /\/california\/.+/.test(path))).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/california', 'los-angeles-county'))).toBe(false);
  });

  it('uses the national CA principal-office overlay without claiming it is the state-RIA universe', () => {
    expect(caPrincipalOfficeCountFromNationalRoster()).toBe(2699);
    expect(CA_PUBLIC_SNAPSHOT.nationalOverlay.caPrincipalOfficeSecIardFirms).toBe(2699);
    expect(CA_PUBLIC_SNAPSHOT.nationalOverlay.caveat.toLowerCase()).toContain(
      'not the california state-registered',
    );
    expect(CA_PUBLIC_SNAPSHOT.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
    expect(CA_PUBLIC_SNAPSHOT.stateRia.completeStateRiaCount).toBe('UNKNOWN');
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(CA_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdCaProfileAttachments('123456')).toEqual([]);
    expect(mayAttachCaEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachCaEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
  });

  it('does not introduce rankings, Trust Scores, or county routes', () => {
    const page = readFileSync(join(webRoot, 'src/components/ca-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score is');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(page).not.toMatch(/\/california\/[a-z-]+-county/);
    expect(page).toContain('WebPage');
    expect(page).toContain('Dataset');
    expect(page).not.toContain('AggregateRating');
  });

  it('does not change Vercel project files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
