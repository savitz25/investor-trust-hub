import { describe, expect, it } from 'vitest';
import {
  INVESTOR_EVIDENCE_FAMILY_LABELS,
  INVESTOR_HOMEPAGE_STATE_CARDS,
  assertInvestorHomepageEvidenceInventory,
  buildInvestorHomepageEvidenceInventory,
} from '../src/investor-home-evidence-inventory';

const inventory = buildInvestorHomepageEvidenceInventory();
const get = (key: string) => {
  const item = inventory.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`missing ${key}`);
  return item;
};

describe('INV-HOME-003 public evidence inventory', () => {
  it('publishes only explicitly allowed measures with complete trace fields', () => {
    expect(() =>
      assertInvestorHomepageEvidenceInventory(inventory),
    ).not.toThrow();
    expect(inventory.length).toBeGreaterThanOrEqual(35);
    expect(Object.keys(INVESTOR_EVIDENCE_FAMILY_LABELS)).toHaveLength(8);
    for (const item of inventory) {
      expect(['PUBLIC', 'PUBLIC_PARTIAL', 'PUBLIC_UNKNOWN']).toContain(
        item.publicationStatus,
      );
      expect(item.grain).toBeTruthy();
      expect(item.geography).toBeTruthy();
      expect(item.sourceSystem).toBeTruthy();
      expect(item.acceptedArtifact).toBeTruthy();
      expect(item.counts).toBeTruthy();
      expect(item.doesNotCount).toBeTruthy();
    }
    expect(inventory.map((item) => item.key)).not.toContain(
      'disclosure_events',
    );
    expect(() =>
      assertInvestorHomepageEvidenceInventory([
        ...inventory,
        {
          ...inventory[0]!,
          key: 'private_probe',
          publicationStatus: 'INTERNAL' as never,
        },
      ]),
    ).toThrow(/non-public publication status/);
  });

  it('preserves the RIA and ERA roster partition without inventing a cross-grain total', () => {
    expect(get('ria_facts').value! + get('era_facts').value!).toBe(
      get('sec_iard_roster').value,
    );
    expect(get('form_adv_filings').grain).toBe('Form ADV filing');
    expect(get('form_adv_attributes').doesNotCount).toMatch(/Firms/);
    expect(get('ownership_control').doesNotCount).toMatch(/Advisory firms/);
    expect(
      inventory.some((item) =>
        /grand total|investment records/i.test(item.label),
      ),
    ).toBe(false);
  });

  it('keeps RAUM and Item 11 source-native and non-evaluative', () => {
    expect(get('ria_raum_observations').doesNotCount).toMatch(/performance/);
    expect(get('ria_zero_raum').doesNotCount).toMatch(/Missing RAUM/);
    expect(
      inventory.some((item) =>
        /national.*(?:RAUM|AUM).*total/i.test(item.label),
      ),
    ).toBe(false);
    expect(get('item11_yes').doesNotCount).toMatch(/wrongdoing/);
    expect(get('item11_yes').doesNotCount).toMatch(/risk score/);
  });

  it('derives exactly five state surfaces and never invents Florida', () => {
    expect(INVESTOR_HOMEPAGE_STATE_CARDS.map((state) => state.href)).toEqual([
      '/new-jersey',
      '/california',
      '/texas',
      '/washington',
      '/arizona',
    ]);
    expect(get('published_state_pages').value).toBe(
      INVESTOR_HOMEPAGE_STATE_CARDS.length,
    );
    expect(get('fl_state_page_limitation').value).toBeNull();
    expect(get('fl_state_page_limitation').researchDestination).toBe(
      '/firms?state=FL',
    );
  });

  it('keeps state-roster unknowns distinct from principal-office overlays', () => {
    for (const code of ['nj', 'ca', 'tx', 'wa', 'az']) {
      expect(get(`${code}_state_roster`).value).toBeNull();
      expect(get(`${code}_state_roster`).doesNotCount).toMatch(/Zero/);
      expect(get(`${code}_overlay`).grain).toMatch(/principal office/);
    }
    expect(get('nj_state_roster').valueState).toBe('REQUEST_ONLY');
    expect(get('az_state_roster').valueState).toBe('REQUEST_ONLY');
    expect(get('ca_state_roster').valueState).toBe('NOT_ACQUIRED');
    expect(get('tx_state_roster').valueState).toBe('NOT_ACQUIRED');
    expect(get('wa_state_roster').valueState).toBe('NOT_ACQUIRED');
  });

  it('preserves Arizona enforcement index and attribution grains', () => {
    expect(get('az_enforcement_index').value).toBe(205);
    expect(get('az_index_crd_mentions').value).toBe(87);
    expect(get('az_index_name_only').value).toBe(118);
    expect(get('az_enforcement_index').doesNotCount).toMatch(/Violations/);
    expect(get('az_index_name_only').identityRule).toMatch(/unsafe/);
  });

  it('keeps source, retrieval, and generation clocks separate', () => {
    expect(get('sec_iard_roster').sourceAsOf).toBe('2026-08-27');
    expect(get('sec_iard_roster').retrievedAt).toBe('2026-08-28');
    expect(get('sec_iard_roster').generatedAt).not.toBe(
      get('sec_iard_roster').retrievedAt,
    );
    for (const state of INVESTOR_HOMEPAGE_STATE_CARDS) {
      expect(state.sourceClocks.length).toBeGreaterThan(0);
      expect(state.sourceClocks.every((clock) => clock.label.length > 0)).toBe(
        true,
      );
    }
  });
});
