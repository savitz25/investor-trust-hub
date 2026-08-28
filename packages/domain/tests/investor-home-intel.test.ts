import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  INVESTOR_HOME_INTEL_VERSION,
  V1_FEATURED_STORY_IDS,
  V1_HOMEPAGE_TOOLS,
  V1_RIA_RAUM_BANDS,
  V1_SEC_ROSTER,
  assertEraIsNotRia,
  assertRaumBandsCoverRiaPopulation,
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
