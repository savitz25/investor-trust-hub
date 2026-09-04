/**
 * investor-network-metrics-v1
 * Specialist-owned public metric contract. Grains never mix.
 * Missing / unacquired universes stay UNKNOWN — never numeric zero.
 */

export const INVESTOR_NETWORK_METRICS_VERSION = 'investor-network-metrics-v1' as const;

export type MetricValueState =
  | 'KNOWN'
  | 'UNKNOWN'
  | 'NOT_ACQUIRED'
  | 'PARTIAL'
  | 'REQUEST_ONLY';

export type MetricGrain =
  | 'sec_iard_roster_firm'
  | 'ria_firm_fact'
  | 'era_firm_fact'
  | 'canonical_firm_identity'
  | 'crd_identifier'
  | 'sec_file_identifier'
  | 'form_adv_filing'
  | 'form_adv_attribute_observation'
  | 'raum_observation'
  | 'disclosure_event'
  | 'form_adv_item11_yes_indicator'
  | 'ownership_control_observation'
  | 'indexable_firm_profile'
  | 'published_state_intelligence_page'
  | 'nj_state_ria_roster'
  | 'ca_state_ria_roster'
  | 'tx_state_ria_roster'
  | 'form_adv_withdrawal'
  | 'form_adv_successor_link';

export type PublicationStatus =
  | 'PUBLIC'
  | 'PUBLIC_PARTIAL'
  | 'PUBLIC_UNKNOWN'
  | 'INTERNAL'
  | 'REJECTED';

export type MetricTrace = {
  counts: string;
  doesNotCount: string;
  contributingSourceSystems: string[];
  geographicCoverage: string;
  currentActiveRule?: string;
  sourceDates: string;
  generationDate: string;
  whyUnknown?: string;
};

export type InvestorNetworkMetric = {
  key: string;
  label: string;
  value: number | null;
  valueState: MetricValueState;
  unit: 'count';
  grain: MetricGrain;
  denominator: string;
  description: string;
  coverage: string;
  contributingSourceSystems: string[];
  sourceAsOf: string | null;
  generatedAt: string;
  publicationStatus: PublicationStatus;
  trace: MetricTrace;
};

export type InvestorNetworkMetricsV1 = {
  schemaVersion: typeof INVESTOR_NETWORK_METRICS_VERSION;
  generatedAt: string;
  newestDocumentedSourceAsOf: string | null;
  newestDocumentedSourceAsOfNote: string;
  sourceFingerprint: string;
  source: {
    dataset: string;
    releaseLabel: string;
    publishedAt: string;
    retrievedAt: string;
  };
  identity: {
    rosterFirms: number;
    riaFacts: number;
    eraFacts: number;
    riaRegistered: number;
    riaPending: number;
    eraReporting: number;
    canonicalFirms: number;
    extraFirmsWithoutAdvFacts: number;
    crdIdentifiers: number;
    crdDistinctFirms: number;
    secFileIdentifiers: number;
    secFileDistinctFirms: number;
    partitionRule: string;
    riaPlusEraEqualsRoster: true;
  };
  formAdv: {
    filings: number;
    attributeObservations: number;
    withdrawals: number;
    successorLinks: number;
  };
  raum: {
    riaWithObservation: number;
    riaZero: number;
    riaPositive: number;
    riaNull: number;
    eraNotFiled: number;
    nationalDollarTotalPublished: false;
  };
  evidence: {
    disclosureEvents: number;
    item11YesRia: number;
    item11YesEra: number;
    ownerEntities: number;
    evidenceRecords: number;
  };
  publication: {
    indexableTrustReports: number;
    searchableRosterFirms: number;
  };
  florida: { stateIntelligencePage: false };
  newJersey: {
    principalOfficeRosterFirms: number;
    stateRiaRosterCoverage: 'SOURCE_AVAILABLE_BY_REQUEST';
    statewideStateRiaUniverse: null;
    enforcementDocumentsAcquired: number;
  };
  california: {
    principalOfficeRosterFirms: number;
    stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED';
    statewideStateRiaUniverse: null;
  };
  texas: {
    principalOfficeRosterFirms: number;
    stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED';
    statewideStateRiaUniverse: null;
  };
  network: {
    publishedStateIntelligencePages: number;
    publishedStateIntelligencePaths: string[];
  };
  rejectedTotals: Array<{ total: string; reason: string }>;
  metrics: InvestorNetworkMetric[];
};

export function metricByKey(m: InvestorNetworkMetricsV1, key: string): InvestorNetworkMetric {
  const found = m.metrics.find((row) => row.key === key);
  if (!found) throw new Error(`metric missing: ${key}`);
  return found;
}
