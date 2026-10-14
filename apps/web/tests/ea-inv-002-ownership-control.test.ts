import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADV_FORBIDDEN_PUBLIC_PHRASES, findForbiddenAdvPublicCopy } from '@ith/domain';

const root = join(import.meta.dirname, '..');
const loader = readFileSync(join(root, 'src/lib/firms/profile-intelligence.ts'), 'utf8');
const ui = readFileSync(join(root, 'src/components/firm-profile-intelligence.tsx'), 'utf8');
const domainRoot = join(root, '..', '..', 'packages', 'domain', 'src');
const domainSnapshot = readFileSync(join(domainRoot, 'adv-profile-intelligence.ts'), 'utf8');

describe('EA-INV-002 identity safety (no cross-firm leakage, no private fields)', () => {
  it('scopes every ADV relational-graph query to the resolved firm_id', () => {
    for (const table of [
      'form_adv_reported_attributes',
      'form_adv_schedule_ab_rows',
      'form_adv_related_person_rows',
      'form_adv_private_fund_rows',
      'form_adv_fund_service_provider_rows',
      'form_adv_other_office_rows',
      'form_adv_relying_adviser_rows',
      'form_adv_filings',
      'form_adv_withdrawals',
      'form_adv_documents',
    ]) {
      const fromIdx = loader.indexOf(`FROM ${table}`);
      const joinIdx = loader.indexOf(`JOIN ${table}`);
      const idx = fromIdx !== -1 ? fromIdx : joinIdx;
      expect(idx, `${table} query present`).toBeGreaterThan(-1);
      const window = loader.slice(idx, idx + 600);
      expect(window, `${table} scoped to firm_id = $1`).toMatch(/firm_id\s*=\s*\$1/);
    }
  });

  it('never joins Schedule A/B or related tables by name, address, or fuzzy match', () => {
    expect(loader).not.toMatch(/ILIKE|similarity\(|levenshtein|soundex/i);
    expect(loader).not.toMatch(/full_legal_name\s*=|legal_name\s*=/);
  });

  it('gates every relational-graph row to CONFIRMED or HIGH_CONFIDENCE, never REVIEW_REQUIRED/UNRESOLVED, at the query level', () => {
    const ownerBlock = loader.slice(loader.indexOf('FROM form_adv_filings f'), loader.indexOf('FROM form_adv_filings f') + 600);
    expect(ownerBlock).toContain("identity_confidence IN ('CONFIRMED', 'HIGH_CONFIDENCE')");
  });

  it('never selects private/internal person fields (phone, email, address, SSN-like) for owners', () => {
    const ownersSelectStart = loader.indexOf('const owners = await client.query');
    const ownersSelectEnd = loader.indexOf('const related = await client.query');
    const ownersBlock = loader.slice(ownersSelectStart, ownersSelectEnd);
    expect(ownersBlock).not.toMatch(/phone|email|ssn|ContactValue|street|address/i);
  });

  it('never links an owner or executive name to a standalone profile route', () => {
    expect(domainSnapshot).toMatch(/relatedCrd:\s*null,\s*\n\s*relatedFirmHref:\s*null,/);
  });
});

describe('EA-INV-002 public copy safety', () => {
  it('keeps the rendered Ownership & Control module free of forbidden phrases', () => {
    expect(findForbiddenAdvPublicCopy(ui)).toEqual([]);
    expect(ADV_FORBIDDEN_PUBLIC_PHRASES.length).toBeGreaterThan(8);
  });

  it('never claims a firm has no owners; only that none are available to display', () => {
    expect(ui).not.toMatch(/this firm has no (owners|executives|relationships)/i);
    expect(ui).toContain('are available to display');
  });

  it('never labels a historical relationship as current', () => {
    expect(ui).toContain('historical filing');
    expect(ui).toContain('current reported filing');
  });

  it('distinguishes Schedule A direct ownership from Schedule B indirect ownership in copy', () => {
    expect(ui).toMatch(/Schedule A is direct ownership/i);
    expect(ui).toMatch(/Schedule B is indirect ownership/i);
    expect(ui).toMatch(/executive\/control relationship is\s*\n?\s*not the same as ownership/i);
  });
});
