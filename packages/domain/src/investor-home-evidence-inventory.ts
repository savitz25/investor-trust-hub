import networkMetrics from '../../../data/home/investor-network-metrics-v1.json';
import NC_PUBLIC_SNAPSHOT from '../../../artifacts/nc-inv-001-public-snapshot.json';
import OH_PUBLIC_SNAPSHOT from '../../../artifacts/oh-inv-001-public-snapshot.json';
import GA_PUBLIC_SNAPSHOT from '../../../artifacts/ga-inv-001-public-snapshot.json';
const AZ_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.AZ;
const CA_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.CA;
const CO_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.CO;
const NY_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.NY;
const IL_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.IL;
const OR_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.OR;
const PA_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.PA;
const VA_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.VA;
import { loadInvestorNetworkMetrics } from './load-network-metrics';
const NJ_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.NJ;
const TX_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.TX;
const WA_PUBLIC_SNAPSHOT = networkMetrics.acceptedStateSnapshots.WA;
import { V1_RIA_COMPENSATION_METHODS } from './investor-home-intel';
import {
  metricByKey,
  supplementalHomepagePublication,
  type InvestorHomepageSupplementalKey,
  type PublicationStatus,
} from './investor-network-metrics-v1';

export const INVESTOR_EVIDENCE_FAMILY_LABELS = {
  FIRM_IDENTITY_REGISTRATION: 'Firm identity & registration',
  FORM_ADV_HISTORY: 'Form ADV filing history',
  ADVISORY_BUSINESS_RAUM: 'Advisory business & RAUM',
  COMPENSATION_METHODS: 'Compensation & business methods',
  OWNERSHIP_CONTROL: 'Ownership & control',
  DISCLOSURE_REGULATORY: 'Disclosure & regulatory evidence',
  STATE_SECURITIES: 'State securities intelligence',
  PUBLIC_RESEARCH: 'Public research surfaces',
} as const;

export type InvestorEvidenceFamily =
  keyof typeof INVESTOR_EVIDENCE_FAMILY_LABELS;
export type InvestorHomepagePublicationStatus =
  | 'PUBLIC'
  | 'PUBLIC_PARTIAL'
  | 'PUBLIC_UNKNOWN';
export type InvestorHomepageValueState =
  | 'UNKNOWN'
  | 'KNOWN'
  | 'PARTIAL'
  | 'NOT_ACQUIRED'
  | 'NOT_PUBLISHED'
  | 'REQUEST_ONLY';

export type InvestorHomepageEvidenceMeasure = {
  key: string;
  label: string;
  value: number | null;
  display: string;
  valueState: InvestorHomepageValueState;
  family: InvestorEvidenceFamily;
  grain: string;
  firmClass: string;
  geography: string;
  sourceSystem: string;
  acceptedArtifact: string;
  sourceAsOf: string | null;
  retrievedAt: string | null;
  snapshotAsOf: string | null;
  generatedAt: string | null;
  definition: string;
  counts: string;
  doesNotCount: string;
  publicationStatus: InvestorHomepagePublicationStatus;
  researchDestination: string;
  identityRule: string | null;
  coverageLimitation: string | null;
};

export type InvestorHomepageStateCard = {
  code: 'NJ' | 'CA' | 'TX' | 'WA' | 'AZ' | 'CO' | 'VA' | 'NY' | 'IL' | 'OR' | 'PA' | 'NC' | 'OH' | 'GA';
  name: string;
  href: string;
  regulator: string;
  principalOfficeFirms: number;
  rosterStatus: string;
  evidence: string[];
  identityNote: string;
  limitation: string;
  sourceClocks: Array<{
    label: string;
    sourceAsOf: string | null;
    retrievedAt: string | null;
    snapshotAsOf: string | null;
    generatedAt: string | null;
  }>;
};

const fmt = (value: number | null, state: InvestorHomepageValueState) =>
  value === null
    ? state === 'REQUEST_ONLY'
      ? 'Available by request'
      : state === 'NOT_PUBLISHED'
        ? 'Not published'
        : 'Not acquired'
    : value.toLocaleString('en-US');

type MeasureInput = Omit<InvestorHomepageEvidenceMeasure, 'display'>;
const measure = (input: MeasureInput): InvestorHomepageEvidenceMeasure => ({
  ...input,
  display: fmt(input.value, input.valueState),
});

const metrics = loadInvestorNetworkMetrics();
const nationalArtifact = 'data/home/investor-network-metrics-v1.json';
const nationalClock = {
  sourceAsOf: metrics.source.publishedAt,
  retrievedAt: metrics.source.retrievedAt,
  snapshotAsOf: null,
  generatedAt: metrics.generatedAt,
};

const upstreamMetricKeys: Partial<Record<string, string>> = {
  sec_iard_roster: 'investment_advisory_firms',
  ria_facts: 'ria_records',
  era_facts: 'era_records',
  form_adv_filings: 'form_adv_filings',
  form_adv_attributes: 'form_adv_attribute_observations',
  ria_raum_observations: 'ria_raum_observations',
  ownership_control: 'ownership_control_observations',
  item11_yes: 'form_adv_item11_yes_indicators',
  indexable_profiles: 'indexable_firm_profiles',
};

export function projectNationalPublicationStatus(
  upstreamStatus: PublicationStatus,
): InvestorHomepagePublicationStatus {
  if (
    !['PUBLIC', 'PUBLIC_PARTIAL', 'PUBLIC_UNKNOWN'].includes(upstreamStatus)
  ) {
    throw new Error(
      `National homepage metric cannot publish upstream status ${upstreamStatus}`,
    );
  }
  return upstreamStatus as InvestorHomepagePublicationStatus;
}

function upstreamNationalApproval(key: string, value: number) {
  const upstreamKey = upstreamMetricKeys[key];
  if (upstreamKey) {
    const upstream = metricByKey(metrics, upstreamKey);
    if (upstream.value !== value)
      throw new Error(`Homepage value drift for ${key}`);
    return projectNationalPublicationStatus(upstream.publicationStatus);
  }
  const approval = supplementalHomepagePublication(
    key as InvestorHomepageSupplementalKey,
  );
  return projectNationalPublicationStatus(approval.publicationStatus);
}

const national = (
  key: string,
  label: string,
  value: number,
  family: InvestorEvidenceFamily,
  grain: string,
  counts: string,
  doesNotCount: string,
  firmClass = 'SEC/IARD adviser-firm evidence',
  destination = '/firms',
): InvestorHomepageEvidenceMeasure =>
  measure({
    key,
    label,
    value,
    valueState: 'KNOWN',
    family,
    grain,
    firmClass,
    geography: 'United States',
    sourceSystem: 'SEC IAPD / IARD / Form ADV',
    acceptedArtifact: nationalArtifact,
    ...nationalClock,
    definition: counts,
    counts,
    doesNotCount,
    publicationStatus: upstreamNationalApproval(key, value),
    researchDestination: destination,
    identityRule:
      'Firm facts attach through accepted firm identity, CRD, SEC file, and filing relationships only.',
    coverageLimitation: null,
  });

