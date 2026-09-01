import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const adapter = readFileSync(join(root, 'src/lib/specialist-execution/v2.ts'), 'utf8');
const route = readFileSync(join(root, 'src/app/api/specialist-execution/v2/route.ts'), 'utf8');
const ask = readFileSync(join(root, 'src/lib/ask/execute.ts'), 'utf8');
const sitemap = readFileSync(join(root, 'src/app/sitemap.ts'), 'utf8');

describe('INV-CAP-001 implementation locks', () => {
  it('reuses the existing Investor Ask executor', () => {
    expect(adapter).toContain('executeParsedInvestorAsk');
    expect(adapter).toContain('interpretInvestorAskQuery');
    expect(adapter).not.toMatch(/FROM form_adv|SELECT .*firms|JOIN firms/);
  });

  it('returns explicit result states rather than one empty-array failure', () => {
    for (const state of [
      'SUPPORTED_RESULTS', 'ZERO_MATCHING_ROWS', 'UNSUPPORTED_CAPABILITY', 'INVALID_QUERY',
      'BACKEND_UNAVAILABLE', 'TIMEOUT', 'NO_CONFIDENT_MATCH', 'EXACT_IDENTITY',
    ]) expect(adapter).toContain(state);
  });

  it('keeps person publication prohibited and destinations publication gated', () => {
    expect(adapter).toContain('individual_representative_not_public');
    expect(adapter).toContain("row.currentlyIndexable ? 'PUBLIC_PROFILE_AVAILABLE' : 'RESEARCH_ROW_ONLY'");
    expect(adapter).toContain('canonicalProfileUrl: row.href ?');
    expect(adapter).not.toContain('firmId: row.firmId');
  });

  it('preserves null profile destinations and adds only official source verification', () => {
    expect(adapter).toContain('canonicalProfileUrl: row.href ?');
    expect(adapter).toContain('https://adviserinfo.sec.gov/firm/summary');
    expect(adapter).not.toContain('slugify');
  });

  it('contains no ranking, score, review, or paid ordering path', () => {
    expect(adapter).toContain('No TrustHub score, paid ordering, ratings ordering, or recommendation ranking');
    expect(adapter).not.toMatch(/ORDER BY.*rating|ORDER BY.*paid|trust_score|review_score/i);
    expect(ask).not.toMatch(/ORDER BY.*rating|ORDER BY.*paid|trust_score|review_score/i);
  });

  it('distinguishes HTTP invalid, unsupported, backend, and timeout states', () => {
    expect(route).toContain("state === 'INVALID_QUERY'");
    expect(route).toContain("state === 'UNSUPPORTED_CAPABILITY'");
    expect(route).toContain("state === 'BACKEND_UNAVAILABLE'");
    expect(route).toContain("state === 'TIMEOUT'");
    expect(route).toContain("return 422");
    expect(route).toContain("return 503");
    expect(route).toContain("return 504");
  });

  it('does not add specialist routes to the sitemap or perform writes', () => {
    expect(sitemap).not.toContain('specialist-execution');
    expect(adapter).not.toMatch(/\b(INSERT|UPDATE|DELETE|UPSERT)\b/);
    expect(route).toContain("'X-Robots-Tag': 'noindex, follow'");
  });

  it('preserves /api/ask compatibility defaults', () => {
    expect(ask).toContain('export async function executeInvestorAsk');
    expect(ask).toContain('executeParsedInvestorAsk(interpretInvestorAskQuery(raw, overrides))');
    expect(ask).toContain('pageSize = INVESTOR_ASK_PAGE_SIZE');
  });
});
