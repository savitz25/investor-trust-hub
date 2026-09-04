import { createHash } from 'node:crypto';
import type { InvestorNetworkMetric, InvestorNetworkMetricsV1 } from './investor-network-metrics-v1';
import { INVESTOR_NETWORK_METRICS_VERSION } from './investor-network-metrics-v1';

export type InvestorNetworkMetricsInput = {
  generatedAt: string;
  publishedAt: string;
  retrievedAt: string;
  releaseLabel: string;
  dataset: string;
  rosterFirms: number;
  riaFacts: number;
  eraFacts: number;
  riaRegistered: number;
  riaPending: number;
  eraReporting: number;
  canonicalFirms: number;
  crdIdentifiers: number;
  crdDistinctFirms: number;
  secFileIdentifiers: number;
  secFileDistinctFirms: number;
  formAdvFilings: number;
  formAdvAttributes: number;
  formAdvWithdrawals: number;
  formAdvSuccessorLinks: number;
  riaRaumNonNull: number;
  riaRaumZero: number;
  riaRaumPositive: number;
  riaRaumNull: number;
  disclosureEvents: number;
  item11YesRia: number;
  item11YesEra: number;
  ownerEntities: number;
  evidenceRecords: number;
  indexableTrustReports: number;
  searchableRosterFirms: number;
  publishedStateIntelligencePaths: string[];
  njPrincipalOfficeFirms: number;
  njEnforcementDocumentsAcquired: number;
  caPrincipalOfficeFirms: number;
  txPrincipalOfficeFirms: number;
  waPrincipalOfficeFirms: number;
  azPrincipalOfficeFirms: number;
  azEnforcementIndexRowsProfiled: number;
};

function metric(partial: Omit<InvestorNetworkMetric, 'unit'>): InvestorNetworkMetric {
  return { unit: 'count', ...partial };
}

export function assertGrainSafety(input: InvestorNetworkMetricsInput): void {
  if (input.riaFacts + input.eraFacts !== input.rosterFirms) {
    throw new Error('RIA + ERA must equal the SEC/IARD roster (mutually exclusive dataset_kind partition)');
  }
  if (input.riaRegistered + input.riaPending !== input.riaFacts) {
    throw new Error('RIA registered + pending must equal RIA facts');
  }
  if (input.eraReporting !== input.eraFacts) {
    throw new Error('ERA reporting status must equal ERA facts');
  }
  if (input.riaFacts === input.eraFacts) {
    throw new Error('RIA and ERA counts must not be identical classes');
  }
  if (input.canonicalFirms === input.rosterFirms) {
    throw new Error('canonical firm identities must not be used as the SEC/IARD roster');
  }
  if (input.crdDistinctFirms === input.rosterFirms && input.canonicalFirms !== input.rosterFirms) {
    // CRD exists on extra canonical firms; distinct CRD firms should exceed roster.
    throw new Error('CRD-linked firms must not be collapsed to the roster universe');
  }
  if (input.formAdvFilings === input.rosterFirms) {
    throw new Error('Form ADV filings must not equal roster firms');
  }
  if (input.formAdvAttributes === input.rosterFirms) {
    throw new Error('Form ADV attribute observations must not equal firms');
  }
  if (input.formAdvAttributes === input.formAdvFilings) {
    throw new Error('attribute observations must not equal filings');
  }
  if (input.ownerEntities === input.rosterFirms) {
    throw new Error('ownership observations must not equal firms');
  }
  if (input.indexableTrustReports === input.rosterFirms) {
    throw new Error('indexable profiles must not equal the regulatory roster');
  }
  if (input.indexableTrustReports > input.rosterFirms) {
    throw new Error('indexable profiles cannot exceed the roster');
  }
  if (input.riaRaumNonNull !== input.riaFacts) {
    throw new Error('RIA RAUM observations must cover the RIA fact population');
  }
  if (input.riaRaumZero + input.riaRaumPositive !== input.riaRaumNonNull) {
    throw new Error('RIA RAUM zero + positive must equal non-null observations');
  }
  if (input.riaRaumNull !== 0) {
    throw new Error('unexpected RIA RAUM nulls in current extract');
  }
  if (input.searchableRosterFirms !== input.rosterFirms) {
    throw new Error('public directory search remains the roster, not extra canonical firms');
  }
  if (input.secFileDistinctFirms === input.crdDistinctFirms) {
    throw new Error('SEC file identifiers must not be treated as complete CRD coverage');
  }
  if (input.disclosureEvents === input.item11YesRia + input.item11YesEra && input.disclosureEvents > 0) {
    throw new Error('disclosure events must not be equated to Item 11 yes indicators');
  }
  for (const path of ['/new-jersey', '/california', '/texas', '/washington', '/arizona']) {
    if (!input.publishedStateIntelligencePaths.includes(path)) {
      throw new Error(`state intelligence path missing: ${path}`);
    }
  }
  if (input.publishedStateIntelligencePaths.includes('/florida')) {
    throw new Error('do not invent a Florida Investor state intelligence page');
  }
  if (input.publishedStateIntelligencePaths.some((p) => p.includes('-county'))) {
    throw new Error('county routes must not be counted as state intelligence pages');
  }
  if (input.njPrincipalOfficeFirms === input.rosterFirms) {
    throw new Error('NJ principal-office overlay must not equal the national roster');
  }
  if (input.caPrincipalOfficeFirms === input.rosterFirms) {
    throw new Error('CA principal-office overlay must not equal the national roster');
  }
  if (input.txPrincipalOfficeFirms === input.rosterFirms) {
    throw new Error('TX principal-office overlay must not equal the national roster');
  }
  if (input.waPrincipalOfficeFirms === input.rosterFirms) {
    throw new Error('WA principal-office overlay must not equal the national roster');
  }
  if (input.azPrincipalOfficeFirms === input.rosterFirms) {
    throw new Error('AZ principal-office overlay must not equal the national roster');
  }
}