export const INVESTOR_HOMEPAGE_STATE_CARDS: InvestorHomepageStateCard[] = [
  {
    code: 'NJ',
    name: 'New Jersey',
    href: NJ_PUBLIC_SNAPSHOT.route,
    regulator: 'New Jersey Bureau of Securities',
    principalOfficeFirms:
      NJ_PUBLIC_SNAPSHOT.nationalOverlay.njPrincipalOfficeSecIardFirms,
    rosterStatus: 'Available by request',
    evidence: [
      'SEC/IARD principal-office overlay',
      'partial enforcement-document corpus',
      'annual examination themes',
      'issuer-filing framework',
    ],
    identityNote:
      'SEC/IARD overlay identity is separate from the unacquired state-RIA roster. Adverse evidence requires exact or deterministic attribution.',
    limitation:
      'The 48 acquired documents are a partial document corpus—not 48 violations, firms, or a complete enforcement history.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: NJ_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
        retrievedAt: NJ_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'Bureau enforcement corpus',
        sourceAsOf: NJ_PUBLIC_SNAPSHOT.enforcement.latest,
        retrievedAt: null,
        snapshotAsOf: NJ_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'CA',
    name: 'California',
    href: CA_PUBLIC_SNAPSHOT.route,
    regulator: 'California DFPI',
    principalOfficeFirms:
      CA_PUBLIC_SNAPSHOT.nationalOverlay.caPrincipalOfficeSecIardFirms,
    rosterStatus: 'Not acquired',
    evidence: [
      'SEC/IARD principal-office overlay',
      'DFPI verification paths',
      'Actions and Orders research path',
      'issuer-search framework',
    ],
    identityNote:
      'CRD/SEC identity, DFPI registration identity, and principal-office geography are separate systems.',
    limitation:
      'The DFPI roster and enforcement corpus were not bulk acquired. Search availability is not a numeric universe.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: CA_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
        retrievedAt: CA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'Accepted state snapshot',
        sourceAsOf: null,
        retrievedAt: null,
        snapshotAsOf: CA_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'TX',
    name: 'Texas',
    href: TX_PUBLIC_SNAPSHOT.route,
    regulator: 'Texas State Securities Board',
    principalOfficeFirms:
      TX_PUBLIC_SNAPSHOT.nationalOverlay.txPrincipalOfficeSecIardFirms,
    rosterStatus: 'Not acquired',
    evidence: [
      'SEC/IARD principal-office overlay',
      'certificate verification',
      'administrative-action research',
      'issuer and exemption framework',
    ],
    identityNote:
      'TSSB certificate identity is not inferred from an SEC principal-office location.',
    limitation:
      'The state roster and enforcement index were not bulk acquired. Notices and name-only records are not profile findings.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: TX_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
        retrievedAt: TX_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'TSSB rulebook',
        sourceAsOf: TX_PUBLIC_SNAPSHOT.issuer.rulebookDate,
        retrievedAt: null,
        snapshotAsOf: TX_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'WA',
    name: 'Washington',
    href: WA_PUBLIC_SNAPSHOT.route,
    regulator: 'Washington DFI Division of Securities',
    principalOfficeFirms:
      WA_PUBLIC_SNAPSHOT.nationalOverlay.waPrincipalOfficeSecIardFirms,
    rosterStatus: 'Not acquired',
    evidence: [
      'SEC/IARD principal-office overlay',
      'DFI license verification',
      'enforcement research paths',
      '2024 year-end regulatory aggregates',
    ],
    identityNote:
      'The 2024 DFI aggregates are not a live firm roster and do not crosswalk universally to SEC/IARD firms.',
    limitation:
      'The 645 year-end IA aggregate is not a current state-RIA denominator; no bulk firm or enforcement roster was acquired.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: WA_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
        retrievedAt: WA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'DFI year-end aggregate',
        sourceAsOf: WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.asOf,
        retrievedAt: null,
        snapshotAsOf: WA_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'AZ',
    name: 'Arizona',
    href: AZ_PUBLIC_SNAPSHOT.route,
    regulator: 'Arizona Corporation Commission Securities Division',
    principalOfficeFirms:
      AZ_PUBLIC_SNAPSHOT.nationalOverlay.azPrincipalOfficeSecIardFirms,
    rosterStatus: 'Available by request',
    evidence: [
      'SEC/IARD principal-office overlay',
      'ACC registration verification',
      '205-row enforcement index profile',
      'issuer and examination frameworks',
    ],
    identityNote:
      'Of 205 index rows, 87 mention CRD and 118 are name-only; no profile attachments were created.',
    limitation:
      'Index rows are not violations, advisers, unique actions, or profile matches. PDFs and eDockets were not crawled.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: AZ_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
        retrievedAt: AZ_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'ACC enforcement index profile',
        sourceAsOf: null,
        retrievedAt: null,
        snapshotAsOf: AZ_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'CO',
    name: 'Colorado',
    href: CO_PUBLIC_SNAPSHOT.route,
    regulator: 'Colorado Division of Securities',
    principalOfficeFirms:
      CO_PUBLIC_SNAPSHOT.nationalOverlay.coPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${CO_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD Colorado state-registered IA compilation',
      'federal-covered notice filings',
      'sanctions narrative profile',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and regulatory activity.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. Name-only sanctions entries were not attached.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: CO_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: CO_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: CO_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: CO_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: CO_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
      {
        label: 'Colorado web indexes',
        sourceAsOf: null,
        retrievedAt: CO_PUBLIC_SNAPSHOT.enforcement.retrievedAt,
        snapshotAsOf: CO_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'VA',
    name: 'Virginia',
    href: VA_PUBLIC_SNAPSHOT.route,
    regulator: 'Virginia SCC Division of Securities and Retail Franchising',
    principalOfficeFirms:
      VA_PUBLIC_SNAPSHOT.nationalOverlay.vaPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${VA_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD Virginia state-registered IA compilation',
      'federal-covered notice filings',
      'SCC 2025 SRF aggregates and regulatory-activity table',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and regulatory activity.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. SCC activity rows are mixed subjects and were not name-matched.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: VA_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: VA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: VA_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: VA_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: VA_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
      {
        label: 'SCC SRF 2025 report / activity table',
        sourceAsOf: '2025',
        retrievedAt: VA_PUBLIC_SNAPSHOT.enforcement.retrievedAt,
        snapshotAsOf: VA_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'NY',
    name: 'New York',
    href: NY_PUBLIC_SNAPSHOT.route,
    regulator: 'New York Attorney General Investor Protection Bureau',
    principalOfficeFirms:
      NY_PUBLIC_SNAPSHOT.nationalOverlay.nyPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${NY_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD New York state-registered IA compilation',
      'IAPD New York state ERA reporting',
      'federal-covered notice filings',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and regulatory activity.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. OAG enforcement remains a mixed research path, not an IA census.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: NY_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: NY_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: NY_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: NY_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: NY_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'IL',
    name: 'Illinois',
    href: IL_PUBLIC_SNAPSHOT.route,
    regulator: 'Illinois Secretary of State, Securities Department',
    principalOfficeFirms:
      IL_PUBLIC_SNAPSHOT.nationalOverlay.ilPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${IL_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD Illinois state-registered IA compilation',
      'IAPD Illinois state ERA reporting',
      'federal-covered notice filings',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and regulatory activity.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. SOS enforcement remains a mixed research path, not an IA census.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: IL_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: IL_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: IL_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: IL_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: IL_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'OR',
    name: 'Oregon',
    href: OR_PUBLIC_SNAPSHOT.route,
    regulator: 'Oregon Division of Financial Regulation (DFR)',
    principalOfficeFirms:
      OR_PUBLIC_SNAPSHOT.nationalOverlay.orPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${OR_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD Oregon state-registered IA compilation',
      'IAPD Oregon state ERA reporting',
      'federal-covered notice filings',
      'DFR S- securities orders (unattached)',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and DFR securities orders.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. DFR S- orders are mixed securities matters, not an IA census, and are not name-attached.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: OR_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: OR_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: OR_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: OR_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: OR_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'PA',
    name: 'Pennsylvania',
    href: PA_PUBLIC_SNAPSHOT.route,
    regulator: 'Pennsylvania Department of Banking and Securities (DoBS)',
    principalOfficeFirms:
      PA_PUBLIC_SNAPSHOT.nationalOverlay.paPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD compilation (${PA_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} approved)`,
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD Pennsylvania state-registered IA compilation',
      'IAPD Pennsylvania state ERA reporting',
      'federal-covered notice filings',
      'DoBS mixed enforcement-order catalog (unattached)',
    ],
    identityNote:
      'Approved state IA registrations are distinct from SEC principal-office overlays, federal notices, ERA reporting, and DoBS enforcement documents.',
    limitation:
      'State-only CRDs were not minted as public SEC firm profiles. DoBS orders mix banking, mortgage, and securities and are not an IA census. Name-only attachment is unsafe.',
    sourceClocks: [
      {
        label: 'SEC/IARD feed',
        sourceAsOf: PA_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: PA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: PA_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: PA_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: PA_PUBLIC_SNAPSHOT.stateRia.snapshotAsOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'NC',
    name: 'North Carolina',
    href: NC_PUBLIC_SNAPSHOT.route,
    regulator: 'North Carolina Secretary of State Securities Division',
    principalOfficeFirms:
      NC_PUBLIC_SNAPSHOT.nationalOverlay.ncPrincipalOfficeSecIardFirms,
    rosterStatus: `NC SOS IA register ${NC_PUBLIC_SNAPSHOT.sosRegisters.NC_SOS_IA_DISTINCT_CRDS.toLocaleString('en-US')} firm CRDs as of ${NC_PUBLIC_SNAPSHOT.sosRegisters.NC_SOS_REGISTER_SOURCE_AS_OF}`,
    evidence: [
      'Official NC SOS IA/IAR/BD/AG registers',
      'IAPD North Carolina state-registered IA compilation',
      'IAPD North Carolina state ERA reporting',
      'federal-covered notice filings',
      'NC SOS enforcement HTML catalog (unattached)',
    ],
    identityNote:
      'The SOS IA register and IAPD NC state-IA lens are complementary clocks. Exact CRD is required. IAR people are not IA firms.',
    limitation:
      'Do not add IA+IAR+BD+AG or state IA+ERA+notice+principal office. Summary cease and desist is not a final finding. Name-only enforcement attachment is unsafe.',
    sourceClocks: [
      {
        label: 'NC SOS IA register',
        sourceAsOf: NC_PUBLIC_SNAPSHOT.sosRegisters.NC_SOS_REGISTER_SOURCE_AS_OF,
        retrievedAt: NC_PUBLIC_SNAPSHOT.sosRegisters.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
      {
        label: 'IAPD state compilation',
        sourceAsOf: NC_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: NC_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: NC_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'OH',
    name: 'Ohio',
    href: OH_PUBLIC_SNAPSHOT.route,
    regulator: 'Ohio Division of Securities',
    principalOfficeFirms:
      OH_PUBLIC_SNAPSHOT.nationalOverlay.ohPrincipalOfficeSecIardFirms,
    rosterStatus: `IAPD OH APPROVED state IA ${OH_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd.toLocaleString('en-US')} firm CRDs as of ${OH_PUBLIC_SNAPSHOT.stateRia.sourceAsOf}`,
    evidence: [
      'IAPD Ohio state-registered IA compilation',
      'IAPD Ohio state ERA reporting',
      'federal-covered notice filings',
      'STAR Filing Search (search-only)',
      'Division Orders NOH vs Final Order (search-only)',
    ],
    identityNote:
      'IAPD jurisdiction=OH APPROVED is the current structured IA spine. STAR/records-request is not a census. Exact CRD is required. IAR people are not IA firms.',
    limitation:
      'Do not add state IA+ERA+notice+principal office. NOH is not a final finding. Online final-order search is not a complete census. Name-only enforcement attachment is unsafe.',
    sourceClocks: [
      {
        label: 'IAPD state compilation',
        sourceAsOf: OH_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
        retrievedAt: OH_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
        snapshotAsOf: OH_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
      {
        label: 'SEC/IARD principal-office overlay',
        sourceAsOf: OH_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: OH_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
    ],
  },
  {
    code: 'GA',
    name: 'Georgia',
    href: GA_PUBLIC_SNAPSHOT.route,
    regulator: 'Georgia Secretary of State Securities Division',
    principalOfficeFirms: GA_PUBLIC_SNAPSHOT.nationalOverlay.gaPrincipalOfficeSecIardFirms,
    rosterStatus: 'Georgia state IA, IAR, broker-dealer, and agent rosters were not acquired',
    evidence: [
      'SEC/IARD principal-office overlay',
      'IAPD and BrokerCheck verification',
      'Securities Orders index (unattached)',
      'Implementation and relief orders kept out of enforcement',
    ],
    identityNote:
      'A Georgia principal office is not Georgia registration. Exact CRD is required before an order can attach. IAR people are not IA firms.',
    limitation:
      'Do not add IA+IAR+broker-dealer+agent+orders. An index caption is not a finding. Name-only enforcement attachment is unsafe. Implementation orders are not discipline.',
    sourceClocks: [
      {
        label: 'Securities Orders index',
        sourceAsOf: null,
        retrievedAt: GA_PUBLIC_SNAPSHOT.clocks.orders_index_retrieved_at,
        snapshotAsOf: GA_PUBLIC_SNAPSHOT.asOf,
        generatedAt: null,
      },
      {
        label: 'SEC/IARD principal-office overlay',
        sourceAsOf: GA_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
        retrievedAt: GA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
        snapshotAsOf: null,
        generatedAt: null,
      },
    ],
  },
];

const stateMeasure = (
  key: string,
  label: string,
  value: number | null,
  valueState: InvestorHomepageValueState,
  family: InvestorEvidenceFamily,
  grain: string,
  geography: string,
  sourceSystem: string,
  artifact: string,
  snapshotAsOf: string | null,
  counts: string,
  doesNotCount: string,
  destination: string,
  status: InvestorHomepagePublicationStatus = 'PUBLIC',
  sourceAsOf: string | null = null,
  retrievedAt: string | null = null,
  identityRule: string | null = null,
  coverageLimitation: string | null = null,
) =>
  measure({
    key,
    label,
    value,
    valueState,
    family,
    grain,
    firmClass: 'state securities evidence',
    geography,
    sourceSystem,
    acceptedArtifact: artifact,
    sourceAsOf,
    retrievedAt,
    snapshotAsOf,
    generatedAt: null,
    definition: counts,
    counts,
    doesNotCount,
    publicationStatus: status,
    researchDestination: destination,
    identityRule,
    coverageLimitation,
  });

export function buildInvestorHomepageEvidenceInventory(): InvestorHomepageEvidenceMeasure[] {
  const inventory: InvestorHomepageEvidenceMeasure[] = [
    national(
      'sec_iard_roster',
      'SEC/IARD roster firms',
      metrics.identity.rosterFirms,
      'FIRM_IDENTITY_REGISTRATION',
      'current roster firm fact',
      'Current mutually exclusive RIA and ERA firm facts.',
      'Filings, owners, attributes, state-RIA rosters, or additional canonical identities.',
    ),
    national(
      'ria_facts',
      'RIA firm facts',
      metrics.identity.riaFacts,
      'FIRM_IDENTITY_REGISTRATION',
      'RIA firm fact',
      'Current RIA-class facts: registered plus pending.',
      'ERA facts, approvals, endorsements, or recommendations.',
      'RIA',
    ),
    national(
      'era_facts',
      'ERA firm facts',
      metrics.identity.eraFacts,
      'FIRM_IDENTITY_REGISTRATION',
      'ERA firm fact',
      'Current exempt-reporting-adviser facts.',
      'RIAs, fraud findings, or proof of safety.',
      'ERA',
    ),
    national(
      'ria_registered',
      'RIA reported registered',
      metrics.identity.riaRegistered,
      'FIRM_IDENTITY_REGISTRATION',
      'RIA status fact',
      'RIA facts carrying reported registered status.',
      'Recommended firms or SEC approval.',
      'RIA',
    ),
    national(
      'ria_pending',
      'RIA pending / 120-day facts',
      metrics.identity.riaPending,
      'FIRM_IDENTITY_REGISTRATION',
      'RIA status fact',
      'RIA facts carrying pending or 120-day status.',
      'Approved firms or recommendations.',
      'RIA',
    ),
    national(
      'canonical_firms',
      'Canonical firm identities',
      metrics.identity.canonicalFirms,
      'FIRM_IDENTITY_REGISTRATION',
      'canonical firm identity',
      'Accepted firm identity spine.',
      'The current SEC/IARD roster or extra advisers.',
    ),
    national(
      'extra_without_adv',
      'Canonical identities without ADV facts',
      metrics.identity.extraFirmsWithoutAdvFacts,
      'FIRM_IDENTITY_REGISTRATION',
      'canonical identity without current ADV fact',
      'Accepted identities outside the current ADV fact roster.',
      'Additional current roster firms or lower-quality firms.',
    ),
    national(
      'crd_linked_firms',
      'CRD-linked firms',
      metrics.identity.crdDistinctFirms,
      'FIRM_IDENTITY_REGISTRATION',
      'firm with CRD identifier',
      'Distinct firms linked to a CRD identifier.',
      'Individual CRDs or additional firms.',
    ),
    national(
      'sec_file_linked_firms',
      'SEC-file-linked firms',
      metrics.identity.secFileDistinctFirms,
      'FIRM_IDENTITY_REGISTRATION',
      'firm with SEC file identifier',
      'Distinct firms linked to an SEC file number.',
      'CRD identifiers or additional firms.',
    ),
    national(
      'form_adv_filings',
      'Form ADV filings',
      metrics.formAdv.filings,
      'FORM_ADV_HISTORY',
      'Form ADV filing',
      'Historical Form ADV filing rows.',
      'Firms; amendments and withdrawals are not new advisers.',
    ),
    national(
      'form_adv_attributes',
      'Form ADV attribute observations',
      metrics.formAdv.attributeObservations,
      'FORM_ADV_HISTORY',
      'normalized Form ADV attribute observation',
      'Structured item-level observations extracted from Form ADV.',
      'Firms, filings, accounts, clients, or violations.',
    ),
    national(
      'form_adv_withdrawals',
      'Form ADV withdrawal filings',
      metrics.formAdv.withdrawals,
      'FORM_ADV_HISTORY',
      'Form ADV withdrawal filing',
      'Source-native withdrawal filing rows.',
      'Unique firms, present status, or misconduct.',
    ),
    national(
      'successor_links',
      'Form ADV successor links',
      metrics.formAdv.successorLinks,
      'FORM_ADV_HISTORY',
      'filing-reported successor relationship',
      'Accepted successor relationships reported in Form ADV.',
      'Universal corporate lineage, ownership, or endorsement.',
    ),
    national(
      'ria_raum_observations',
      'RIA firms with RAUM observation',
      metrics.raum.riaWithObservation,
      'ADVISORY_BUSINESS_RAUM',
      'RIA regulatory-assets observation',
      'RIA facts with a non-null source-reported RAUM value.',
      'ERA facts, performance, net worth, returns, or a national dollar total.',
      'RIA',
    ),
    national(
      'ria_zero_raum',
      'RIA reported-zero RAUM',
      metrics.raum.riaZero,
      'ADVISORY_BUSINESS_RAUM',
      'RIA reported-zero RAUM observation',
      'RIA facts where the source reports zero RAUM.',
      'Missing RAUM, poor performance, or no clients.',
      'RIA',
    ),
    national(
      'ria_positive_raum',
      'RIA positive RAUM observations',
      metrics.raum.riaPositive,
      'ADVISORY_BUSINESS_RAUM',
      'RIA positive RAUM observation',
      'RIA facts where reported RAUM is greater than zero.',
      'Better firms, returns, safety, or a summed AUM headline.',
      'RIA',
    ),
    national(
      'compensation_methods',
      'RIA firms evaluated for compensation methods',
      metrics.identity.riaFacts,
      'COMPENSATION_METHODS',
      'RIA firm fact eligible for Form ADV Item 5.E analysis',
      'RIA facts evaluated across independent Item 5.E yes/no methods.',
      'Fee amounts, fee-only classification, ERA responses, or methods that sum to 100%.',
      'RIA',
      '#form-adv',
    ),
    national(
      'ownership_control',
      'Ownership/control observations',
      metrics.evidence.ownerEntities,
      'OWNERSHIP_CONTROL',
      'Schedule A/B owner/control observation',
      'Schedule A/B owner and control observations.',
      'Advisory firms, unique beneficial owners, or a current national ownership census.',
    ),
    national(
      'item11_yes',
      'Form ADV Item 11 YES indicators',
      metrics.evidence.item11YesRia + metrics.evidence.item11YesEra,
      'DISCLOSURE_REGULATORY',
      'Form ADV Item 11 YES indicator',
      'Current firm facts reporting a YES disclosure indicator.',
      'Findings, wrongdoing, enforcement actions, convictions, or a risk score.',
    ),
    national(
      'searchable_firms',
      'Searchable SEC/IARD roster firms',
      metrics.publication.searchableRosterFirms,
      'PUBLIC_RESEARCH',
      'searchable roster firm',
      'Current roster firms available through firm search.',
      'Indexable profiles, state rosters, rankings, or recommendations.',
    ),
    national(
      'indexable_profiles',
      'Indexable firm research profiles',
      metrics.publication.indexableTrustReports,
      'PUBLIC_RESEARCH',
      'indexable public firm profile',
      'Firm profiles passing the content publication gate.',
      'The regulatory universe or a quality ranking.',
    ),
    stateMeasure(
      'nj_overlay',
      'New Jersey SEC/IARD principal-office firms',
      metrics.newJersey.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with NJ principal office',
      'New Jersey',
      'SEC IAPD / IARD',
      'artifacts/nj-inv-003-public-snapshot.json',
      NJ_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting NJ principal office.',
      'New Jersey state-RIA roster, service territory, or client geography.',
      '/new-jersey',
      'PUBLIC',
      NJ_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
      NJ_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'nj_enforcement_documents',
      'New Jersey acquired enforcement documents',
      NJ_PUBLIC_SNAPSHOT.enforcement.acquiredDocuments,
      'PARTIAL',
      'DISCLOSURE_REGULATORY',
      'acquired regulatory document',
      'New Jersey',
      'New Jersey Bureau of Securities / NJOAG',
      'artifacts/nj-inv-003-public-snapshot.json',
      NJ_PUBLIC_SNAPSHOT.asOf,
      'Documents in the accepted partial historical corpus.',
      'Violations, unique actions, firms, or complete enforcement history.',
      '/new-jersey',
      'PUBLIC_PARTIAL',
      NJ_PUBLIC_SNAPSHOT.enforcement.latest,
      null,
      'Name-only evidence is not attached; exact or deterministic attribution is required.',
      NJ_PUBLIC_SNAPSHOT.enforcement.coverageLabel,
    ),
    stateMeasure(
      'ca_overlay',
      'California SEC/IARD principal-office firms',
      metrics.california.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with CA principal office',
      'California',
      'SEC IAPD / IARD',
      'artifacts/ca-inv-001-public-snapshot.json',
      CA_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting CA principal office.',
      'California state-RIA roster or DFPI authority.',
      '/california',
      'PUBLIC',
      CA_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
      CA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'tx_overlay',
      'Texas SEC/IARD principal-office firms',
      metrics.texas.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with TX principal office',
      'Texas',
      'SEC IAPD / IARD',
      'artifacts/tx-inv-001-public-snapshot.json',
      TX_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting TX principal office.',
      'Texas state-RIA roster or TSSB authority.',
      '/texas',
      'PUBLIC',
      TX_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
      TX_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'wa_overlay',
      'Washington SEC/IARD principal-office firms',
      metrics.washington.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with WA principal office',
      'Washington',
      'SEC IAPD / IARD',
      'artifacts/wa-inv-001-public-snapshot.json',
      WA_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting WA principal office.',
      'Washington state-RIA roster or DFI authority.',
      '/washington',
      'PUBLIC',
      WA_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
      WA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'wa_year_end_ia',
      'Washington 2024 IA year-end aggregate',
      WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.investmentAdvisers,
      'PARTIAL',
      'STATE_SECURITIES',
      'DFI year-end investment-adviser aggregate',
      'Washington',
      'Washington DFI',
      'artifacts/wa-inv-001-public-snapshot.json',
      WA_PUBLIC_SNAPSHOT.asOf,
      'Official year-end 2024 aggregate.',
      'A live roster, current denominator, or the SEC principal-office overlay.',
      '/washington',
      'PUBLIC_PARTIAL',
      WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.asOf,
    ),
    stateMeasure(
      'az_overlay',
      'Arizona SEC/IARD principal-office firms',
      metrics.arizona.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with AZ principal office',
      'Arizona',
      'SEC IAPD / IARD',
      'artifacts/az-inv-001-public-snapshot.json',
      AZ_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting AZ principal office.',
      'Arizona state-RIA roster, service territory, or ACC authority.',
      '/arizona',
      'PUBLIC',
      AZ_PUBLIC_SNAPSHOT.nationalOverlay.sourceDate,
      AZ_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'az_enforcement_index',
      'Arizona ACC enforcement index rows',
      AZ_PUBLIC_SNAPSHOT.enforcement.indexRows,
      'PARTIAL',
      'DISCLOSURE_REGULATORY',
      'ACC HTML enforcement index row',
      'Arizona',
      'Arizona Corporation Commission',
      'artifacts/az-inv-001-public-snapshot.json',
      AZ_PUBLIC_SNAPSHOT.asOf,
      'Year-grouped HTML index rows profiled in the accepted snapshot.',
      'Violations, advisers, unique actions, PDF findings, or profile attachments.',
      '/arizona',
      'PUBLIC_PARTIAL',
      null,
      AZ_PUBLIC_SNAPSHOT.asOf,
      'No profile attachments were created; name-only rows remain unsafe.',
      'PDFs and eDockets were not crawled.',
    ),
    stateMeasure(
      'co_overlay',
      'Colorado SEC/IARD principal-office firms',
      metrics.colorado.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with CO principal office',
      'Colorado',
      'SEC IAPD / IARD',
      'artifacts/co-inv-001-public-snapshot.json',
      CO_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting CO principal office.',
      'Colorado state-RIA roster, notice filing, or Division of Securities authority.',
      '/colorado',
      'PUBLIC',
      CO_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      CO_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'co_state_roster',
      'Colorado state-registered investment-adviser firms',
      CO_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction CO',
      'Colorado',
      'IAPD state compilation',
      'artifacts/co-inv-001-public-snapshot.json',
      CO_PUBLIC_SNAPSHOT.asOf,
      'Approved Colorado state-IA firms in IA_FIRM_STATE_Feed_08_27_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/colorado',
      'PUBLIC',
      CO_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      CO_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'co_notice_filed',
      'SEC/IARD firms with a Colorado notice filing',
      CO_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=CO FILED',
      'Colorado',
      'SEC IAPD / IARD',
      'artifacts/co-inv-001-public-snapshot.json',
      CO_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with a Colorado notice filing in the cited compilation.',
      'Colorado state-RIA licensure or the 589 principal-office overlay.',
      '/colorado',
      'PUBLIC',
      CO_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      CO_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'va_overlay',
      'Virginia SEC/IARD principal-office firms',
      metrics.virginia.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with VA principal office',
      'Virginia',
      'SEC IAPD / IARD',
      'artifacts/va-inv-001-public-snapshot.json',
      VA_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting VA principal office.',
      'Virginia state-RIA roster, notice filing, or SCC authority.',
      '/virginia',
      'PUBLIC',
      VA_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      VA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'va_state_roster',
      'Virginia state-registered investment-adviser firms',
      VA_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction VA',
      'Virginia',
      'IAPD state compilation',
      'artifacts/va-inv-001-public-snapshot.json',
      VA_PUBLIC_SNAPSHOT.asOf,
      'Approved Virginia state-IA firms in IA_FIRM_STATE_Feed_08_27_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, IAR people, or annual activity approvals.',
      '/virginia',
      'PUBLIC',
      VA_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      VA_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'va_notice_filed',
      'SEC/IARD firms with a Virginia notice filing',
      VA_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=VA FILED',
      'Virginia',
      'SEC IAPD / IARD',
      'artifacts/va-inv-001-public-snapshot.json',
      VA_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with a Virginia notice filing in the cited compilation.',
      'Virginia state-RIA licensure or the 339 principal-office overlay.',
      '/virginia',
      'PUBLIC',
      VA_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      VA_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'ny_overlay',
      'New York SEC/IARD principal-office firms',
      metrics.newYork.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with NY principal office',
      'New York',
      'SEC IAPD / IARD',
      'artifacts/ny-inv-001-public-snapshot.json',
      NY_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting NY principal office.',
      'New York state-RIA roster, notice filing, or OAG authority.',
      '/new-york',
      'PUBLIC',
      NY_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      NY_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'ny_state_roster',
      'New York state-registered investment-adviser firms',
      NY_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction NY',
      'New York',
      'IAPD state compilation',
      'artifacts/ny-inv-001-public-snapshot.json',
      NY_PUBLIC_SNAPSHOT.asOf,
      'Approved New York state-IA firms in IA_FIRM_STATE_Feed_08_27_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/new-york',
      'PUBLIC',
      NY_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      NY_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'ny_notice_filed',
      'SEC/IARD firms with a New York notice filing',
      NY_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=NY FILED',
      'New York',
      'SEC IAPD / IARD',
      'artifacts/ny-inv-001-public-snapshot.json',
      NY_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with a New York notice filing in the cited compilation.',
      'New York state-RIA licensure or the principal-office overlay.',
      '/new-york',
      'PUBLIC',
      NY_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      NY_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'il_overlay',
      'Illinois SEC/IARD principal-office firms',
      metrics.illinois.principalOfficeRosterFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with IL principal office',
      'Illinois',
      'SEC IAPD / IARD',
      'artifacts/il-inv-001-public-snapshot.json',
      IL_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting IL principal office.',
      'Illinois state-RIA roster, notice filing, or SOS authority.',
      '/illinois',
      'PUBLIC',
      IL_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      IL_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'il_state_roster',
      'Illinois state-registered investment-adviser firms',
      IL_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction IL',
      'Illinois',
      'IAPD state compilation',
      'artifacts/il-inv-001-public-snapshot.json',
      IL_PUBLIC_SNAPSHOT.asOf,
      'Approved Illinois state-IA firms in IA_FIRM_STATE_Feed_08_27_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/illinois',
      'PUBLIC',
      IL_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      IL_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'il_notice_filed',
      'SEC/IARD firms with an Illinois notice filing',
      IL_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=IL FILED',
      'Illinois',
      'SEC IAPD / IARD',
      'artifacts/il-inv-001-public-snapshot.json',
      IL_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with an Illinois notice filing in the cited compilation.',
      'Illinois state-RIA licensure or the 793 principal-office overlay.',
      '/illinois',
      'PUBLIC',
      IL_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      IL_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'or_hq_overlay',
      'SEC/IARD firms with an Oregon principal office',
      OR_PUBLIC_SNAPSHOT.nationalOverlay.orPrincipalOfficeSecIardFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with OR principal office',
      'Oregon',
      'SEC IAPD / IARD',
      'artifacts/or-inv-001-public-snapshot.json',
      OR_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting OR principal office.',
      'Oregon state-RIA roster, notice filing, or DFR authority.',
      '/oregon',
      'PUBLIC',
      OR_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      OR_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'or_state_roster',
      'Oregon state-registered investment-adviser firms',
      OR_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction OR',
      'Oregon',
      'IAPD state compilation',
      'artifacts/or-inv-001-public-snapshot.json',
      OR_PUBLIC_SNAPSHOT.asOf,
      'Approved Oregon state-IA firms in IA_FIRM_STATE_Feed_09_10_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/oregon',
      'PUBLIC',
      OR_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      OR_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'or_notice_filed',
      'SEC/IARD firms with an Oregon notice filing',
      OR_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=OR FILED',
      'Oregon',
      'SEC IAPD / IARD',
      'artifacts/or-inv-001-public-snapshot.json',
      OR_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with an Oregon notice filing in the cited compilation.',
      'Oregon state-RIA licensure or the 167 principal-office overlay.',
      '/oregon',
      'PUBLIC',
      OR_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      OR_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'pa_hq_overlay',
      'SEC/IARD firms with a Pennsylvania principal office',
      PA_PUBLIC_SNAPSHOT.nationalOverlay.paPrincipalOfficeSecIardFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with PA principal office',
      'Pennsylvania',
      'SEC IAPD / IARD',
      'artifacts/pa-inv-001-public-snapshot.json',
      PA_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting PA principal office.',
      'Pennsylvania state-RIA roster, notice filing, or DoBS authority.',
      '/pennsylvania',
      'PUBLIC',
      PA_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      PA_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'pa_state_roster',
      'Pennsylvania state-registered investment-adviser firms',
      PA_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction PA',
      'Pennsylvania',
      'IAPD state compilation',
      'artifacts/pa-inv-001-public-snapshot.json',
      PA_PUBLIC_SNAPSHOT.asOf,
      'Approved Pennsylvania state-IA firms in IA_FIRM_STATE_Feed_09_17_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/pennsylvania',
      'PUBLIC',
      PA_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      PA_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. State-only identities were not minted as public SEC profiles.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'pa_notice_filed',
      'SEC/IARD firms with a Pennsylvania notice filing',
      PA_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=PA FILED',
      'Pennsylvania',
      'SEC IAPD / IARD',
      'artifacts/pa-inv-001-public-snapshot.json',
      PA_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with a Pennsylvania notice filing in the cited compilation.',
      'Pennsylvania state-RIA licensure or the 623 principal-office overlay.',
      '/pennsylvania',
      'PUBLIC',
      PA_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      PA_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'nc_hq_overlay',
      'SEC/IARD firms with a North Carolina principal office',
      NC_PUBLIC_SNAPSHOT.nationalOverlay.ncPrincipalOfficeSecIardFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with NC principal office',
      'North Carolina',
      'SEC IAPD / IARD',
      'artifacts/nc-inv-001-public-snapshot.json',
      NC_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting NC principal office.',
      'North Carolina state-RIA roster, SOS IA register, notice filing, or SOS authority.',
      '/north-carolina',
      'PUBLIC',
      NC_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      NC_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'nc_sos_ia_register',
      'North Carolina SOS IA register distinct firm CRDs',
      NC_PUBLIC_SNAPSHOT.sosRegisters.NC_SOS_IA_DISTINCT_CRDS,
      'KNOWN',
      'STATE_SECURITIES',
      'NC SOS Register of NC IAs firm CRD',
      'North Carolina',
      'NC Secretary of State Securities Division',
      'artifacts/nc-inv-001-public-snapshot.json',
      NC_PUBLIC_SNAPSHOT.asOf,
      'Distinct firm CRDs on the official Register of NC IAs current as of 2026-06-30.',
      'IAR people, broker-dealers, agents, ERA, notice filings, or principal-office overlay.',
      '/north-carolina',
      'PUBLIC',
      NC_PUBLIC_SNAPSHOT.sosRegisters.NC_SOS_REGISTER_SOURCE_AS_OF,
      NC_PUBLIC_SNAPSHOT.sosRegisters.retrievedAt,
    ),
    stateMeasure(
      'nc_state_roster',
      'North Carolina IAPD state-registered investment-adviser firms',
      NC_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction NC',
      'North Carolina',
      'IAPD state compilation',
      'artifacts/nc-inv-001-public-snapshot.json',
      NC_PUBLIC_SNAPSHOT.asOf,
      'Approved North Carolina state-IA firms in IA_FIRM_STATE_Feed_09_17_2026.',
      'SOS IA register, SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/north-carolina',
      'PUBLIC',
      NC_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      NC_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. Complementary to the SOS register; clocks differ.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'nc_notice_filed',
      'SEC/IARD firms with a North Carolina notice filing',
      NC_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=NC FILED',
      'North Carolina',
      'SEC IAPD / IARD',
      'artifacts/nc-inv-001-public-snapshot.json',
      NC_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with a North Carolina notice filing in the cited compilation.',
      'North Carolina state-RIA licensure, SOS IA register, or the 325 principal-office overlay.',
      '/north-carolina',
      'PUBLIC',
      NC_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      NC_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'oh_hq_overlay',
      'SEC/IARD firms with an Ohio principal office',
      OH_PUBLIC_SNAPSHOT.nationalOverlay.ohPrincipalOfficeSecIardFirms,
      'KNOWN',
      'STATE_SECURITIES',
      'SEC/IARD firm with OH principal office',
      'Ohio',
      'SEC IAPD / IARD',
      'artifacts/oh-inv-001-public-snapshot.json',
      OH_PUBLIC_SNAPSHOT.asOf,
      'Federal roster firms reporting OH principal office.',
      'Ohio state-RIA roster, notice filing, ERA, or Division of Securities authority.',
      '/ohio',
      'PUBLIC',
      OH_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf,
      OH_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt,
    ),
    stateMeasure(
      'oh_state_roster',
      'Ohio IAPD state-registered investment-adviser firms',
      OH_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'IAPD state-compilation APPROVED firm with jurisdiction OH',
      'Ohio',
      'IAPD state compilation',
      'artifacts/oh-inv-001-public-snapshot.json',
      OH_PUBLIC_SNAPSHOT.asOf,
      'Approved Ohio state-IA firms in IA_FIRM_STATE_Feed_09_17_2026.',
      'SEC principal-office overlay, federal notice filings, ERA reporting, or IAR people.',
      '/ohio',
      'PUBLIC',
      OH_PUBLIC_SNAPSHOT.stateRia.sourceAsOf,
      OH_PUBLIC_SNAPSHOT.stateRia.retrievedAt,
      'Exact firm CRD. STAR Filing Search is not this census.',
      'Filter is registration jurisdiction, not address.',
    ),
    stateMeasure(
      'oh_notice_filed',
      'SEC/IARD firms with an Ohio notice filing',
      OH_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd,
      'KNOWN',
      'STATE_SECURITIES',
      'NoticeFiled RgltrCd=OH FILED',
      'Ohio',
      'SEC IAPD / IARD',
      'artifacts/oh-inv-001-public-snapshot.json',
      OH_PUBLIC_SNAPSHOT.asOf,
      'SEC/IARD firms with an Ohio notice filing in the cited compilation.',
      'Ohio state-RIA licensure or the 426 principal-office overlay.',
      '/ohio',
      'PUBLIC',
      OH_PUBLIC_SNAPSHOT.federalNotice.sourceAsOf,
      OH_PUBLIC_SNAPSHOT.federalNotice.retrievedAt,
    ),
    stateMeasure(
      'az_index_crd_mentions',
      'Arizona index rows mentioning CRD',
      AZ_PUBLIC_SNAPSHOT.enforcement.rowsWithCrdInRespondentText,
      'PARTIAL',
      'DISCLOSURE_REGULATORY',
      'ACC index row with CRD text',
      'Arizona',
      'Arizona Corporation Commission',
      'artifacts/az-inv-001-public-snapshot.json',
      AZ_PUBLIC_SNAPSHOT.asOf,
      'Index rows whose respondent text mentions CRD.',
      'Confirmed firm CRDs, unique firms, or attached adverse evidence.',
      '/arizona',
      'PUBLIC_PARTIAL',
      null,
      AZ_PUBLIC_SNAPSHOT.asOf,
      'CRD text still requires identifier typing and accepted attribution.',
      null,
    ),
    stateMeasure(
      'az_index_name_only',
      'Arizona name-only index rows',
      AZ_PUBLIC_SNAPSHOT.enforcement.rowsNameOnly,
      'PARTIAL',
      'DISCLOSURE_REGULATORY',
      'ACC name-only index row',
      'Arizona',
      'Arizona Corporation Commission',
      'artifacts/az-inv-001-public-snapshot.json',
      AZ_PUBLIC_SNAPSHOT.asOf,
      'Index rows without CRD in respondent text.',
      'Profile matches, unique people, unique firms, or violations.',
      '/arizona',
      'PUBLIC_PARTIAL',
      null,
      AZ_PUBLIC_SNAPSHOT.asOf,
      'Name-only adverse evidence is unsafe and remains unattached.',
      null,
    ),
  ];

  for (const method of V1_RIA_COMPENSATION_METHODS)
    inventory.push(
      measure({
        key: `compensation_${method.key}`,
        label: `${method.officialLabel} — reported YES`,
        value: method.reportedYes,
        valueState: 'KNOWN',
        family: 'COMPENSATION_METHODS',
        grain: `RIA Form ADV Item ${method.field} YES response`,
        firmClass: 'RIA',
        geography: 'United States',
        sourceSystem: 'SEC IAPD / IARD / Form ADV',
        acceptedArtifact: 'packages/domain/src/investor-home-intel.ts',
        ...nationalClock,
        definition: `RIA facts reporting YES for ${method.officialLabel}.`,
        counts: `RIA facts reporting YES for ${method.officialLabel}.`,
        doesNotCount:
          'Fee amounts, exclusive categories, ERA answers, quality, or a recommendation.',
        publicationStatus: 'PUBLIC',
        researchDestination: '#form-adv',
        identityRule:
          'Each method is independent; a firm may report multiple methods.',
        coverageLimitation: `${method.eligibleDenominator.toLocaleString('en-US')} RIA facts were eligible; ${method.notFiledByFormType.toLocaleString('en-US')} ERA facts do not file this item in the same way.`,
      }),
    );

  for (const [
    key,
    label,
    valueState,
    geography,
    source,
    artifact,
    generatedAt,
    destination,
    limitation,
  ] of [
    [
      'nj_state_roster',
      'New Jersey state-RIA roster',
      'REQUEST_ONLY',
      'New Jersey',
      'New Jersey Bureau of Securities',
      'artifacts/nj-inv-003-public-snapshot.json',
      NJ_PUBLIC_SNAPSHOT.asOf,
      '/new-jersey',
      'Complete roster available by records request; request not completed.',
    ],
    [
      'ca_state_roster',
      'California state-RIA roster',
      'NOT_ACQUIRED',
      'California',
      'California DFPI',
      'artifacts/ca-inv-001-public-snapshot.json',
      CA_PUBLIC_SNAPSHOT.asOf,
      '/california',
      'Official verification is search-only; no bulk roster acquired.',
    ],
    [
      'tx_state_roster',
      'Texas state-RIA roster',
      'NOT_ACQUIRED',
      'Texas',
      'Texas State Securities Board',
      'artifacts/tx-inv-001-public-snapshot.json',
      TX_PUBLIC_SNAPSHOT.asOf,
      '/texas',
      'Official certificate verification is search-only; no bulk roster acquired.',
    ],
    [
      'wa_state_roster',
      'Washington state-RIA roster',
      'NOT_ACQUIRED',
      'Washington',
      'Washington DFI',
      'artifacts/wa-inv-001-public-snapshot.json',
      WA_PUBLIC_SNAPSHOT.asOf,
      '/washington',
      'Official verification is search-only; year-end aggregate is not a live roster.',
    ],
    [
      'az_state_roster',
      'Arizona state-RIA roster',
      'REQUEST_ONLY',
      'Arizona',
      'Arizona Corporation Commission',
      'artifacts/az-inv-001-public-snapshot.json',
      AZ_PUBLIC_SNAPSHOT.asOf,
      '/arizona',
      'CSV available by public-records request; request not filed.',
    ],
  ] as const)
    inventory.push(
      stateMeasure(
        key,
        label,
        null,
        valueState,
        'STATE_SECURITIES',
        'complete state-RIA roster',
        geography,
        source,
        artifact,
        generatedAt,
        'No numeric state-RIA universe is published.',
        'Zero, the SEC principal-office overlay, or an enforcement denominator.',
        destination,
        'PUBLIC_UNKNOWN',
        null,
        null,
        null,
        limitation,
      ),
    );

  inventory.push(
    stateMeasure(
      'published_state_pages',
      'Published state intelligence pages',
      metrics.network.publishedStateIntelligencePaths.length,
      'KNOWN',
      'PUBLIC_RESEARCH',
      'published state intelligence page',
      INVESTOR_HOMEPAGE_STATE_CARDS.map(state => state.code).join(', '),
      'Accepted state publication models',
      'INVESTOR_HOMEPAGE_STATE_CARDS',
      null,
      'Live state research destinations derived from the rendered state-card model.',
      'Advisers, rankings, Florida state intelligence, or research-depth ratings.',
      '#states',
    ),
  );
  inventory.push(
    stateMeasure(
      'fl_state_page_limitation',
      'Florida state securities intelligence',
      null,
      'NOT_PUBLISHED',
      'PUBLIC_RESEARCH',
      'published state intelligence page',
      'Florida',
      'InvestorTrustHub publication model',
      'INVESTOR_HOMEPAGE_STATE_CARDS',
      null,
      'No InvestorTrustHub Florida state intelligence page is published.',
      'Zero Florida firms or absence from national SEC/IARD firm search.',
      '/firms?state=FL',
      'PUBLIC_UNKNOWN',
      null,
      null,
      null,
      'Florida firms remain searchable through national SEC/IARD research.',
    ),
  );

  for (const m of networkMetrics.reconciliation.measures) {
    // Existing state cards already show approved IA, notice CRDs and principal office.
    if (['stateRia.approvedDistinctCrd', 'federalNotice.noticeFiledDistinctCrd'].includes(m.sourceField) || m.sourceField.startsWith('nationalOverlay.')) continue;
    inventory.push({key:m.key,label:m.label,value:m.value,display:fmt(m.value,m.value === null ? 'UNKNOWN' : 'KNOWN'),valueState:m.value === null ? 'UNKNOWN' : 'KNOWN',family:'STATE_SECURITIES',grain:m.grain,firmClass:'Source-defined state layer',geography:m.key.slice(0,2).toUpperCase(),sourceSystem:m.sourceArtifact,acceptedArtifact:m.sourceArtifact,sourceAsOf:m.sourceAsOf,retrievedAt:m.retrievedAt,snapshotAsOf:m.snapshotAsOf,generatedAt:m.generatedAt,definition:m.counts,counts:m.counts,doesNotCount:m.doesNotCount,publicationStatus:m.value===null?'PUBLIC_UNKNOWN':'PUBLIC',researchDestination:m.destination,identityRule:'Exact CRD only; registration bridges do not authorize adverse attachment',coverageLimitation:m.value===null?'Public research path; no defensible bulk count.':null});
  }
  assertInvestorHomepageEvidenceInventory(inventory);
  return inventory;
}

export function assertInvestorHomepageEvidenceInventory(
  inventory: InvestorHomepageEvidenceMeasure[],
): void {
  const allowed = new Set<InvestorHomepagePublicationStatus>([
    'PUBLIC',
    'PUBLIC_PARTIAL',
    'PUBLIC_UNKNOWN',
  ]);
  if (new Set(inventory.map((item) => item.key)).size !== inventory.length)
    throw new Error('Investor homepage evidence keys must be unique');
  if (inventory.some((item) => !allowed.has(item.publicationStatus)))
    throw new Error(
      'Investor homepage inventory contains a non-public publication status',
    );
  if (inventory.some((item) => item.key === 'disclosure_events'))
    throw new Error('Internal disclosure-event count cannot publish');
  if (
    inventory.some((item) =>
      /grand total|national.*aum.*total/i.test(item.label),
    )
  )
    throw new Error('Cross-grain or national RAUM totals cannot publish');
  if (
    INVESTOR_HOMEPAGE_STATE_CARDS.length !== metrics.network.publishedStateIntelligencePaths.length ||
    INVESTOR_HOMEPAGE_STATE_CARDS.some((state) => state.href === '/florida')
  )
    throw new Error(
      'State cards must reconcile to accepted published state paths',
    );
  if (
    inventory.find((item) => item.key === 'published_state_pages')?.value !==
    INVESTOR_HOMEPAGE_STATE_CARDS.length
  )
    throw new Error('State-page count must derive from state-card model');
  if (
    metrics.identity.riaFacts + metrics.identity.eraFacts !==
    metrics.identity.rosterFirms
  )
    throw new Error(
      'RIA + ERA must equal the mutually exclusive SEC/IARD roster partition',
    );
}
