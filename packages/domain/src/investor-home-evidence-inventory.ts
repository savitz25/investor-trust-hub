import { AZ_PUBLIC_SNAPSHOT } from './az-public-snapshot';
import { CA_PUBLIC_SNAPSHOT } from './ca-public-snapshot';
import { loadInvestorNetworkMetrics } from './load-network-metrics';
import { NJ_PUBLIC_SNAPSHOT } from './nj-public-snapshot';
import { TX_PUBLIC_SNAPSHOT } from './tx-public-snapshot';
import { WA_PUBLIC_SNAPSHOT } from './wa-public-snapshot';
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
  code: 'NJ' | 'CA' | 'TX' | 'WA' | 'AZ';
  name: string;
  href: string;
  regulator: string;
  principalOfficeFirms: number;
  rosterStatus: 'Available by request' | 'Not acquired';
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
      INVESTOR_HOMEPAGE_STATE_CARDS.length,
      'KNOWN',
      'PUBLIC_RESEARCH',
      'published state intelligence page',
      'NJ, CA, TX, WA, AZ',
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
    INVESTOR_HOMEPAGE_STATE_CARDS.length !== 5 ||
    INVESTOR_HOMEPAGE_STATE_CARDS.some((state) => state.href === '/florida')
  )
    throw new Error(
      'Exactly five accepted state pages may publish; Florida is not one',
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
