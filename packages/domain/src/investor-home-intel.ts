/**
 * investor-home-intel-v1 — INV-HOME-001 locked baseline.
 * Types and census constants only. No homepage UI. No production publish.
 */

export const INVESTOR_HOME_INTEL_VERSION = 'investor-home-intel-v1' as const;
export const INVESTOR_HOME_PUBLICATION_VERSION = 'inv-home-001-v1' as const;

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

export type FeaturedFindingType = 'BENCHMARK' | 'GAP' | 'CHANGE';

export type ToolReadiness =
  | 'LIVE'
  | 'LIVE_BUT_LIMITED'
  | 'INTERNAL'
  | 'PLACEHOLDER'
  | 'NOT_IMPLEMENTED';

export type JourneyVisualState = 'connected' | 'unavailable' | 'source_conflict';

export type MetricWithProvenance = {
  metricId: string;
  label: string;
  value: number | string;
  cohortDefinition: string;
  sourceIds: string[];
  sourceAsOf?: string;
  filingDate?: string;
  retrievedAt?: string;
  denominator?: number;
  exclusions?: string[];
  limitation: string;
  grain: string;
};

export type DistributionBucket = {
  key: string;
  label: string;
  count: number;
  shareOfDenominator?: number;
};

export type DistributionWithProvenance = {
  metricId: string;
  label: string;
  denominator: number;
  buckets: DistributionBucket[];
  provenance: MetricWithProvenance;
};

export type StateMetric = {
  region: string | null;
  count: number;
  meaning: 'principal_office' | 'registration_notice' | 'unresolved';
};

export type FeaturedFinding = {
  storyId: (typeof V1_FEATURED_STORY_IDS)[number] | string;
  storyType: FeaturedFindingType;
  title: string;
  cohortDefinition: string;
  metric: MetricWithProvenance;
  visualization: 'split_bars' | 'banded_bars' | 'method_flags' | 'state_map';
  limitation: string;
  confidence: 'high' | 'medium' | 'low';
  readyForV1: boolean;
};

export type EvidenceCoverageItem = {
  family: string;
  status: CoverageStatus;
  note: string;
};

export type EvidenceJourneyStep = {
  stepId: string;
  label: string;
  sourceFamily: string;
  implementation: string;
  status: 'available' | 'partial' | 'unavailable';
  visualState: JourneyVisualState;
  provenancePointer: string;
  limitation: string;
};

export type SourceLedgerItem = {
  sourceId: string;
  sourceName: string;
  authority: string;
  datasetOrRelease?: string;
  officialUrl?: string;
  retrievedAt?: string;
  publishedAt?: string;
  usedFor: string[];
  limitation: string;
};

export type HomepageToolState = {
  href: string;
  label: string;
  status: ToolReadiness;
  homepageCtaAllowed: boolean;
};

export type InvestorHomeIntelV1 = {
  contract: typeof INVESTOR_HOME_INTEL_VERSION;
  generatedAt: string;
  payloadFingerprint: string;
  score: null;
  ranking: null;
  changeModule: { status: 'UNSUPPORTED'; reason: string };
  metadata: {
    canonicalUrl: string;
    primarySourceDataset: 'iapd_sec_compilation';
    primaryReleaseLabel?: string;
    retrievedAt?: string;
    publishedAt?: string;
  };
  populations: {
    firms: {
      secIardRoster: number;
      ria: number;
      era: number;
      indexableTrustReports: number;
      canonicalFirmsIncludingNonRoster: number;
    };
    professionals: {
      ingestedPeople: number;
      withIndividualCrd: number;
      associations: number;
      publicSearch: 'unavailable';
      publicProfiles: 'synthetic_only';
      status: 'unavailable';
    };
  };
  recordState: {
    universe: MetricWithProvenance[];
    current: MetricWithProvenance[];
    observations: MetricWithProvenance[];
    geography: MetricWithProvenance[];
    asOf: Array<{ label: string; value: string }>;
  };
  featuredFindings: FeaturedFinding[];
  aumDistribution?: DistributionWithProvenance;
  services?: DistributionWithProvenance;
  clientTypes?: never;
  feeStructures?: DistributionWithProvenance;
  disclosures?: DistributionWithProvenance;
  geography?: {
    principalOfficeByState?: StateMetric[];
    registrationByState?: never;
  };
  evidenceCoverage: EvidenceCoverageItem[];
  evidenceJourney: EvidenceJourneyStep[];
  sourceLedger: SourceLedgerItem[];
  limitations: string[];
  tools: HomepageToolState[];
};

export const V1_HOMEPAGE_TOOLS: HomepageToolState[] = [
  { href: '/firms', label: 'Firm search / directory', status: 'LIVE', homepageCtaAllowed: true },
  {
    href: '/firm/[slug]',
    label: 'Wave-1 Firm Trust Reports',
    status: 'LIVE_BUT_LIMITED',
    homepageCtaAllowed: true,
  },
  { href: '/methodology', label: 'Methodology', status: 'LIVE', homepageCtaAllowed: true },
  { href: '/sources', label: 'Sources', status: 'LIVE', homepageCtaAllowed: true },
  { href: '/research', label: 'Research questions', status: 'LIVE_BUT_LIMITED', homepageCtaAllowed: true },
  { href: '/about', label: 'About', status: 'LIVE', homepageCtaAllowed: true },
  {
    href: '/professionals',
    label: 'Professional directory',
    status: 'PLACEHOLDER',
    homepageCtaAllowed: false,
  },
  { href: '/compare', label: 'Compare', status: 'PLACEHOLDER', homepageCtaAllowed: false },
  { href: '/tools', label: 'Decision Lab', status: 'NOT_IMPLEMENTED', homepageCtaAllowed: false },
  {
    href: '/my-investor-trust-hub',
    label: 'My InvestorTrustHub',
    status: 'PLACEHOLDER',
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
