/**
 * investor-home-intel-v1 — INV-HOME-001 locked census + INV-HOME-002 payload.
 * Precomputed aggregates only. No homepage query of raw ADV observation rows.
 */

import { COMPENSATION_METHOD_LABELS } from './adv-profile-intelligence';
import { loadInvestorNetworkMetrics } from './load-network-metrics';

export const INVESTOR_HOME_INTEL_VERSION = 'investor-home-intel-v1' as const;
export const INVESTOR_HOME_PUBLICATION_VERSION = 'inv-home-002-v1' as const;

export const V1_SOURCE = {
  dataset: 'iapd_sec_compilation',
  releaseLabel: 'IA_FIRM_SEC_Feed_08_27_2026',
  publishedAt: '2026-08-27',
  retrievedAt: '2026-08-28',
  officialUrl:
    'https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers',
  iapdHome: 'https://adviserinfo.sec.gov/',
} as const;

/** SEC IARD monthly firm roster universe used for V1 homepage metrics. */
export const V1_SEC_ROSTER = {
  riaFacts: 17018,
  eraFacts: 6604,
  totalFacts: 23622,
  riaRegistered: 16783,
  riaPending: 235,
  eraReporting: 6604,
  indexableTrustReports: 1000,
  extraFirmsWithoutAdvFacts: 2155,
  allCanonicalFirms: 25777,
  mainOfficeBranches: 23622,
  rosterPrincipalOfficeWithRegion: 17997,
  rosterPrincipalOfficeNullRegion: 5625,
  advReportedAttributes: 5149596,
  advFilings: 635269,
} as const;

/** RIA-only reported total RAUM (Item 5F(2)(c)) bands. Zeros kept separate. */
export const V1_RIA_RAUM_BANDS = {
  zero: 613,
  under25m: 371,
  from25mTo100m: 759,
  from100mTo1b: 9887,
  from1bTo10b: 4023,
  atLeast10b: 1365,
} as const;

export const V1_FEATURED_STORY_IDS = [
  'sec-iard-ria-vs-era',
  'ria-reported-raum-bands',
  'ria-compensation-methods-5e',
] as const;

export type CoverageStatus =
  | 'available_nationally'
  | 'available_for_sec_firms'
  | 'partial'
  | 'source_limited'
  | 'unavailable'
  | 'not_yet_researched';

export type EvidenceDepthLabel =
  | 'Strong'
  | 'Partial'
  | 'Limited'
  | 'Enhanced in selected geographies'
  | 'Unavailable'
  | 'Not yet researched'
  | 'Requested / pending';

export type FeaturedFindingType = 'BENCHMARK' | 'GAP' | 'CHANGE';

export type ToolReadiness =
  | 'LIVE'
  | 'LIVE_BUT_LIMITED'
  | 'INTERNAL'
  | 'PLACEHOLDER'
  | 'NOT_IMPLEMENTED';

export type JourneyVisualState =
  | 'connected'
  | 'partial'
  | 'unavailable'
  | 'not_yet_published'
  | 'conflict_review';

export type MetricWithProvenance = {
  metricId: string;
  label: string;
  value: number | string;
  display: string;
  cohortDefinition: string;
  sourceIds: string[];
  sourceAsOf: string;
  retrievedAt: string;
  denominator?: number;
  exclusions: string[];
  limitation: string;
  grain: string;
  method: string;
  payloadKey: string;
};

export type CompensationMethodMetric = {
  field: '5E(1)' | '5E(2)' | '5E(3)' | '5E(4)' | '5E(5)' | '5E(6)' | '5E(7)';
  key: keyof typeof COMPENSATION_METHOD_LABELS;
  officialLabel: string;
  reportedYes: number;
  reportedNo: number;
  notFiledByFormType: number;
  eligibleDenominator: number;
};

