import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import {
  TX_PUBLIC_SNAPSHOT,
  txPrincipalOfficeCountFromNationalRoster,
  exactCrdTxProfileAttachments,
  mayAttachTxEvidenceToProfile,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('TX-INV-001 Texas publication', () => {
  it('publishes an indexable /texas route', () => {
    expect(existsSync(join(webRoot, 'src/app/texas/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/texas');
    expect(shouldNoIndex('/texas')).toBe(false);
  });

  it('lists /texas in the sitemap contract and never lists Texas counties', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/texas');
    expect(INDEXABLE_PATHS.some((path) => /\/texas\/.+/.test(path))).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/texas', 'harris-county'))).toBe(false);
  });

  it('uses the national TX principal-office overlay without claiming it is the state-RIA universe', () => {
    expect(txPrincipalOfficeCountFromNationalRoster()).toBe(1302);
    expect(TX_PUBLIC_SNAPSHOT.nationalOverlay.txPrincipalOfficeSecIardFirms).toBe(1302);
    expect(TX_PUBLIC_SNAPSHOT.nationalOverlay.caveat.toLowerCase()).toContain(
      'not the texas state-registered',
    );
    expect(TX_PUBLIC_SNAPSHOT.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
    expect(TX_PUBLIC_SNAPSHOT.stateRia.completeStateRiaCount).toBe('UNKNOWN');
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(TX_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdTxProfileAttachments('123456')).toEqual([]);
    expect(mayAttachTxEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachTxEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
  });

  it('does not introduce rankings, Trust Scores, or county routes', () => {
    const page = readFileSync(join(webRoot, 'src/components/tx-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score is');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(page).not.toMatch(/\/texas\/[a-z-]+-county/);
    expect(page).toContain('WebPage');
    expect(page).toContain('Dataset');
    expect(page).not.toContain('AggregateRating');
    expect(page).toContain('SOURCE_NOT_ACQUIRED');
  });

  it('does not change Vercel project files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
