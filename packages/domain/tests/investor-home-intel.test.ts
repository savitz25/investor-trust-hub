import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  INVESTOR_HOME_INTEL_VERSION,
  V1_FEATURED_STORY_IDS,
  V1_HOMEPAGE_TOOLS,
  V1_RIA_COMPENSATION_METHODS,
  V1_RIA_RAUM_BANDS,
  V1_SEC_ROSTER,
  assertCompensationMethodsAreIndependent,
  assertEraIsNotRia,
  assertPrincipalOfficeGeographyReconciles,
  assertRaumBandsCoverRiaPopulation,
  buildInvestorHomeIntelV1,
  fingerprintInvestorHomeIntel,
} from '../src/investor-home-intel';

const here = dirname(fileURLToPath(import.meta.url));
const census = JSON.parse(
  readFileSync(join(here, '../../../docs/inv-home-001-census.json'), 'utf8'),
) as {
  counts: Record<string, number | null>;
  groups: {
    adv_dataset_kind: Array<{ dataset_kind: string; n: number }>;
    registration_type_status: Array<{ registration_type: string; status: string; n: number }>;
  };
};

describe('INV-HOME-001 locked census', () => {
  it('keeps ERA distinct from RIA', () => {
    expect(assertEraIsNotRia()).toBe(true);
    const ria = census.groups.adv_dataset_kind.find((row) => row.dataset_kind === 'ria')?.n;
    const era = census.groups.adv_dataset_kind.find((row) => row.dataset_kind === 'era')?.n;
    expect(ria).toBe(V1_SEC_ROSTER.riaFacts);
    expect(era).toBe(V1_SEC_ROSTER.eraFacts);
    expect(ria).not.toBe(era);
  });

  it('locks the SEC IARD roster as 17,018 + 6,604 = 23,622', () => {
    expect(V1_SEC_ROSTER.riaFacts + V1_SEC_ROSTER.eraFacts).toBe(V1_SEC_ROSTER.totalFacts);
    expect(census.counts.form_adv_firm_facts).toBe(23622);
    expect(census.counts.registrations_firm).toBe(23622);
  });

  it('does not treat extra canonical firms as the SEC roster', () => {
    expect(census.counts.firms_official).toBe(25777);
    expect(census.counts.firms_official - census.counts.form_adv_firm_facts).toBe(
      V1_SEC_ROSTER.extraFirmsWithoutAdvFacts,
    );
  });

  it('locks Wave-1 indexable Trust Reports at 1,000', () => {
    expect(census.counts.search_indexable_firm).toBe(V1_SEC_ROSTER.indexableTrustReports);
  });

  it('records professional rows as not publicly searchable', () => {
    expect(census.counts.people_official).toBeGreaterThan(0);
    expect(census.counts.registrations_person).toBe(0);
  });

  it('exports the contract name for INV-HOME-002', () => {
    expect(INVESTOR_HOME_INTEL_VERSION).toBe('investor-home-intel-v1');
  });

  it('keeps RAUM bands as a complete RIA partition including zeros', () => {
    expect(assertRaumBandsCoverRiaPopulation()).toBe(true);
    expect(
      V1_RIA_RAUM_BANDS.zero +
        V1_RIA_RAUM_BANDS.under25m +
        V1_RIA_RAUM_BANDS.from25mTo100m +
        V1_RIA_RAUM_BANDS.from1bTo10b +
        V1_RIA_RAUM_BANDS.from100mTo1b +
        V1_RIA_RAUM_BANDS.atLeast10b,
    ).toBe(17018);
  });

  it('locks exactly three V1 stories and forbids professional search CTAs', () => {
    expect(V1_FEATURED_STORY_IDS).toHaveLength(3);
    const professional = V1_HOMEPAGE_TOOLS.find((tool) => tool.href === '/professionals');
    expect(professional?.homepageCtaAllowed).toBe(false);
    expect(professional?.status).toBe('PLACEHOLDER');
  });
});

