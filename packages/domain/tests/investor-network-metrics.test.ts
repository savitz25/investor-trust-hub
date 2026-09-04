import { describe, expect, it } from 'vitest';
import {
  computeInvestorNetworkMetrics,
  type InvestorNetworkMetricsInput,
} from '../src/compute-investor-network-metrics';
import { metricByKey } from '../src/investor-network-metrics-v1';

function baseInput(over: Partial<InvestorNetworkMetricsInput> = {}): InvestorNetworkMetricsInput {
  return {
    generatedAt: '2026-09-04T03:00:00.000Z',
    publishedAt: '2026-08-27',
    retrievedAt: '2026-08-28',
    releaseLabel: 'IA_FIRM_SEC_Feed_08_27_2026',
    dataset: 'iapd_sec_compilation',
    rosterFirms: 23622,
    riaFacts: 17018,
    eraFacts: 6604,
    riaRegistered: 16783,
    riaPending: 235,
    eraReporting: 6604,
    canonicalFirms: 25777,
    crdIdentifiers: 25777,
    crdDistinctFirms: 25777,
    secFileIdentifiers: 23621,
    secFileDistinctFirms: 23621,
    formAdvFilings: 635269,
    formAdvAttributes: 5149596,
    formAdvWithdrawals: 22592,
    formAdvSuccessorLinks: 16,
    riaRaumNonNull: 17018,
    riaRaumZero: 613,
    riaRaumPositive: 16405,
    riaRaumNull: 0,
    disclosureEvents: 0,
    item11YesRia: 876,
    item11YesEra: 80,
    ownerEntities: 158560,
    evidenceRecords: 165354,
    indexableTrustReports: 1000,
    searchableRosterFirms: 23622,
    publishedStateIntelligencePaths: ['/new-jersey', '/california'],
    njPrincipalOfficeFirms: 438,
    njEnforcementDocumentsAcquired: 48,
    caPrincipalOfficeFirms: 2699,
    ...over,
  };
}

describe('investor-network-metrics-v1 grain safety', () => {
  it('treats 17,018 + 6,604 as a mutually exclusive roster partition and keeps ERA out of RIA', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(m.identity.riaFacts + m.identity.eraFacts).toBe(m.identity.rosterFirms);
    expect(metricByKey(m, 'ria_records').grain).toBe('ria_firm_fact');
    expect(metricByKey(m, 'era_records').grain).toBe('era_firm_fact');
    expect(metricByKey(m, 'era_records').label.toLowerCase()).toContain('exempt');
    expect(metricByKey(m, 'era_records').label.toLowerCase()).not.toBe(
      metricByKey(m, 'ria_records').label.toLowerCase(),
    );
    expect(() =>
      computeInvestorNetworkMetrics(baseInput({ eraFacts: 17018, eraReporting: 17018, rosterFirms: 34036 })),
    ).toThrow(/identical classes/);
  });

  it('does not let Form ADV filings or attributes become firm counts', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(metricByKey(m, 'form_adv_filings').value).not.toBe(metricByKey(m, 'investment_advisory_firms').value);
    expect(metricByKey(m, 'form_adv_attribute_observations').value).toBe(5149596);
    expect(metricByKey(m, 'form_adv_attribute_observations').label).toBe('Form ADV attribute observations');
    expect(() => computeInvestorNetworkMetrics(baseInput({ formAdvFilings: 23622 }))).toThrow(/filings must not equal/);
    expect(() => computeInvestorNetworkMetrics(baseInput({ formAdvAttributes: 23622 }))).toThrow(/attribute/);
  });

  it('does not treat disclosures as wrongdoing or CRD as extra firms', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(metricByKey(m, 'form_adv_item11_yes_indicators').trace.doesNotCount.toLowerCase()).toMatch(
      /wrongdoing/,
    );
    expect(metricByKey(m, 'disclosure_events').publicationStatus).toBe('INTERNAL');
    expect(m.identity.crdDistinctFirms).not.toBe(m.identity.rosterFirms);
    expect(() => computeInvestorNetworkMetrics(baseInput({ indexableTrustReports: 23622 }))).toThrow(/indexable/);
  });

  it('keeps RAUM as RIA coverage and refuses a national dollar total', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(m.raum.nationalDollarTotalPublished).toBe(false);
    expect(m.raum.riaWithObservation).toBe(17018);
    expect(m.raum.eraNotFiled).toBe(6604);
    expect(() => computeInvestorNetworkMetrics(baseInput({ riaRaumZero: 0, riaRaumPositive: 17018, riaRaumNonNull: 17000 }))).toThrow(
      /RAUM/,
    );
  });

  it('does not coerce missing NJ/CA state-RIA universes to zero', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(metricByKey(m, 'nj_state_ria_roster').value).toBeNull();
    expect(metricByKey(m, 'nj_state_ria_roster').valueState).toBe('REQUEST_ONLY');
    expect(metricByKey(m, 'ca_state_ria_roster').value).toBeNull();
    expect(metricByKey(m, 'ca_state_ria_roster').valueState).toBe('NOT_ACQUIRED');
    expect(metricByKey(m, 'nj_state_ria_roster').trace.whyUnknown ?? '').toMatch(/never render as zero/i);
    expect(() => computeInvestorNetworkMetrics(baseInput({ publishedStateIntelligencePaths: ['/florida'] }))).toThrow(
      /missing/,
    );
  });

  it('keeps sourceAsOf distinct from generatedAt and uses a consumer firm label', () => {
    const m = computeInvestorNetworkMetrics(baseInput());
    expect(metricByKey(m, 'investment_advisory_firms').label).toBe('Investment advisory firms');
    expect(metricByKey(m, 'investment_advisory_firms').sourceAsOf).toBe('2026-08-27');
    expect(metricByKey(m, 'investment_advisory_firms').sourceAsOf).not.toBe(m.generatedAt.slice(0, 10));
  });
});
