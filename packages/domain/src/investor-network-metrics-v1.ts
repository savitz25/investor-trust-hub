/**
 * investor-network-metrics-v1
 * Specialist-owned public metric contract. Grains never mix.
 * Missing / unacquired universes stay UNKNOWN — never numeric zero.
 */

export const INVESTOR_NETWORK_METRICS_VERSION =
  'investor-network-metrics-v1' as const;

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
  | 'wa_state_ria_roster'
  | 'az_state_ria_roster'
  | 'form_adv_withdrawal'
  | 'form_adv_successor_link';

export type PublicationStatus =
  | 'PUBLIC'
  | 'PUBLIC_PARTIAL'
  | 'PUBLIC_UNKNOWN'
  | 'INTERNAL'
  | 'REJECTED';

/**
 * Specialist-owned approvals for national homepage measures that are not yet
 * first-class rows in `investor-network-metrics-v1.metrics`. The homepage may
 * consume these fields, but cannot assign their publication status itself.
 */
export const INVESTOR_HOMEPAGE_SUPPLEMENTAL_PUBLICATION = {
  ria_registered: ['ria_firm_fact', 'KNOWN'],
  ria_pending: ['ria_firm_fact', 'KNOWN'],
  canonical_firms: ['canonical_firm_identity', 'KNOWN'],
  extra_without_adv: ['canonical_firm_identity', 'KNOWN'],
  crd_linked_firms: ['crd_identifier', 'KNOWN'],
  sec_file_linked_firms: ['sec_file_identifier', 'KNOWN'],
  form_adv_withdrawals: ['form_adv_withdrawal', 'KNOWN'],
  successor_links: ['form_adv_successor_link', 'KNOWN'],
  ria_zero_raum: ['raum_observation', 'KNOWN'],
  ria_positive_raum: ['raum_observation', 'KNOWN'],
  compensation_methods: ['ria_firm_fact', 'KNOWN'],
  compensation_percentage_of_assets: ['ria_firm_fact', 'KNOWN'],
  compensation_hourly_charges: ['ria_firm_fact', 'KNOWN'],
  compensation_subscription_fees: ['ria_firm_fact', 'KNOWN'],
  compensation_fixed_fees: ['ria_firm_fact', 'KNOWN'],
  compensation_commissions: ['ria_firm_fact', 'KNOWN'],
  compensation_performance_based_fees: ['ria_firm_fact', 'KNOWN'],
  compensation_other_compensation: ['ria_firm_fact', 'KNOWN'],
  searchable_firms: ['sec_iard_roster_firm', 'KNOWN'],
} as const satisfies Record<string, readonly [MetricGrain, MetricValueState]>;

export type InvestorHomepageSupplementalKey =
  keyof typeof INVESTOR_HOMEPAGE_SUPPLEMENTAL_PUBLICATION;

export function supplementalHomepagePublication(
  key: InvestorHomepageSupplementalKey,
) {
  const [grain, valueState] = INVESTOR_HOMEPAGE_SUPPLEMENTAL_PUBLICATION[key];
  return {
    key,
    grain,
    valueState,
    publicationStatus: 'PUBLIC' as const,
    source: 'specialist-owned investor network contract',
    trace: {
      doesNotCount:
        'The approved source-native grain must not be reinterpreted as an additional firm or combined cross-grain total.',
    },
  };
}

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
  washington: {
    principalOfficeRosterFirms: number;
    stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED';
    statewideStateRiaUniverse: null;
  };
  arizona: {
    principalOfficeRosterFirms: number;
    stateRiaRosterCoverage: 'SOURCE_AVAILABLE_BY_REQUEST';
    statewideStateRiaUniverse: null;
    enforcementIndexRowsProfiled: number;
  };
  network: {
    publishedStateIntelligencePages: number;
    publishedStateIntelligencePaths: string[];
  };
  rejectedTotals: Array<{ total: string; reason: string }>;
  metrics: InvestorNetworkMetric[];
};

export function metricByKey(
  m: InvestorNetworkMetricsV1,
  key: string,
): InvestorNetworkMetric {
  const found = m.metrics.find((row) => row.key === key);
  if (!found) throw new Error(`metric missing: ${key}`);
  return found;
}