describe('INV-HOME-002 payload', () => {
  it('reconciles RIA + ERA, RAUM bands, 5.E independence, and geography', () => {
    expect(assertEraIsNotRia()).toBe(true);
    expect(assertRaumBandsCoverRiaPopulation()).toBe(true);
    expect(assertCompensationMethodsAreIndependent()).toBe(true);
    expect(assertPrincipalOfficeGeographyReconciles()).toBe(true);
    for (const row of V1_RIA_COMPENSATION_METHODS) {
      expect(row.reportedYes + row.reportedNo).toBe(17018);
      expect(row.notFiledByFormType).toBe(6604);
    }
  });

  it('builds a deterministic fingerprint excluding generatedAt', async () => {
    const a = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    const b = await buildInvestorHomeIntelV1('2026-08-29T12:00:00.000Z');
    expect(a.payloadFingerprint).toBe(b.payloadFingerprint);
    expect(a.payloadFingerprint).toBe(await fingerprintInvestorHomeIntel(a));
    expect(a.generatedAt).not.toBe(b.generatedAt);
    expect(a.findings).toHaveLength(3);
    expect(a.findings.map((row) => row.storyId)).toEqual([...V1_FEATURED_STORY_IDS]);
    expect(a.changeCapability.status).toBe('UNSUPPORTED');
    expect(a.score).toBeNull();
    expect(a.ranking).toBeNull();
  });

  it('keeps 5.E methods independent and never treats ERA as eligible', async () => {
    const intel = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    const story = intel.findings.find((row) => row.storyId === 'ria-compensation-methods-5e');
    expect(story?.visualization).toBe('method_flags');
    expect(story?.series.every((row) => row.independent && row.shareOf === 17018)).toBe(true);
    const yesSum = story?.series.reduce((sum, row) => sum + row.count, 0) ?? 0;
    expect(yesSum).not.toBe(17018);
    expect(intel.ask.some((item) => item.answer.includes('multi-select'))).toBe(true);
  });

  it('exposes unresolved principal-office geography and Wave-1 publication as 1,000', async () => {
    const intel = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    expect(intel.snapshot.rosterUniverse.value).toBe(23622);
    expect(intel.snapshot.ria.value).toBe(17018);
    expect(intel.snapshot.era.value).toBe(6604);
    expect(intel.snapshot.indexableTrustReports.value).toBe(1000);
    expect(intel.geography.resolved.value).toBe(17997);
    expect(intel.geography.unresolved.value).toBe(5625);
    const geoSum = intel.geography.cells.reduce((sum, cell) => sum + cell.count, 0);
    expect(geoSum).toBe(23622);
    expect(intel.tools.every((tool) => tool.href !== '/professionals')).toBe(true);
    const raumSum = intel.findings
      .find((row) => row.storyId === 'ria-reported-raum-bands')
      ?.series.reduce((sum, row) => sum + row.count, 0);
    expect(raumSum).toBe(17018);
  });

  it('does not fabricate client types, FINRA dual-reg, national AUM sums, or pie-chart 5.E', async () => {
    const intel = await buildInvestorHomeIntelV1('2026-08-28T00:00:00.000Z');
    const blob = JSON.stringify(intel).toLowerCase();
    expect(intel.findings.some((row) => row.visualization === 'method_flags')).toBe(true);
    expect(blob).not.toMatch(/\bis fee-only\b/);
    expect(blob).not.toMatch(/national aum total(?! \()/);
    expect(blob).not.toContain('"visualization":"pie"');
    expect(intel.evidenceDepth.some((row) => row.family === 'Client types' && row.depth === 'Unavailable')).toBe(
      true,
    );
    expect(intel.evidenceDepth.some((row) => row.family.includes('BrokerCheck') && row.depth === 'Unavailable')).toBe(
      true,
    );
    expect(intel.ask.length).toBeGreaterThanOrEqual(4);
    expect(intel.ask.length).toBeLessThanOrEqual(7);
    expect(intel.missingness.some((item) => item.includes('Principal office is not client service territory'))).toBe(
      true,
    );
  });
});
