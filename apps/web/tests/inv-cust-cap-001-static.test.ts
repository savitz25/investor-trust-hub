import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const adapter = readFileSync(join(root, 'src/lib/customer-claim-validation/v1.ts'), 'utf8');
const repository = readFileSync(join(root, 'src/lib/firms/repository.ts'), 'utf8');
const route = readFileSync(join(root, 'src/app/api/customer-claim-validation/v1/route.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'src/app/sitemap.ts'), 'utf8');

describe('INV-CUST-CAP-001 safety locks', () => {
  it('binds the canonical firms UUID, exact organization CRD, and existing profile slug', () => {
    expect(repository).toContain('f.id = $1::uuid');
    expect(repository).toContain('crd.identifier_value = $2');
    expect(adapter).toContain('request.canonicalProfileUrl !== canonicalProfileUrl');
    expect(adapter).not.toMatch(/hash|randomUUID|slugify/i);
  });

  it('requires the existing publication and current-content gates', () => {
    expect(adapter).toContain('firm.report.currentlyIndexable');
    expect(adapter).toContain("publicationState: 'PUBLIC_CURRENT'");
    expect(repository).toContain('f.is_synthetic = false');
  });

  it('keeps representatives and research-only firms nonclaimable', () => {
    expect(adapter).toContain('representative_claim_not_allowed');
    expect(adapter).toContain('firm_not_public_current');
    expect(adapter).toContain("'RESEARCH_ONLY'");
  });

  it('never falls back to names and never splits RIA/ERA customer identity', () => {
    const claimQuery = repository.slice(repository.indexOf('export async function getFirmForClaimValidation'), repository.indexOf('export async function searchOfficialFirms'));
    expect(claimQuery).not.toMatch(/display_name.*LIKE|legal_name.*LIKE|similarity\(/);
    expect(adapter).toContain('one canonical firm identity, not separate customer profiles');
  });

  it('uses a no-store, noindex POST endpoint and creates no sitemap surface', () => {
    expect(route).toContain("'Cache-Control': 'no-store'");
    expect(route).toContain("'X-Robots-Tag': 'noindex, nofollow'");
    expect(route).toContain('export async function POST');
    expect(sitemap).not.toContain('customer-claim-validation');
  });

  it('performs no writes, profile minting, ranking, or customer work', () => {
    expect(`${adapter}\n${repository}`).not.toMatch(/\b(INSERT|UPDATE|DELETE|UPSERT)\b/);
    expect(adapter).not.toMatch(/trust.?score|paid ordering|ranking position/i);
    expect(adapter).not.toMatch(/claim cta|monitoring|organization grant/i);
  });
});