export const V1_RIA_COMPENSATION_METHODS: readonly CompensationMethodMetric[] = [
  {
    field: '5E(1)',
    key: 'percentage_of_assets',
    officialLabel: COMPENSATION_METHOD_LABELS.percentage_of_assets ?? 'Percentage of assets under management',
    reportedYes: 16246,
    reportedNo: 772,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(2)',
    key: 'hourly_charges',
    officialLabel: COMPENSATION_METHOD_LABELS.hourly_charges ?? 'Hourly charges',
    reportedYes: 4925,
    reportedNo: 12093,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(3)',
    key: 'subscription_fees',
    officialLabel: COMPENSATION_METHOD_LABELS.subscription_fees ?? 'Subscription fees',
    reportedYes: 181,
    reportedNo: 16837,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(4)',
    key: 'fixed_fees',
    officialLabel: COMPENSATION_METHOD_LABELS.fixed_fees ?? 'Fixed fees',
    reportedYes: 7707,
    reportedNo: 9311,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(5)',
    key: 'commissions',
    officialLabel: COMPENSATION_METHOD_LABELS.commissions ?? 'Commissions',
    reportedYes: 324,
    reportedNo: 16694,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(6)',
    key: 'performance_based_fees',
    officialLabel: COMPENSATION_METHOD_LABELS.performance_based_fees ?? 'Performance-based fees',
    reportedYes: 6078,
    reportedNo: 10940,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
  {
    field: '5E(7)',
    key: 'other_compensation',
    officialLabel: COMPENSATION_METHOD_LABELS.other_compensation ?? 'Other',
    reportedYes: 2380,
    reportedNo: 14638,
    notFiledByFormType: 6604,
    eligibleDenominator: 17018,
  },
];

/** Roster principal-office region counts. Extra 2,155 non-roster firms are all unresolved and excluded. */
export const V1_ROSTER_PRINCIPAL_OFFICE_STATES: ReadonlyArray<{ region: string; count: number }> = [
  { region: 'NY', count: 3152 },
  { region: 'CA', count: 2699 },
  { region: 'TX', count: 1302 },
  { region: 'FL', count: 1284 },
  { region: 'MA', count: 803 },
  { region: 'IL', count: 793 },
  { region: 'PA', count: 623 },
  { region: 'CO', count: 589 },
  { region: 'CT', count: 584 },
  { region: 'NJ', count: 438 },
  { region: 'OH', count: 426 },
  { region: 'GA', count: 364 },
  { region: 'VA', count: 339 },
  { region: 'MI', count: 327 },
  { region: 'NC', count: 325 },
  { region: 'WA', count: 306 },
  { region: 'MN', count: 293 },
  { region: 'TN', count: 264 },
  { region: 'MD', count: 263 },
  { region: 'MO', count: 217 },
  { region: 'AZ', count: 213 },
  { region: 'WI', count: 211 },
  { region: 'UT', count: 192 },
  { region: 'OR', count: 167 },
  { region: 'IN', count: 161 },
  { region: 'KS', count: 139 },
  { region: 'SC', count: 122 },
  { region: 'NV', count: 99 },
  { region: 'AL', count: 98 },
  { region: 'IA', count: 95 },
  { region: 'DC', count: 91 },
  { region: 'OK', count: 91 },
  { region: 'KY', count: 89 },
  { region: 'NH', count: 86 },
  { region: 'LA', count: 84 },
  { region: 'PR', count: 83 },
  { region: 'NE', count: 71 },
  { region: 'DE', count: 70 },
  { region: 'AR', count: 61 },
  { region: 'ID', count: 56 },
  { region: 'RI', count: 51 },
  { region: 'WY', count: 45 },
  { region: 'VT', count: 37 },
  { region: 'MS', count: 35 },
  { region: 'ME', count: 33 },
  { region: 'MT', count: 27 },
  { region: 'NM', count: 27 },
  { region: 'HI', count: 22 },
  { region: 'SD', count: 17 },
  { region: 'WV', count: 12 },
  { region: 'AK', count: 9 },
  { region: 'ND', count: 9 },
  { region: 'VI', count: 3 },
];

export const REGION_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DC: 'District of Columbia',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  IA: 'Iowa',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  MA: 'Massachusetts',
  MD: 'Maryland',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MS: 'Mississippi',
  MT: 'Montana',
  NC: 'North Carolina',
  ND: 'North Dakota',
  NE: 'Nebraska',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NV: 'Nevada',
  NY: 'New York',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  PR: 'Puerto Rico',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VA: 'Virginia',
  VI: 'U.S. Virgin Islands',
  VT: 'Vermont',
  WA: 'Washington',
  WI: 'Wisconsin',
  WV: 'West Virginia',
  WY: 'Wyoming',
};

export type FeaturedFinding = {
  storyId: (typeof V1_FEATURED_STORY_IDS)[number];
  storyType: FeaturedFindingType;
  title: string;
  summary: string;
  cohortDefinition: string;
  visualization: 'split_bars' | 'banded_bars' | 'method_flags';
  whyItMatters: string;
  doesNotMean: string[];
  chartCaption: string;
  series: Array<{ key: string; label: string; count: number; shareOf: number; independent?: boolean }>;
  sourceIds: string[];
  officialAsOf: string;
  retrievedAt: string;
  limitation: string;
  confidence: 'high' | 'medium' | 'low';
  readyForV1: boolean;
};

export type EvidenceCoverageItem = {
  family: string;
  status: CoverageStatus;
  depth: EvidenceDepthLabel;
  note: string;
};

export type EvidenceJourneyStep = {
  stepId: string;
  label: string;
  status: JourneyVisualState;
  note: string;
};

export type SourceLedgerItem = {
  sourceId: string;
  agency: string;
  dataset: string;
  releaseLabel: string;
  officialAsOf: string;
  retrievedAt: string;
  grain: string;
  definition: string;
  coverage: string;
  officialUrl: string;
  usedFor: string;
  limitation: string;
};

export type HomepageToolState = {
  href: string;
  label: string;
  note: string;
  status: ToolReadiness;
  homepageCtaAllowed: boolean;
};

export type AskItem = {
  id: string;
  question: string;
  answer: string;
  href: string;
  hrefLabel: string;
  payloadKeys: string[];
};

export type ChecklistItem = {
  id: string;
  label: string;
  href: string;
};

export type SecondAxisItem = {
  id: string;
  label: string;
  status: EvidenceDepthLabel;
  href: string;
  note: string;
};

export type GeographyCell = {
  region: string | null;
  name: string;
  count: number;
  meaning: 'principal_office' | 'unresolved';
  searchHref: string;
};

export type InvestorHomeIntelV1 = {
  contract: typeof INVESTOR_HOME_INTEL_VERSION;
  generatedAt: string;
  payloadFingerprint: string;
  homepagePublicationVersion: typeof INVESTOR_HOME_PUBLICATION_VERSION;
  freshnessClocks?: {
    generatedAt: string;
    newestDocumentedSourceAsOf: string | null;
    note: string;
  };
  score: null;
  ranking: null;
  changeCapability: { status: 'UNSUPPORTED'; reason: string };
  metadata: {
    canonicalUrl: string;
    primarySourceDataset: typeof V1_SOURCE.dataset;
    primaryReleaseLabel: typeof V1_SOURCE.releaseLabel;
    publishedAt: typeof V1_SOURCE.publishedAt;
    retrievedAt: typeof V1_SOURCE.retrievedAt;
  };
  snapshot: {
    rosterUniverse: MetricWithProvenance;
    ria: MetricWithProvenance;
    era: MetricWithProvenance;
    advObservations: MetricWithProvenance;
    indexableTrustReports: MetricWithProvenance;
  };
  findings: FeaturedFinding[];
  evidenceDepth: EvidenceCoverageItem[];
  missingness: string[];
  geography: {
    resolved: MetricWithProvenance;
    unresolved: MetricWithProvenance;
    cells: GeographyCell[];
  };
  secondAxis: SecondAxisItem[];
  ask: AskItem[];
  tools: HomepageToolState[];
  checklist: ChecklistItem[];
  evidenceJourney: EvidenceJourneyStep[];
  sources: SourceLedgerItem[];
  limitations: string[];
};