export function computeInvestorNetworkMetrics(input: InvestorNetworkMetricsInput): InvestorNetworkMetricsV1 {
  assertGrainSafety(input);
  const generatedAt = input.generatedAt;
  const extra = input.canonicalFirms - input.rosterFirms;
  const newestDocumentedSourceAsOf = [input.publishedAt, '2026-09-03', '2026-09-02']
    .map((d) => d.slice(0, 10))
    .sort()
    .at(-1) ?? null;

  const commonTrace = (
    counts: string,
    doesNotCount: string,
    systems: string[],
    geo: string,
    sourceDates: string,
    extraTrace?: Partial<InvestorNetworkMetric['trace']>,
  ) => ({
    counts,
    doesNotCount,
    contributingSourceSystems: systems,
    geographicCoverage: geo,
    sourceDates,
    generationDate: generatedAt.slice(0, 10),
    ...extraTrace,
  });

  const metrics: InvestorNetworkMetric[] = [
    metric({
      key: 'investment_advisory_firms',
      label: 'Investment advisory firms',
      value: input.rosterFirms,
      valueState: 'KNOWN',
      grain: 'sec_iard_roster_firm',
      denominator: 'Current monthly SEC IARD RIA + ERA firm facts (form_adv_firm_facts)',
      description:
        'SEC/IARD monthly roster firms. RIA and ERA stay separate classes. Not all canonical firm identities.',
      coverage: 'National SEC IARD monthly compilation',
      contributingSourceSystems: ['iapd', 'form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One current form_adv_firm_facts row per CRD in the monthly RIA+ERA pair.',
        `Not ${extra} extra canonical firms without ADV facts. Not Form ADV filings. Not attribute rows. Not CRD identifiers as additional firms.`,
        ['iapd_sec_compilation', 'form_adv_firm_facts'],
        'National SEC IARD roster; principal office is not service territory',
        `${input.releaseLabel} published ${input.publishedAt}; retrieved ${input.retrievedAt}`,
        { currentActiveRule: 'dataset_kind is ria XOR era; 17,018 + 6,604 = 23,622' },
      ),
    }),
    metric({
      key: 'ria_records',
      label: 'Registered investment adviser records',
      value: input.riaFacts,
      valueState: 'KNOWN',
      grain: 'ria_firm_fact',
      denominator: "form_adv_firm_facts.dataset_kind = 'ria'",
      description: 'RIA firm facts on the current roster. Includes pending. ERA is not an RIA.',
      coverage: 'National SEC IARD RIA file',
      contributingSourceSystems: ['iapd', 'form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'RIA facts (registered + pending).',
        'Not ERA. Pending is not SEC approval. Not a quality ranking.',
        ['form_adv_firm_facts'],
        'National',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'era_records',
      label: 'Exempt reporting adviser records',
      value: input.eraFacts,
      valueState: 'KNOWN',
      grain: 'era_firm_fact',
      denominator: "form_adv_firm_facts.dataset_kind = 'era'",
      description: 'ERA firm facts. ERA is not an RIA. Exemption from full registration is not a safety finding.',
      coverage: 'National SEC IARD ERA file',
      contributingSourceSystems: ['iapd', 'form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'ERA facts with reporting status.',
        'Not RIAs. Not a combined “advisers” total without stating both classes.',
        ['form_adv_firm_facts'],
        'National',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'indexable_firm_profiles',
      label: 'Indexable firm research profiles',
      value: input.indexableTrustReports,
      valueState: 'KNOWN',
      grain: 'indexable_firm_profile',
      denominator: 'search_documents where entity_kind=firm and indexable=true',
      description: 'Wave-1 publication gate. Not the full regulatory universe and not a ranking.',
      coverage: 'National publication cohort',
      contributingSourceSystems: ['search_documents'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'Indexable firm search documents on official firms.',
        'Not 23,622 roster firms. Non-indexable is not lower quality.',
        ['search_documents'],
        'National Wave-1 gate',
        `Publication gate on ${input.releaseLabel}`,
      ),
    }),
    metric({
      key: 'form_adv_filings',
      label: 'Form ADV filings',
      value: input.formAdvFilings,
      valueState: 'KNOWN',
      grain: 'form_adv_filing',
      denominator: 'form_adv_filings rows (historical filing records)',
      description: 'Stored Form ADV filing records. A filing is not an additional advisory firm.',
      coverage: 'IARD filing history as stored',
      contributingSourceSystems: ['form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One form_adv_filings row.',
        'Not firms. Not attribute observations. Amendments are not new advisers.',
        ['form_adv_filings'],
        'National filing history as stored',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'form_adv_attribute_observations',
      label: 'Form ADV attribute observations',
      value: input.formAdvAttributes,
      valueState: 'KNOWN',
      grain: 'form_adv_attribute_observation',
      denominator: 'form_adv_reported_attributes rows',
      description: 'Normalized Item-level observations. Evidence depth — not 5 million advisers.',
      coverage: 'Current extract Item observations',
      contributingSourceSystems: ['form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One normalized Item observation row.',
        'Not firms, not filings, not accounts, not clients, not violations.',
        ['form_adv_reported_attributes'],
        'National extract',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'ria_raum_observations',
      label: 'RIA firms with a reported RAUM observation',
      value: input.riaRaumNonNull,
      valueState: 'KNOWN',
      grain: 'raum_observation',
      denominator: 'RIA facts with Item 5F(2)(c) RAUM present (zero kept distinct from missing)',
      description:
        'Coverage of reported regulatory assets under management for RIAs. ERA does not file this item. No national dollar total is published.',
      coverage: 'RIA facts only',
      contributingSourceSystems: ['form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'RIA facts with a non-null RAUM amount. Zero is a reported value.',
        'Not performance. Not client assets as a marketing total. Not ERA. Not a summed national AUM headline.',
        ['form_adv_firm_facts'],
        'National RIA file',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'form_adv_item11_yes_indicators',
      label: 'Form ADV Item 11 yes responses',
      value: input.item11YesRia + input.item11YesEra,
      valueState: 'PARTIAL',
      grain: 'form_adv_item11_yes_indicator',
      denominator: 'form_adv_firm_facts.disclosure_indicator = Y',
      description: 'Filer checkbox that disclosure information was reported. Not a finding of wrongdoing.',
      coverage: 'Current roster facts',
      contributingSourceSystems: ['form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC_PARTIAL',
      trace: commonTrace(
        'Facts with disclosure_indicator Y (RIA and ERA kept visible in Trace).',
        'Not disclosure_events. Not a finding of wrongdoing. N is not a clean history. Missing is not zero events.',
        ['form_adv_firm_facts'],
        'National',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'disclosure_events',
      label: 'Stored disclosure event rows',
      value: input.disclosureEvents,
      valueState: 'KNOWN',
      grain: 'disclosure_event',
      denominator: 'disclosure_events table',
      description:
        'Structured disclosure-event rows currently stored. Zero here is an empty table, not proof of no disciplinary history.',
      coverage: 'Not a national enforcement census',
      contributingSourceSystems: ['disclosure_events'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'INTERNAL',
      trace: commonTrace(
        'disclosure_events rows.',
        'Not Item 11 checkboxes. Not wrongdoing. Do not headline this zero as a clean industry.',
        ['disclosure_events'],
        'National table as stored',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'ownership_control_observations',
      label: 'Ownership and control observations',
      value: input.ownerEntities,
      valueState: 'KNOWN',
      grain: 'ownership_control_observation',
      denominator: 'form_adv_owner_entities rows',
      description: 'Schedule A/B owner/control observations. An owner row is not an advisory firm.',
      coverage: 'Current extract owner entities',
      contributingSourceSystems: ['form_adv'],
      sourceAsOf: input.publishedAt,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'One owner/control entity observation.',
        'Not firms. Not a beneficial-owner census of the United States.',
        ['form_adv_owner_entities'],
        'National extract',
        `${input.releaseLabel} ${input.publishedAt}`,
      ),
    }),
    metric({
      key: 'nj_state_ria_roster',
      label: 'New Jersey state-registered adviser universe',
      value: null,
      valueState: 'REQUEST_ONLY',
      grain: 'nj_state_ria_roster',
      denominator: 'NJ Bureau of Securities state-RIA bulk roster — SOURCE_AVAILABLE_BY_REQUEST',
      description: 'Complete NJ state-registered adviser count is UNKNOWN, not zero, and not the 438 SEC principal-office overlay.',
      coverage: 'New Jersey',
      contributingSourceSystems: ['nj_bos'],
      sourceAsOf: '2026-09-02',
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'Nothing numeric is published for the complete NJ state-RIA universe.',
        'Not SEC NJ principal-office firms. Not Bureau enforcement documents.',
        ['nj_bos'],
        'New Jersey',
        'NJ-INV snapshot as_of 2026-09-02',
        {
          whyUnknown:
            'A complete current New Jersey state-registered investment adviser roster remains an official records request. UNKNOWN must never render as zero.',
        },
      ),
    }),
    metric({
      key: 'ca_state_ria_roster',
      label: 'California state-registered adviser universe',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'ca_state_ria_roster',
      denominator: 'California DFPI state-RIA bulk roster — SOURCE_NOT_ACQUIRED',
      description: 'No bulk California state-RIA roster was acquired. Complete licensed-adviser count is UNKNOWN, not zero.',
      coverage: 'California',
      contributingSourceSystems: ['ca_dfpi'],
      sourceAsOf: '2026-09-03',
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'Nothing numeric is published for the complete CA state-RIA universe.',
        'Not SEC CA principal-office firms. Not DFPI enforcement search hits.',
        ['ca_dfpi'],
        'California',
        'CA-INV snapshot as_of 2026-09-03',
        {
          whyUnknown:
            'Public DFPI verification is search-only. Do not estimate the missing state roster from SEC principal-office geography.',
        },
      ),
    }),
    metric({
      key: 'tx_state_ria_roster',
      label: 'Texas state-RIA license roster',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'tx_state_ria_roster',
      denominator: 'Texas State Securities Board state-RIA bulk roster — SOURCE_NOT_ACQUIRED',
      description: 'No bulk Texas state-RIA roster was acquired. Complete licensed-adviser count is UNKNOWN, not zero.',
      coverage: 'Texas',
      contributingSourceSystems: ['tx_ssb'],
      sourceAsOf: '2026-09-04',
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'Nothing numeric is published for the complete TX state-RIA universe.',
        'Not SEC TX principal-office firms. Not SSB enforcement search hits.',
        ['tx_ssb'],
        'Texas',
        'TX-INV snapshot as_of 2026-09-04',
        {
          whyUnknown:
            'Public SSB verification is search-only. Do not estimate the missing state roster from SEC principal-office geography. Missing is not zero.',
        },
      ),
    }),
    metric({
      key: 'wa_state_ria_roster',
      label: 'Washington state-RIA license roster',
      value: null,
      valueState: 'NOT_ACQUIRED',
      grain: 'wa_state_ria_roster',
      denominator: 'Washington DFI state-RIA bulk roster — SOURCE_NOT_ACQUIRED',
      description: 'No bulk Washington state-RIA roster was acquired. Complete licensed-adviser count is UNKNOWN, not zero.',
      coverage: 'Washington',
      contributingSourceSystems: ['wa_dfi'],
      sourceAsOf: '2026-09-04',
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'Nothing numeric is published for the complete WA state-RIA universe.',
        'Not SEC WA principal-office firms. Not DFI year-end aggregates. Not DFI enforcement search hits.',
        ['wa_dfi'],
        'Washington',
        'WA-INV snapshot as_of 2026-09-04',
        {
          whyUnknown:
            'Public DFI verification is search-only. Do not estimate the missing state roster from SEC principal-office geography or from the 2024 year-end aggregate. Missing is not zero.',
        },
      ),
    }),
    metric({
      key: 'az_state_ria_roster',
      label: 'Arizona state-licensed investment adviser roster',
      value: null,
      valueState: 'REQUEST_ONLY',
      grain: 'az_state_ria_roster',
      denominator: 'ACC Securities state-IA bulk roster — SOURCE_AVAILABLE_BY_REQUEST',
      description:
        'Complete Arizona state-licensed adviser count is UNKNOWN, not zero, and not the 213 SEC principal-office overlay.',
      coverage: 'Arizona',
      contributingSourceSystems: ['az_acc'],
      sourceAsOf: '2026-09-04',
      generatedAt,
      publicationStatus: 'PUBLIC_UNKNOWN',
      trace: commonTrace(
        'Nothing numeric is published for the complete AZ state-IA universe.',
        'Not SEC AZ principal-office firms. Not ACC enforcement HTML index rows.',
        ['az_acc'],
        'Arizona',
        'AZ-INV snapshot as_of 2026-09-04',
        {
          whyUnknown:
            'ACC can provide a CSV by public-records request. The request was not filed. Do not estimate the missing state roster from SEC principal-office geography. UNKNOWN must never render as zero.',
        },
      ),
    }),
    metric({
      key: 'published_state_intelligence_pages',
      label: 'Published state investment-intelligence pages',
      value: input.publishedStateIntelligencePaths.length,
      valueState: 'KNOWN',
      grain: 'published_state_intelligence_page',
      denominator: 'Indexable specialist state intelligence routes currently published',
      description: 'New Jersey, California, Texas, Washington, and Arizona state intelligence pages. Not a count of advisers.',
      coverage: input.publishedStateIntelligencePaths.join(', '),
      contributingSourceSystems: ['investor-state-intel'],
      sourceAsOf: newestDocumentedSourceAsOf,
      generatedAt,
      publicationStatus: 'PUBLIC',
      trace: commonTrace(
        'Published /new-jersey, /california, /texas, /washington, and /arizona intelligence routes.',
        'Not county pages. Not national roster rows. Florida is not published on this hub.',
        ['investor-state-intel'],
        input.publishedStateIntelligencePaths.join(', '),
        'Publication gates in specialist catalogs',
      ),
    }),
  ];

  const canonical = {
    roster: input.rosterFirms,
    ria: input.riaFacts,
    era: input.eraFacts,
    canonical: input.canonicalFirms,
    crd: input.crdDistinctFirms,
    secFile: input.secFileDistinctFirms,
    filings: input.formAdvFilings,
    attrs: input.formAdvAttributes,
    raumNn: input.riaRaumNonNull,
    raumZero: input.riaRaumZero,
    indexable: input.indexableTrustReports,
    owners: input.ownerEntities,
    item11: input.item11YesRia + input.item11YesEra,
    disc: input.disclosureEvents,
    paths: input.publishedStateIntelligencePaths,
    njHq: input.njPrincipalOfficeFirms,
    caHq: input.caPrincipalOfficeFirms,
    txHq: input.txPrincipalOfficeFirms,
    waHq: input.waPrincipalOfficeFirms,
    azHq: input.azPrincipalOfficeFirms,
    azEnf: input.azEnforcementIndexRowsProfiled,
    njEnf: input.njEnforcementDocumentsAcquired,
    publishedAt: input.publishedAt,
  };

  return {
    schemaVersion: INVESTOR_NETWORK_METRICS_VERSION,
    generatedAt,
    newestDocumentedSourceAsOf,
    newestDocumentedSourceAsOfNote:
      'Newest documented official source-effective date among metrics that carry a calendar sourceAsOf. Not the as-of date of every filing, not Git time, and not deploy time.',
    sourceFingerprint: createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    source: {
      dataset: input.dataset,
      releaseLabel: input.releaseLabel,
      publishedAt: input.publishedAt,
      retrievedAt: input.retrievedAt,
    },
    identity: {
      rosterFirms: input.rosterFirms,
      riaFacts: input.riaFacts,
      eraFacts: input.eraFacts,
      riaRegistered: input.riaRegistered,
      riaPending: input.riaPending,
      eraReporting: input.eraReporting,
      canonicalFirms: input.canonicalFirms,
      extraFirmsWithoutAdvFacts: extra,
      crdIdentifiers: input.crdIdentifiers,
      crdDistinctFirms: input.crdDistinctFirms,
      secFileIdentifiers: input.secFileIdentifiers,
      secFileDistinctFirms: input.secFileDistinctFirms,
      partitionRule:
        "form_adv_firm_facts.dataset_kind is mutually exclusive: ria XOR era. COUNT(ria)+COUNT(era)=COUNT(roster). This is a filing-class partition of the monthly SEC IARD roster, not a second identity spine.",
      riaPlusEraEqualsRoster: true,
    },
    formAdv: {
      filings: input.formAdvFilings,
      attributeObservations: input.formAdvAttributes,
      withdrawals: input.formAdvWithdrawals,
      successorLinks: input.formAdvSuccessorLinks,
    },
    raum: {
      riaWithObservation: input.riaRaumNonNull,
      riaZero: input.riaRaumZero,
      riaPositive: input.riaRaumPositive,
      riaNull: input.riaRaumNull,
      eraNotFiled: input.eraFacts,
      nationalDollarTotalPublished: false,
    },
    evidence: {
      disclosureEvents: input.disclosureEvents,
      item11YesRia: input.item11YesRia,
      item11YesEra: input.item11YesEra,
      ownerEntities: input.ownerEntities,
      evidenceRecords: input.evidenceRecords,
    },
    publication: {
      indexableTrustReports: input.indexableTrustReports,
      searchableRosterFirms: input.searchableRosterFirms,
    },
    florida: { stateIntelligencePage: false },
    newJersey: {
      principalOfficeRosterFirms: input.njPrincipalOfficeFirms,
      stateRiaRosterCoverage: 'SOURCE_AVAILABLE_BY_REQUEST',
      statewideStateRiaUniverse: null,
      enforcementDocumentsAcquired: input.njEnforcementDocumentsAcquired,
    },
    california: {
      principalOfficeRosterFirms: input.caPrincipalOfficeFirms,
      stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED',
      statewideStateRiaUniverse: null,
    },
    texas: {
      principalOfficeRosterFirms: input.txPrincipalOfficeFirms,
      stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED',
      statewideStateRiaUniverse: null,
    },
    washington: {
      principalOfficeRosterFirms: input.waPrincipalOfficeFirms,
      stateRiaRosterCoverage: 'SOURCE_NOT_ACQUIRED',
      statewideStateRiaUniverse: null,
    },
    arizona: {
      principalOfficeRosterFirms: input.azPrincipalOfficeFirms,
      stateRiaRosterCoverage: 'SOURCE_AVAILABLE_BY_REQUEST',
      statewideStateRiaUniverse: null,
      enforcementIndexRowsProfiled: input.azEnforcementIndexRowsProfiled,
    },
    network: {
      publishedStateIntelligencePages: input.publishedStateIntelligencePaths.length,
      publishedStateIntelligencePaths: input.publishedStateIntelligencePaths,
    },
    rejectedTotals: [
      {
        total: `${input.riaFacts} + ${input.eraFacts} + ${input.formAdvFilings} Form ADV rows as total advisers`,
        reason: 'Incompatible grains. RIA and ERA are classes of the roster; filings are not extra firms.',
      },
      {
        total: `${input.formAdvAttributes} attribute observations as advisers`,
        reason: 'Item observations are not firms, filings, accounts, or clients.',
      },
      {
        total: `${input.canonicalFirms} canonical firms as the public roster`,
        reason: `${extra} extra identities lack ADV facts and are excluded from the SEC/IARD roster headline.`,
      },
      {
        total: 'National summed RAUM / AUM dollar total',
        reason: 'Duplicated filing vintages and ERA non-filing make an aggregate dollar headline unsafe.',
      },
      {
        total: 'NJ, CA, TX, WA, or AZ state-RIA universe = 0',
        reason: 'Missing bulk state rosters are UNKNOWN, not zero. Available-by-request is not acquired.',
      },
      {
        total: `${input.disclosureEvents} disclosure events as no-wrongdoing`,
        reason: 'Empty table is not a clean history. Item 11 is a checkbox, not a finding.',
      },
    ],
    metrics,
  };
}
