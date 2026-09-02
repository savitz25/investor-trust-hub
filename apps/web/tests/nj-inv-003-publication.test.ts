import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import {
  NJ_PUBLIC_SNAPSHOT,
  exactCrdProfileAttachments,
  mayAttachNjEvidenceToProfile,
  njPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('NJ-INV-003 New Jersey publication', () => {
  it('publishes an indexable /new-jersey route', () => {
    expect(existsSync(join(webRoot, 'src/app/new-jersey/page.tsx'))).toBe(true);
    expect(INDEXABLE_PATHS).toContain('/new-jersey');
    expect(shouldNoIndex('/new-jersey')).toBe(false);
  });

  it('keeps the sitemap contract pointing at INDEXABLE_PATHS including /new-jersey', () => {
    const sitemap = readFileSync(join(webRoot, 'src/app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain('INDEXABLE_PATHS');
    expect(INDEXABLE_PATHS).toContain('/new-jersey');
  });

  it('uses a deterministic snapshot fingerprint and source-backed counts', () => {
    expect(NJ_PUBLIC_SNAPSHOT.fingerprint).toHaveLength(64);
    expect(NJ_PUBLIC_SNAPSHOT.enforcement.acquiredDocuments).toBe(48);
    expect(NJ_PUBLIC_SNAPSHOT.exam.questionCount2026).toBe(68);
    expect(NJ_PUBLIC_SNAPSHOT.enforcement.coverage).toBe('ACQUIRED_PARTIAL_HISTORY');
    expect(NJ_PUBLIC_SNAPSHOT.enforcement.coverageLabel.toLowerCase()).toContain('partial');
  });

  it('treats the examination as a questionnaire, not enforcement or pass/fail', () => {
    expect(NJ_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
    expect(NJ_PUBLIC_SNAPSHOT.exam.firmResults).toBe('SOURCE_NOT_PUBLIC_AT_FIRM_GRAIN');
    expect(NJ_PUBLIC_SNAPSHOT.exam.consumerSafeStatement.toLowerCase()).toContain('not a public firm rating');
  });

  it('does not treat rounded RIA language as an exact denominator', () => {
    expect(NJ_PUBLIC_SNAPSHOT.exam.roundedPopulationContext.join(' ')).toMatch(/nearly/);
    expect(NJ_PUBLIC_SNAPSHOT.identity).toBeUndefined();
  });

  it('keeps issuer, exemption, and general-order semantics separate', () => {
    expect(NJ_PUBLIC_SNAPSHOT.issuer.exemptionIsEndorsement).toBe(false);
    expect(NJ_PUBLIC_SNAPSHOT.policy.isFirmEnforcement).toBe(false);
    expect(NJ_PUBLIC_SNAPSHOT.issuer.filingClasses.some((row) => row.id === 'PRIVATE_PLACEMENT_REPORT')).toBe(true);
  });

  it('does not attach unresolved or name-only evidence to firm profiles', () => {
    expect(NJ_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(exactCrdProfileAttachments('304732')).toEqual([]);
    expect(mayAttachNjEvidenceToProfile('UNSAFE_REJECTED')).toBe(false);
    expect(mayAttachNjEvidenceToProfile('UNRESOLVED')).toBe(false);
    expect(mayAttachNjEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachNjEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
  });

  it('uses the national NJ principal-office overlay without claiming it is the state-RIA universe', () => {
    expect(njPrincipalOfficeCountFromNationalRoster()).toBe(438);
    expect(NJ_PUBLIC_SNAPSHOT.nationalOverlay.caveat.toLowerCase()).toContain('not the new jersey state-registered');
  });

  it('does not introduce rankings, Trust Scores, or public individual directories', () => {
    const page = readFileSync(join(webRoot, 'src/components/nj-state-intel.tsx'), 'utf8');
    expect(page.toLowerCase()).not.toContain('trust score');
    expect(page.toLowerCase()).not.toContain('best adviser');
    expect(existsSync(join(webRoot, 'src/app/iar'))).toBe(false);
  });

  it('does not change Vercel project files', () => {
    expect(existsSync(join(repoRoot, '.vercel', 'project.json'))).toBe(false);
    expect(existsSync(join(repoRoot, 'vercel.json'))).toBe(false);
  });
});