export const V1_HOMEPAGE_TOOLS: HomepageToolState[] = [
  {
    href: '/firms',
    label: 'Research a firm',
    note: 'Search by firm name, CRD, SEC file number, or principal-office state.',
    status: 'LIVE',
    homepageCtaAllowed: true,
  },
  {
    href: '/firms',
    label: 'Wave-1 Firm Trust Reports',
    note: '1,000 indexable reports. That publication gate is not a quality ranking.',
    status: 'LIVE_BUT_LIMITED',
    homepageCtaAllowed: true,
  },
  {
    href: '/methodology',
    label: 'Methodology',
    note: 'How InvestorTrustHub organizes SEC/IARD evidence.',
    status: 'LIVE',
    homepageCtaAllowed: true,
  },
  {
    href: '/sources',
    label: 'Sources',
    note: 'Official catalogs and source notes.',
    status: 'LIVE',
    homepageCtaAllowed: true,
  },
  {
    href: '/research',
    label: 'Research questions',
    note: 'Educational questions. Not a live offer-verifier.',
    status: 'LIVE_BUT_LIMITED',
    homepageCtaAllowed: true,
  },
  {
    href: '/about',
    label: 'About',
    note: 'Independence and product boundaries.',
    status: 'LIVE',
    homepageCtaAllowed: true,
  },
  {
    href: '/professionals',
    label: 'Professional directory',
    note: 'Not yet published as live IAR research.',
    status: 'PLACEHOLDER',
    homepageCtaAllowed: false,
  },
  {
    href: '/compare',
    label: 'Compare',
    note: 'Not available yet.',
    status: 'PLACEHOLDER',
    homepageCtaAllowed: false,
  },
  {
    href: '/tools',
    label: 'Decision Lab',
    note: 'Coming soon. Calculators are not the homepage product.',
    status: 'NOT_IMPLEMENTED',
    homepageCtaAllowed: false,
  },
];

export const V1_LOCKED_LIMITATIONS: readonly string[] = [
  'ERA is not an RIA. Do not combine registration classes into a single “advisers” total.',
  'The V1 national firm universe is the SEC IARD monthly roster (23,622), not all canonical firms (25,777).',
  'The extra 2,155 canonical firms lack form_adv_firm_facts / firm_kinds and must not be mixed into RIA+ERA totals.',
  'Reported RAUM is filer-supplied Form ADV Item 5F(2)(c). It is not performance, quality, or popularity.',
  'A RAUM value of zero is a reported value, not missing data. Null and zero remain distinct.',
  'Principal-office state is not service territory and is not state registration authority.',
  'Item 5.E compensation fields are Y/N methods, not dollar rates or recommendations.',
  'Item 5.D FOIA-style client-type fields are NOT_PRESENT_IN_SOURCE for this extract and are not a V1 story.',
  'Item 11 disclosure_indicator is a filer checkbox, not proof of misconduct. Missing is not a clean record.',
  'disclosure_events has 0 rows. No enforcement-case census belongs on the homepage.',
  'FINRA/BrokerCheck dual-registration is NOT AVAILABLE FOR V1 NATIONAL METRIC.',
  'Professional public search is synthetic-only. Do not promise live IAR search on V1.',
  'Historical change comparison is NOT READY. Do not render a What Changed module.',
  'AUM is not performance. Firm size is not quality. Registration is not endorsement.',
];

export function assertEraIsNotRia(): boolean {
  const ria: number = V1_SEC_ROSTER.riaFacts;
  const era: number = V1_SEC_ROSTER.eraFacts;
  return ria !== era && ria + era === V1_SEC_ROSTER.totalFacts;
}

export function assertRaumBandsCoverRiaPopulation(): boolean {
  const sum =
    V1_RIA_RAUM_BANDS.zero +
    V1_RIA_RAUM_BANDS.under25m +
    V1_RIA_RAUM_BANDS.from25mTo100m +
    V1_RIA_RAUM_BANDS.from100mTo1b +
    V1_RIA_RAUM_BANDS.from1bTo10b +
    V1_RIA_RAUM_BANDS.atLeast10b;
  return sum === V1_SEC_ROSTER.riaFacts;
}

export function assertCompensationMethodsAreIndependent(): boolean {
  return V1_RIA_COMPENSATION_METHODS.every((row) => {
    return (
      row.eligibleDenominator === V1_SEC_ROSTER.riaFacts &&
      row.reportedYes + row.reportedNo === row.eligibleDenominator &&
      row.notFiledByFormType === V1_SEC_ROSTER.eraFacts
    );
  });
}

export function assertPrincipalOfficeGeographyReconciles(): boolean {
  const resolved = V1_ROSTER_PRINCIPAL_OFFICE_STATES.reduce((sum, row) => sum + row.count, 0);
  return (
    resolved === V1_SEC_ROSTER.rosterPrincipalOfficeWithRegion &&
    resolved + V1_SEC_ROSTER.rosterPrincipalOfficeNullRegion === V1_SEC_ROSTER.totalFacts
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function sharePct(part: number, whole: number): string {
  return `${((100 * part) / whole).toFixed(1)}%`;
}

function metric(partial: Omit<MetricWithProvenance, 'sourceIds' | 'sourceAsOf' | 'retrievedAt'>): MetricWithProvenance {
  return {
    ...partial,
    sourceIds: [V1_SOURCE.dataset],
    sourceAsOf: V1_SOURCE.publishedAt,
    retrievedAt: V1_SOURCE.retrievedAt,
  };
}

export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprintInvestorHomeIntel(payload: InvestorHomeIntelV1): Promise<string> {
  const { generatedAt: _generatedAt, payloadFingerprint: _fp, freshnessClocks: _clocks, ...rest } = payload;
  void _generatedAt;
  void _fp;
  void _clocks;
  return sha256Hex(stableSerialize(rest));
}

function buildSnapshot() {
  const roster = V1_SEC_ROSTER.totalFacts;
  return {
    rosterUniverse: metric({
      metricId: 'sec-iard-roster',
      label: 'Investment advisory firms',
      value: roster,
      display: fmt(roster),
      cohortDefinition:
        'Current monthly SEC IARD registered-investment-adviser plus exempt-reporting-adviser firm facts.',
      exclusions: [
        `${fmt(V1_SEC_ROSTER.extraFirmsWithoutAdvFacts)} canonical firms without ADV facts`,
        'people / IAR rows',
        'internal products',
      ],
      limitation: 'This is the V1 homepage universe. It is not all canonical firm identities (25,777).',
      grain: 'firm-level form_adv_firm_facts rows (one current roster row per CRD in the extract)',
      method: 'COUNT of form_adv_firm_facts = COUNT of firm registrations = 17,018 RIA + 6,604 ERA',
      payloadKey: 'snapshot.rosterUniverse',
      denominator: roster,
    }),
    ria: metric({
      metricId: 'ria-facts',
      label: 'Registered investment adviser records',
      value: V1_SEC_ROSTER.riaFacts,
      display: fmt(V1_SEC_ROSTER.riaFacts),
      cohortDefinition: 'form_adv_firm_facts where dataset_kind = ria (16,783 registered + 235 pending).',
      exclusions: ['ERA filers', 'non-roster canonical firms'],
      limitation:
        'Pending (235) is included in the RIA filer count. Pending is not SEC approval or endorsement.',
      grain: 'RIA firm facts',
      method: 'COUNT of RIA facts',
      payloadKey: 'snapshot.ria',
      denominator: roster,
    }),
    era: metric({
      metricId: 'era-facts',
      label: 'Exempt reporting adviser records',
      value: V1_SEC_ROSTER.eraFacts,
      display: fmt(V1_SEC_ROSTER.eraFacts),
      cohortDefinition: 'form_adv_firm_facts where dataset_kind = era; status = reporting.',
      exclusions: ['RIA filers'],
      limitation: 'ERA is not an RIA. Exemption from full registration is not a safety finding.',
      grain: 'ERA firm facts',
      method: 'COUNT of ERA facts',
      payloadKey: 'snapshot.era',
      denominator: roster,
    }),
    advObservations: metric({
      metricId: 'adv-reported-attributes',
      label: 'Form ADV attribute observations',
      value: V1_SEC_ROSTER.advReportedAttributes,
      display: fmt(V1_SEC_ROSTER.advReportedAttributes),
      cohortDefinition: 'Normalized Item-level reported_attributes supporting firm research.',
      exclusions: ['Not a count of firms', 'Not a count of violations'],
      limitation: 'Observation count describes evidence depth, not firm quality.',
      grain: 'form_adv_reported_attributes rows',
      method: 'COUNT of normalized ADV attribute rows',
      payloadKey: 'snapshot.advObservations',
    }),
    indexableTrustReports: metric({
      metricId: 'wave1-trust-reports',
      label: 'Indexable Wave-1 Firm Trust Reports',
      value: V1_SEC_ROSTER.indexableTrustReports,
      display: fmt(V1_SEC_ROSTER.indexableTrustReports),
      cohortDefinition: 'search_documents where entity_kind = firm and indexable = true.',
      exclusions: [`${fmt(roster - V1_SEC_ROSTER.indexableTrustReports)} roster firms not in Wave 1`],
      limitation: 'A publication content gate. Not the top 1,000 firms. Non-indexable ≠ lower quality.',
      grain: 'indexable firm search documents',
      method: 'COUNT of indexable firm search_documents',
      payloadKey: 'snapshot.indexableTrustReports',
      denominator: roster,
    }),
  };
}

function buildFindings(): FeaturedFinding[] {
  const ria = V1_SEC_ROSTER.riaFacts;
  const era = V1_SEC_ROSTER.eraFacts;
  const roster = V1_SEC_ROSTER.totalFacts;
  return [
    {
      storyId: 'sec-iard-ria-vs-era',
      storyType: 'BENCHMARK',
      title: 'The SEC/IARD adviser-firm universe includes both RIAs and ERAs',
      summary: `${fmt(roster)} current SEC/IARD roster firms: ${fmt(ria)} RIA filers and ${fmt(era)} exempt reporting advisers. They are different regulatory categories.`,
      cohortDefinition: 'SEC IARD monthly RIA + ERA firm facts (23,622).',
      visualization: 'split_bars',
      whyItMatters:
        'Consumers often treat “on IARD” as “SEC-registered RIA.” The extract shows two classes that must stay distinct.',
      doesNotMean: [
        'RIA is automatically better than ERA.',
        'ERA is automatically riskier.',
        'SEC registration is endorsement or approval.',
        'The larger category is higher quality.',
        'Pending RIA status is SEC approval.',
      ],
      chartCaption: `RIA vs ERA composition of ${fmt(roster)} SEC/IARD roster firms`,
      series: [
        { key: 'ria', label: 'RIA filers', count: ria, shareOf: roster },
        { key: 'era', label: 'Exempt reporting advisers', count: era, shareOf: roster },
      ],
      sourceIds: [V1_SOURCE.dataset],
      officialAsOf: V1_SOURCE.publishedAt,
      retrievedAt: V1_SOURCE.retrievedAt,
      limitation: 'Extra 2,155 canonical firms without ADV facts are excluded from this denominator.',
      confidence: 'high',
      readyForV1: true,
    },
    {
      storyId: 'ria-reported-raum-bands',
      storyType: 'BENCHMARK',
      title: 'How RIAs report regulatory assets under management',
      summary: `Among ${fmt(ria)} RIA facts, reported Form ADV Item 5F(2)(c) RAUM is grouped into bands. ERA filers do not file this item and are excluded.`,
      cohortDefinition: '17,018 RIA facts only. ERA excluded.',
      visualization: 'banded_bars',
      whyItMatters:
        'RAUM is a filer-reported regulatory size figure. Banding shows structure without ranking quality or inventing performance.',
      doesNotMean: [
        'Investment performance or returns.',
        'Quality, trustworthiness, or popularity.',
        'A recommendation to hire a larger or smaller firm.',
        'A national AUM total (this page does not sum RAUM).',
      ],
      chartCaption: `Reported RAUM bands among ${fmt(ria)} RIA facts (Item 5F(2)(c))`,
      series: [
        { key: 'zero', label: 'Reported zero', count: V1_RIA_RAUM_BANDS.zero, shareOf: ria },
        { key: 'under25m', label: 'Under $25 million', count: V1_RIA_RAUM_BANDS.under25m, shareOf: ria },
        { key: 'from25mTo100m', label: '$25 million–under $100 million', count: V1_RIA_RAUM_BANDS.from25mTo100m, shareOf: ria },
        { key: 'from100mTo1b', label: '$100 million–under $1 billion', count: V1_RIA_RAUM_BANDS.from100mTo1b, shareOf: ria },
        { key: 'from1bTo10b', label: '$1 billion–under $10 billion', count: V1_RIA_RAUM_BANDS.from1bTo10b, shareOf: ria },
        { key: 'atLeast10b', label: '$10 billion or more', count: V1_RIA_RAUM_BANDS.atLeast10b, shareOf: ria },
      ],
      sourceIds: [V1_SOURCE.dataset, 'form_adv'],
      officialAsOf: V1_SOURCE.publishedAt,
      retrievedAt: V1_SOURCE.retrievedAt,
      limitation:
        'Filer-supplied. Zero is reported, not missing. Bands are research conveniences, not official SEC size classes.',
      confidence: 'high',
      readyForV1: true,
    },
    {
      storyId: 'ria-compensation-methods-5e',
      storyType: 'BENCHMARK',
      title: 'How RIAs report compensation methods on Form ADV Item 5.E',
      summary: `Item 5.E is multi-select. Each method is an independent Y/N among ${fmt(ria)} RIA filers. ERA rows are NOT_FILED_BY_FORM_TYPE and are not treated as eligible.`,
      cohortDefinition: 'RIA filers only, where Item 5.E is applicable (17,018).',
      visualization: 'method_flags',
      whyItMatters:
        'Compensation on Form ADV is a set of reported methods, not a price, and not a “fee-only” badge derived from one checkbox.',
      doesNotMean: [
        'Actual dollar fees paid by a client.',
        'A “fee-only” classification.',
        'Cheapest or best pricing.',
        'Shares that sum to 100% (methods overlap).',
        'Investment performance.',
      ],
      chartCaption: `Independent Item 5.E YES counts among ${fmt(ria)} eligible RIA filers (multi-select)`,
      series: V1_RIA_COMPENSATION_METHODS.map((row) => ({
        key: row.field,
        label: `${row.field} · ${row.officialLabel}`,
        count: row.reportedYes,
        shareOf: row.eligibleDenominator,
        independent: true,
      })),
      sourceIds: [V1_SOURCE.dataset, 'form_adv'],
      officialAsOf: V1_SOURCE.publishedAt,
      retrievedAt: V1_SOURCE.retrievedAt,
      limitation: 'Y/N methods only. Brochure narrative is not reduced to these boxes.',
      confidence: 'high',
      readyForV1: true,
    },
  ];
}

function buildAsk(): AskItem[] {
  const ria = V1_SEC_ROSTER.riaFacts;
  const era = V1_SEC_ROSTER.eraFacts;
  const roster = V1_SEC_ROSTER.totalFacts;
  const assetMethod = V1_RIA_COMPENSATION_METHODS[0]!;
  return [
    {
      id: 'ria-vs-era',
      question: 'What is the difference between an RIA and an ERA?',
      answer: `An RIA (registered investment adviser) files as a registered adviser. An ERA (exempt reporting adviser) files a limited report because it qualifies for an exemption from full SEC registration. ERA is not an RIA. In this extract: ${fmt(ria)} RIA filers and ${fmt(era)} ERAs among ${fmt(roster)} SEC/IARD roster firms.`,
      href: '#findings',
      hrefLabel: 'See the RIA vs ERA finding',
      payloadKeys: ['snapshot.ria', 'snapshot.era', 'snapshot.rosterUniverse'],
    },
    {
      id: 'raum-meaning',
      question: 'What does regulatory AUM mean?',
      answer: `Regulatory assets under management (RAUM) here is Form ADV Item 5F(2)(c) as the RIA filer reported it. It is a regulatory size figure, not investment performance, returns, or a quality score. ERA filers do not file this item. Denominator: ${fmt(ria)} RIA facts.`,
      href: '#findings',
      hrefLabel: 'See reported RAUM bands',
      payloadKeys: ['snapshot.ria', 'findings.ria-reported-raum-bands'],
    },
    {
      id: 'more-aum',
      question: 'Does more AUM mean a better adviser?',
      answer:
        'No. Larger reported RAUM is not better, safer, more honest, or more suitable. This page bands reported RAUM and does not sum national AUM or rank firms by size.',
      href: '#gaps',
      hrefLabel: 'Read what this does not mean',
      payloadKeys: ['findings.ria-reported-raum-bands'],
    },
    {
      id: 'compensation',
      question: 'How do investment advisers report being compensated?',
      answer: `RIA filers check Form ADV Item 5.E methods. The item is multi-select, so shares do not sum to 100%. Example: ${fmt(assetMethod.reportedYes)} of ${fmt(assetMethod.eligibleDenominator)} eligible RIAs reported “${assetMethod.officialLabel}” (field ${assetMethod.field}). These are methods, not dollar rates, and not a fee-only classification.`,
      href: '#findings',
      hrefLabel: 'See Item 5.E methods',
      payloadKeys: ['findings.ria-compensation-methods-5e'],
    },
    {
      id: 'sec-approved',
      question: 'Does SEC registration mean the SEC approved the firm?',
      answer:
        'No. Registration is a regulatory category reported in the cited IARD dataset. InvestorTrustHub does not treat source status text such as “Approved” as SEC endorsement. Pending / 120-day language is not approval either.',
      href: '/methodology',
      hrefLabel: 'Read methodology',
      payloadKeys: ['snapshot.ria'],
    },
    {
      id: 'crd',
      question: 'What does a CRD number identify?',
      answer:
        'A CRD number is the Central Registration Depository identifier for a firm (or, in other systems, a person). InvestorTrustHub uses organization CRD as the firm identity key. A CRD is an identifier, not an endorsement.',
      href: '/firms',
      hrefLabel: 'Research a firm by CRD',
      payloadKeys: ['snapshot.rosterUniverse'],
    },
    {
      id: 'research-firm',
      question: 'How can I research a specific investment firm?',
      answer: `Search the firm directory by name, CRD, SEC file number, or principal-office state. ${fmt(V1_SEC_ROSTER.indexableTrustReports)} firms currently have indexable Wave-1 Trust Reports. That is a publication cohort, not a ranking. Individual professional / IAR pages are not yet published.`,
      href: '/firms',
      hrefLabel: 'Open firm search',
      payloadKeys: ['snapshot.indexableTrustReports'],
    },
  ];
}

export async function buildInvestorHomeIntelV1(
  generatedAt = new Date().toISOString(),
): Promise<InvestorHomeIntelV1> {
  const network = loadInvestorNetworkMetrics();
  if (
    network.identity.rosterFirms !== V1_SEC_ROSTER.totalFacts ||
    network.identity.riaFacts !== V1_SEC_ROSTER.riaFacts ||
    network.identity.eraFacts !== V1_SEC_ROSTER.eraFacts ||
    network.formAdv.attributeObservations !== V1_SEC_ROSTER.advReportedAttributes ||
    network.publication.indexableTrustReports !== V1_SEC_ROSTER.indexableTrustReports
  ) {
    throw new Error('homepage census diverged from investor-network-metrics-v1');
  }
  const snapshot = buildSnapshot();
  const findings = buildFindings();
  const geoResolved = metric({
    metricId: 'principal-office-resolved',
    label: 'Roster firms with a principal-office region',
    value: V1_SEC_ROSTER.rosterPrincipalOfficeWithRegion,
    display: fmt(V1_SEC_ROSTER.rosterPrincipalOfficeWithRegion),
    cohortDefinition: 'Main-office branch region on the 23,622-firm SEC IARD roster.',
    exclusions: ['Service territory', 'Notice-filing jurisdictions'],
    limitation: 'Principal office is not where the firm serves clients.',
    grain: 'roster firm main-office region',
    method: 'COUNT of roster firms with a non-null principal-office region',
    payloadKey: 'geography.resolved',
    denominator: V1_SEC_ROSTER.totalFacts,
  });
  const geoUnresolved = metric({
    metricId: 'principal-office-unresolved',
    label: 'Roster firms with unresolved principal-office region',
    value: V1_SEC_ROSTER.rosterPrincipalOfficeNullRegion,
    display: fmt(V1_SEC_ROSTER.rosterPrincipalOfficeNullRegion),
    cohortDefinition: 'Roster main-office rows with no usable region in the extract.',
    exclusions: [],
    limitation: 'Unresolved is not zero activity and is not dropped from the national picture.',
    grain: 'roster firm main-office region',
    method: 'COUNT of roster firms with null principal-office region',
    payloadKey: 'geography.unresolved',
    denominator: V1_SEC_ROSTER.totalFacts,
  });

  const draft: InvestorHomeIntelV1 = {
    contract: INVESTOR_HOME_INTEL_VERSION,
    generatedAt,
    payloadFingerprint: '',
    homepagePublicationVersion: INVESTOR_HOME_PUBLICATION_VERSION,
    score: null,
    ranking: null,
    changeCapability: {
      status: 'UNSUPPORTED',
      reason:
        'Filing rows exist, but this page has no locked prior homepage vintage for a V1.1-safe immutable comparison.',
    },
    metadata: {
      canonicalUrl: 'https://www.investortrusthub.com/',
      primarySourceDataset: V1_SOURCE.dataset,
      primaryReleaseLabel: V1_SOURCE.releaseLabel,
      publishedAt: V1_SOURCE.publishedAt,
      retrievedAt: V1_SOURCE.retrievedAt,
    },
    snapshot,
    findings,
    evidenceDepth: [
      {
        family: 'Firm identity / CRD',
        status: 'available_for_sec_firms',
        depth: 'Strong',
        note: 'Organization CRD is the firm identity key on the roster.',
      },
      {
        family: 'SEC/IARD registration',
        status: 'available_for_sec_firms',
        depth: 'Strong',
        note: 'Reported registration class and source status text, not endorsement.',
      },
      {
        family: 'RIA vs ERA classification',
        status: 'available_for_sec_firms',
        depth: 'Strong',
        note: 'Kept as separate classes. ERA is not an RIA.',
      },
      {
        family: 'Regulatory AUM',
        status: 'available_for_sec_firms',
        depth: 'Strong',
        note: 'RIA Item 5F(2)(c) only. ERA does not file RAUM.',
      },
      {
        family: 'ADV compensation methods',
        status: 'available_for_sec_firms',
        depth: 'Strong',
        note: 'Item 5.E Y/N methods for RIAs. Not dollar rates.',
      },
      {
        family: 'Ownership / Schedule A/B',
        status: 'partial',
        depth: 'Partial',
        note: 'Extensive internal rows exist. Public display is confidence-gated on profiles. Not a homepage story.',
      },
      {
        family: 'Affiliations',
        status: 'partial',
        depth: 'Partial',
        note: 'Item 6/7 flags are filer-reported. Not a FINRA broker-dealer census.',
      },
      {
        family: 'Custody indicators',
        status: 'partial',
        depth: 'Partial',
        note: 'Item 9 Y/N on profiles. ERA does not file Item 9.',
      },
      {
        family: 'Item 11 disclosure indicator',
        status: 'source_limited',
        depth: 'Limited',
        note: 'Filer checkbox, not an enforcement-event count. disclosure_events = 0.',
      },
      {
        family: 'Firm filings / history',
        status: 'partial',
        depth: 'Partial',
        note: 'Filing rows exist for profiles. Not a homepage What Changed module.',
      },
      {
        family: 'Firm Trust Reports',
        status: 'partial',
        depth: 'Partial',
        note: '1,000 indexable Wave-1 reports. Publication gate, not a ranking.',
      },
      {
        family: 'Professional / IAR research',
        status: 'unavailable',
        depth: 'Not yet researched',
        note: 'Public person registrations = 0. Not a live directory.',
      },
      {
        family: 'FINRA / BrokerCheck evidence',
        status: 'unavailable',
        depth: 'Unavailable',
        note: 'Not part of V1 national evidence. Dual-registration metric unavailable.',
      },
      {
        family: 'Detailed enforcement events',
        status: 'unavailable',
        depth: 'Unavailable',
        note: 'No national enforcement-event census in disclosure_events.',
      },
      {
        family: 'Client types',
        status: 'unavailable',
        depth: 'Unavailable',
        note: 'Item 5.D FOIA fields are not present in the current extraction.',
      },
      {
        family: 'Investment performance',
        status: 'unavailable',
        depth: 'Unavailable',
        note: 'Not researched and not inferred from AUM or registration.',
      },
    ],
    missingness: [
      'SEC/IARD presence is not endorsement.',
      'RIA is not ERA.',
      'RAUM is not investment performance.',
      'Larger RAUM is not a better adviser.',
      'Principal office is not client service territory.',
      'Compensation method is not an actual fee amount.',
      'Item 5.E is not a “fee-only” classification by itself.',
      'Item 11 indicator is not an enforcement-event count.',
      'No disclosure found is not a clean history.',
      'BrokerCheck is not yet part of V1 national evidence.',
      'Professional / IAR public research is not yet published.',
      'Client-type analytics are not available from the current extraction.',
      '1,000 indexable Trust Reports is not the top 1,000 firms.',
      'Non-indexable is not a lower-quality firm.',
    ],
    geography: {
      resolved: geoResolved,
      unresolved: geoUnresolved,
      cells: [
        ...V1_ROSTER_PRINCIPAL_OFFICE_STATES.map((row) => ({
          region: row.region,
          name: REGION_NAMES[row.region] ?? row.region,
          count: row.count,
          meaning: 'principal_office' as const,
          searchHref: `/firms?state=${row.region}`,
        })),
        {
          region: null,
          name: 'Principal-office region unresolved',
          count: V1_SEC_ROSTER.rosterPrincipalOfficeNullRegion,
          meaning: 'unresolved' as const,
          searchHref: '/firms?state=_none',
        },
      ],
    },
    secondAxis: [
      {
        id: 'registration',
        label: 'Registration class',
        status: 'Strong',
        href: '#findings',
        note: 'RIA vs ERA on the current SEC/IARD roster.',
      },
      {
        id: 'raum',
        label: 'Reported RAUM',
        status: 'Strong',
        href: '#findings',
        note: 'RIA Item 5F(2)(c) bands. Not performance.',
      },
      {
        id: 'compensation',
        label: 'Compensation methods',
        status: 'Strong',
        href: '#findings',
        note: 'RIA Item 5.E independent Y/N methods.',
      },
      {
        id: 'trust-reports',
        label: 'Firm Trust Reports',
        status: 'Partial',
        href: '/firms',
        note: 'Wave-1 publication cohort of 1,000 indexable profiles.',
      },
      {
        id: 'ownership',
        label: 'Ownership / control',
        status: 'Partial',
        href: '/methodology',
        note: 'Available on profiles where confidence gates pass. Not a national story.',
      },
      {
        id: 'client-types',
        label: 'Client types',
        status: 'Unavailable',
        href: '#gaps',
        note: 'Item 5.D is not present in the current extraction.',
      },
      {
        id: 'professionals',
        label: 'Professionals / IARs',
        status: 'Not yet researched',
        href: '#gaps',
        note: 'Public professional research is not published.',
      },
    ],
    ask: buildAsk(),
    tools: V1_HOMEPAGE_TOOLS.filter((tool) => tool.homepageCtaAllowed),
    checklist: [
      { id: 'identity', label: 'Verify firm identity (name, CRD, SEC file number)', href: '/firms' },
      { id: 'class', label: 'Check RIA vs ERA status as the source reports it', href: '#findings' },
      { id: 'raum', label: 'Review reported RAUM as a size figure, not performance', href: '#findings' },
      { id: 'fees', label: 'Review reported compensation methods (not dollar rates)', href: '#findings' },
      { id: 'ownership', label: 'Review ownership and affiliations on a Trust Report where available', href: '/firms' },
      { id: 'disclosures', label: 'Read disclosure evidence as source text, not a verdict', href: '/methodology' },
      { id: 'limits', label: 'Read source limitations before deciding', href: '#sources' },
    ],
    evidenceJourney: [
      { stepId: 'crd', label: 'Official CRD identity', status: 'connected', note: 'Organization CRD on the roster.' },
      { stepId: 'registration', label: 'SEC/IARD registration', status: 'connected', note: 'Reported class and source status text.' },
      { stepId: 'ria-era', label: 'RIA / ERA classification', status: 'connected', note: 'Separate classes; ERA is not an RIA.' },
      { stepId: 'adv', label: 'Form ADV filing', status: 'connected', note: 'Current extract filing metadata on facts.' },
      { stepId: 'raum', label: 'Reported RAUM', status: 'partial', note: 'RIA only. ERA does not file Item 5F.' },
      { stepId: 'compensation', label: 'Compensation / business practices', status: 'partial', note: 'Item 5.E methods for RIAs.' },
      { stepId: 'ownership', label: 'Ownership / affiliations', status: 'partial', note: 'Profile-gated; not a national headcount.' },
      { stepId: 'disclosure', label: 'Disclosure evidence where supported', status: 'partial', note: 'Indicator only; no event census.' },
      { stepId: 'report', label: 'Public firm Trust Report', status: 'partial', note: '1,000 Wave-1 indexable profiles.' },
      { stepId: 'iar', label: 'Professional / IAR branch', status: 'not_yet_published', note: 'Not a V1 public product.' },
    ],
    sources: [
      {
        sourceId: V1_SOURCE.dataset,
        agency: 'U.S. Securities and Exchange Commission',
        dataset: 'IAPD / IARD monthly SEC firm compilation (RIA + ERA files)',
        releaseLabel: V1_SOURCE.releaseLabel,
        officialAsOf: V1_SOURCE.publishedAt,
        retrievedAt: V1_SOURCE.retrievedAt,
        grain: 'firm-level current roster facts',
        definition: 'Monthly official extract of SEC-registered investment advisers and exempt reporting advisers.',
        coverage: '23,622 current form_adv_firm_facts rows',
        officialUrl: V1_SOURCE.officialUrl,
        usedFor: 'Roster universe, RIA/ERA split, RAUM, Item 5.E, principal-office geography',
        limitation: 'Filer-supplied. Not SEC endorsement. Not a complete history of every amendment.',
      },
      {
        sourceId: 'form_adv',
        agency: 'U.S. Securities and Exchange Commission',
        dataset: 'Form ADV / IARD adviser filings',
        releaseLabel: V1_SOURCE.releaseLabel,
        officialAsOf: V1_SOURCE.publishedAt,
        retrievedAt: V1_SOURCE.retrievedAt,
        grain: 'normalized Item observations on the current roster',
        definition: 'Form ADV items stored as reported attributes and firm facts.',
        coverage: `${fmt(V1_SEC_ROSTER.advReportedAttributes)} normalized observations`,
        officialUrl: V1_SOURCE.officialUrl,
        usedFor: 'RAUM bands, Item 5.E methods, evidence depth',
        limitation: 'Current extract semantics. Item 5.D client types are not present in this extraction.',
      },
    ],
    limitations: [...V1_LOCKED_LIMITATIONS],
  };

  const intel = { ...draft, payloadFingerprint: await fingerprintInvestorHomeIntel(draft) };
  return {
    ...intel,
    freshnessClocks: {
      generatedAt: network.generatedAt,
      newestDocumentedSourceAsOf: network.newestDocumentedSourceAsOf,
      note: network.newestDocumentedSourceAsOfNote,
    },
  };
}

export function compensationYesShare(field: CompensationMethodMetric['field']): number {
  const row = V1_RIA_COMPENSATION_METHODS.find((item) => item.field === field);
  if (!row) return 0;
  return row.reportedYes / row.eligibleDenominator;
}

export function riaShareOfRoster(): string {
  return sharePct(V1_SEC_ROSTER.riaFacts, V1_SEC_ROSTER.totalFacts);
}

export function eraShareOfRoster(): string {
  return sharePct(V1_SEC_ROSTER.eraFacts, V1_SEC_ROSTER.totalFacts);
}
