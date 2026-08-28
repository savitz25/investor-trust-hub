/**
 * INV-NAT-002C Trust Report / Profile Intelligence.
 * Public display of READY Form ADV relational evidence on Wave-1 firm profiles only.
 * No Trust Score. No person/fund/historical-firm pages.
 */

export const TRUST_REPORT_SNAPSHOT_VERSION = 'investor-trust-report-v2' as const;

export const ADV_PROFILE_LIST_LIMIT = 8;
export const ADV_PROFILE_FILING_LIMIT = 12;

export type AdvIdentityConfidence =
  | 'CONFIRMED'
  | 'HIGH_CONFIDENCE'
  | 'REVIEW_REQUIRED'
  | 'UNRESOLVED';

export type AdvPublicationFamily =
  | 'owner'
  | 'executive'
  | 'related_organization'
  | 'private_fund'
  | 'service_provider'
  | 'other_office'
  | 'relying_adviser'
  | 'filing'
  | 'advw'
  | 'crs';

export type ModuleReadiness = 'READY' | 'READY_WITH_LIMITATIONS' | 'INTERNAL_ONLY' | 'NOT_READY';

const HIGH_CONFIDENCE_PUBLIC_FAMILIES: ReadonlySet<AdvPublicationFamily> = new Set([
  'owner',
  'executive',
  'service_provider',
  'other_office',
]);

export function mayPublishAdvRelationship(input: {
  confidence: string | null | undefined;
  isCurrent: boolean;
  family: AdvPublicationFamily;
  allowHistorical?: boolean;
}): boolean {
  const confidence = (input.confidence ?? '').toUpperCase();
  if (confidence === 'REVIEW_REQUIRED' || confidence === 'UNRESOLVED' || confidence === '') {
    return false;
  }
  if (!input.isCurrent && !input.allowHistorical) {
    return false;
  }
  if (confidence === 'CONFIRMED') {
    return true;
  }
  if (confidence === 'HIGH_CONFIDENCE') {
    return HIGH_CONFIDENCE_PUBLIC_FAMILIES.has(input.family);
  }
  return false;
}

export const OWNERSHIP_CODE_BANDS: Record<string, string> = {
  A: 'Less than 5%',
  B: '5% but less than 10%',
  C: '10% but less than 25%',
  D: '25% but less than 50%',
  E: '50% but less than 75%',
  F: '75% or more',
};

export function ownershipBandLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  return OWNERSHIP_CODE_BANDS[key] ?? null;
}

export function isControlPersonFlag(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toUpperCase();
  return v === 'Y' || v === 'YES';
}

export const ADV_PUBLIC_COPY = {
  reportedInFormAdv: 'Reported in Form ADV',
  secFormAdvFiling: 'SEC Form ADV filing',
  reportedDirectOwner: 'Reported direct owner',
  reportedIndirectOwner: 'Reported indirect owner',
  reportedExecutive: 'Reported executive/control relationship',
  relatedOrganization: 'Related organization reported by the adviser',
  privateFund: 'Private fund reported by the adviser',
  item7bCount: 'Item 7.B private-fund count as reported (not a named-fund list)',
  advwFiling: 'Form ADV-W withdrawal filing',
  formCrs: 'Form CRS',
  sourcesLead:
    'Information shown is based on adviser-reported Form ADV filings and related SEC/IAPD records.',
  notIndependentVerification:
    'InvestorTrustHub organizes the filing. It does not independently verify every adviser-reported fact.',
  currentHeading: 'Current reported relationships',
  historicalHeading: 'Filing history / historical reported relationships',
  namesNotProfiles:
    'Names appear only as reported on this firm’s Form ADV. They are not standalone public profiles.',
  fundsNotPages:
    'Named funds appear only on this adviser profile. InvestorTrustHub does not publish standalone fund pages from this graph.',
  item11Yes: 'Firm reported one or more Item 11 disclosure indicators in this source record.',
  item11No: 'Firm reported No for Item 11 in this filing.',
  item11Missing: 'Item 11 is not present in this source record. Absence is not a research conclusion.',
  custodyNote: 'Custody is reported as filed. It is not a risk score or a quality finding.',
  compensationNote:
    'Compensation methods are the boxes the adviser checked on Form ADV. This is not a “fee-only” determination.',
  affiliationNote:
    'Reported affiliations are types of related financial businesses as filed. They are not a conflict finding.',
  advwNote:
    'Form ADV-W is a withdrawal filing as reported. It is not a misconduct finding, and a historical ADV-W does not by itself mean the firm is inactive.',
  reviewRequiredHidden: 'Name-only or otherwise unconfirmed rows remain internal and are not shown.',
} as const;

export const ADV_FORBIDDEN_PUBLIC_PHRASES = [
  'verified owner',
  'verified assets',
  'parent company',
  'controlling owner',
  'ultimate owner',
  'fee-only',
  'clean record',
  'no disciplinary history',
  'misconduct',
  'disciplinary withdrawal',
  'forced closure',
  'approved provider',
  'trusted provider',
  'preferred provider',
  'conflict of interest',
  'sec approved',
  'trust score',
] as const;

export function findForbiddenAdvPublicCopy(text: string): string[] {
  const haystack = text.toLowerCase();
  return ADV_FORBIDDEN_PUBLIC_PHRASES.filter((phrase) => haystack.includes(phrase));
}

export const COMPENSATION_METHOD_LABELS: Record<string, string> = {
  percentage_of_assets: 'Percentage of assets under management',
  hourly_charges: 'Hourly charges',
  subscription_fees: 'Subscription fees',
  fixed_fees: 'Fixed fees',
  commissions: 'Commissions',
  performance_based_fees: 'Performance-based fees',
  other_compensation: 'Other',
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  clients_individuals: 'Individuals',
  clients_high_net_worth_individuals: 'High-net-worth individuals',
  clients_banking_or_thrift: 'Banking or thrift institutions',
  clients_investment_companies: 'Investment companies',
  clients_business_development_companies: 'Business development companies',
  clients_pooled_investment_vehicles: 'Pooled investment vehicles',
  clients_pension_profit_sharing: 'Pension and profit-sharing plans',
  clients_charities: 'Charitable organizations',
  clients_state_or_municipal: 'State or municipal government entities',
  clients_other_investment_advisers: 'Other investment advisers',
  clients_insurance_companies: 'Insurance companies',
  clients_sovereigns: 'Sovereign entities',
  clients_other: 'Other',
};

export const OTHER_BUSINESS_LABELS: Record<string, string> = {
  other_business_broker_dealer: 'Broker-dealer',
  other_business_registered_representative: 'Registered representative of a broker-dealer',
  other_business_cpo_or_cta: 'Commodity pool operator / commodity trading advisor',
  other_business_futures_commission_merchant: 'Futures commission merchant',
  other_business_real_estate: 'Real estate broker/dealer/agent',
  other_business_insurance: 'Insurance broker or agent',
  other_business_bank: 'Bank',
  other_business_trust_company: 'Trust company',
  other_business_accountant: 'Accountant or accounting firm',
  other_business_lawyer: 'Lawyer or law firm',
  other_business_other_financial_salesperson: 'Other financial product salesperson',
  other_business_other: 'Other business',
};

export const AFFILIATION_TYPE_LABELS: Record<string, string> = {
  affiliation_broker_dealer: 'Broker-dealer',
  affiliation_other_investment_adviser: 'Other investment adviser',
  affiliation_municipal_advisor: 'Municipal advisor',
  affiliation_security_based_swap_dealer: 'Security-based swap dealer',
  affiliation_major_security_based_swap_participant: 'Major security-based swap participant',
  affiliation_cpo_or_cta: 'Commodity pool operator / commodity trading advisor',
  affiliation_futures_commission_merchant: 'Futures commission merchant',
  affiliation_banking_or_thrift: 'Banking or thrift institution',
  affiliation_trust_company: 'Trust company',
  affiliation_accountant: 'Accountant or accounting firm',
  affiliation_lawyer: 'Lawyer or law firm',
  affiliation_insurance: 'Insurance company or agency',
  affiliation_pension_consultant: 'Pension consultant',
  affiliation_real_estate_broker: 'Real estate broker or dealer',
  affiliation_limited_partnership_sponsor: 'Sponsor of limited partnerships',
  affiliation_other: 'Other',
};

export const SERVICE_PROVIDER_ROLE_LABELS: Record<string, string> = {
  auditor: 'Auditor reported for a private fund',
  prime_broker: 'Prime broker reported for a private fund',
  custodian: 'Custodian reported for a private fund',
  administrator: 'Administrator reported for a private fund',
  marketer: 'Marketer reported for a private fund',
  general_partner_or_manager: 'General partner or manager reported for a private fund',
};

export const MODULE_READINESS: Record<string, ModuleReadiness> = {
  Identity: 'READY',
  Registration: 'READY',
  RAUM: 'READY_WITH_LIMITATIONS',
  'Client/business scale': 'READY_WITH_LIMITATIONS',
  Compensation: 'READY_WITH_LIMITATIONS',
  Custody: 'READY_WITH_LIMITATIONS',
  'Item 6 activities': 'READY_WITH_LIMITATIONS',
  Affiliations: 'READY_WITH_LIMITATIONS',
  'Item 11': 'READY_WITH_LIMITATIONS',
  'Ownership & Control': 'READY_WITH_LIMITATIONS',
  'Related Organizations': 'READY_WITH_LIMITATIONS',
  'Private Funds': 'READY_WITH_LIMITATIONS',
  'Fund Service Providers': 'READY_WITH_LIMITATIONS',
  'Other Offices': 'READY_WITH_LIMITATIONS',
  'Relying Advisers': 'READY_WITH_LIMITATIONS',
  'Filing History': 'READY_WITH_LIMITATIONS',
  'ADV-W': 'READY_WITH_LIMITATIONS',
  CRS: 'READY_WITH_LIMITATIONS',
  'Part 2A': 'NOT_READY',
};

export interface AdvNamedParty {
  displayName: string;
  kind: 'PERSON' | 'ORGANIZATION' | 'UNKNOWN';
  relationshipLabel: string;
  ownershipBand: string | null;
  titleOrStatus: string | null;
  filingDate: string | null;
  filingId: string | null;
  datasetKind: string | null;
  confidence: AdvIdentityConfidence;
  relatedCrd: string | null;
  relatedFirmHref: string | null;
}

export interface AdvNamedFund {
  fundName: string;
  fundId: string;
  state: string | null;
  country: string | null;
  filingDate: string | null;
}

export interface AdvServiceProvider {
  role: string;
  roleLabel: string;
  providerName: string;
  confidence: AdvIdentityConfidence;
  relatedCrd: string | null;
  filingDate: string | null;
}

export interface AdvOffice {
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  branchNumber: string | null;
  filingDate: string | null;
}

export interface AdvFilingSummaryRow {
  filingId: string;
  datasetKind: string;
  dateSubmitted: string | null;
  filingTypes: string[];
  formVersion: string | null;
  isCurrent: boolean;
}

export interface AdvWithdrawalRow {
  filingId: string;
  filingType: string | null;
  filingDate: string | null;
}

export interface AdvCrsRow {
  officialDocumentId: string | null;
  officialFileName: string | null;
  submittedOn: string | null;
  sourceUrl: string | null;
}

export interface TrustReportV2Snapshot {
  version: typeof TRUST_REPORT_SNAPSHOT_VERSION;
  crd: string;
  slug: string;
  wave1: boolean;
  item11: {
    reported: 'Y' | 'N' | null;
    copy: string;
  };
  scale: {
    employeeCount: string | null;
    advisoryPersonnelCount: string | null;
    clientCount: string | null;
    asOf: string | null;
    notFiledNote: string | null;
  };
  compensation: {
    methods: string[];
    asOf: string | null;
    notFiledNote: string | null;
  };
  custody: {
    cash: string | null;
    securities: string | null;
    relatedPersonCash: string | null;
    relatedPersonSecurities: string | null;
    asOf: string | null;
    notFiledNote: string | null;
  };
  otherBusiness: string[];
  affiliationTypes: string[];
  clientTypes: string[];
  privateFundAggregates: {
    reportsPrivateFunds: string | null;
    count7b1: string | null;
    grossAssets: string | null;
    asOf: string | null;
  };
  current: {
    directOwners: AdvNamedParty[];
    indirectOwners: AdvNamedParty[];
    executives: AdvNamedParty[];
    relatedOrganizations: AdvNamedParty[];
    privateFunds: AdvNamedFund[];
    serviceProviders: AdvServiceProvider[];
    otherOffices: AdvOffice[];
    relyingAdvisers: AdvNamedParty[];
    hiddenReviewRequired: {
      owners: number;
      related: number;
      funds: number;
      serviceProviders: number;
    };
    counts: {
      directOwners: number;
      indirectOwners: number;
      executives: number;
      relatedOrganizations: number;
      privateFunds: number;
      otherOffices: number;
      relyingAdvisers: number;
    };
  };
  historical: {
    filingsTotal: number;
    filingsRia: number;
    filingsEra: number;
    latestFilingDate: string | null;
    latestDatasetKind: string | null;
    latestFilingTypes: string[];
    recentFilings: AdvFilingSummaryRow[];
    withdrawals: AdvWithdrawalRow[];
  };
  documents: {
    crs: AdvCrsRow[];
    part2aCount: number;
  };
  sources: {
    systemName: string;
    lead: string;
    notIndependentVerification: string;
  };
}

export interface AdvOwnerRowInput {
  schedule: string;
  ownerKind: string;
  fullLegalName: string | null;
  ownerId: string | null;
  titleOrStatus: string | null;
  ownershipCode: string | null;
  controlPerson: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
  filingId: string | null;
  datasetKind: string | null;
}

export interface AdvRelatedRowInput {
  legalName: string | null;
  relatedCrd: string | null;
  relatedFirmSlug: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
  filingId: string | null;
  datasetKind: string | null;
}

export interface AdvFundRowInput {
  fundName: string | null;
  fundId: string | null;
  state: string | null;
  country: string | null;
  productId: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
}

export interface AdvProviderRowInput {
  role: string;
  providerName: string | null;
  providerCrd: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
}

export interface AdvOfficeRowInput {
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  branchNumber: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
}

export interface AdvRelyingRowInput {
  legalName: string | null;
  relyingCrd: string | null;
  relyingFirmSlug: string | null;
  identityConfidence: string;
  isCurrent: boolean;
  dateSubmitted: string | null;
}

export interface AdvAttributeRowInput {
  fieldName: string;
  reportedYn: string | null;
  numericValue: string | number | null;
  textValue: string | null;
  presenceStatus: string;
  asOfDate: string | null;
}

function asDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value);
  if (text.length >= 10) return text.slice(0, 10);
  return text;
}

function ynLabel(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().toUpperCase();
  if (v === 'Y' || v === 'YES') return 'Yes as reported';
  if (v === 'N' || v === 'NO') return 'No as reported';
  return null;
}

function numericLabel(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('en-US');
}

function attrMap(rows: AdvAttributeRowInput[]): Map<string, AdvAttributeRowInput> {
  return new Map(rows.map((row) => [row.fieldName, row]));
}

function notFiled(rows: AdvAttributeRowInput[], field: string): boolean {
  return rows.some((row) => row.fieldName === field && row.presenceStatus === 'NOT_FILED_BY_FORM_TYPE');
}

function listedYes(rows: AdvAttributeRowInput[], labels: Record<string, string>): string[] {
  return Object.entries(labels)
    .filter(([field]) => {
      const row = rows.find((item) => item.fieldName === field);
      return row && (row.reportedYn ?? '').toUpperCase() === 'Y' && row.presenceStatus === 'REPORTED_YES';
    })
    .map(([, label]) => label)
    .sort((a, b) => a.localeCompare(b));
}

function partyKey(name: string, extra: string): string {
  return `${name.trim().toLowerCase()}::${extra}`;
}

function cap<T>(items: T[], limit = ADV_PROFILE_LIST_LIMIT): T[] {
  return items.slice(0, limit);
}

export function item11Copy(reported: string | null | undefined): { reported: 'Y' | 'N' | null; copy: string } {
  const v = (reported ?? '').trim().toUpperCase();
  if (v === 'Y') return { reported: 'Y', copy: ADV_PUBLIC_COPY.item11Yes };
  if (v === 'N') return { reported: 'N', copy: ADV_PUBLIC_COPY.item11No };
  return { reported: null, copy: ADV_PUBLIC_COPY.item11Missing };
}

export function buildTrustReportV2Snapshot(input: {
  crd: string;
  slug: string;
  wave1: boolean;
  disclosureIndicator: string | null;
  attributes: AdvAttributeRowInput[];
  owners: AdvOwnerRowInput[];
  related: AdvRelatedRowInput[];
  funds: AdvFundRowInput[];
  providers: AdvProviderRowInput[];
  offices: AdvOfficeRowInput[];
  relying: AdvRelyingRowInput[];
  filings: AdvFilingSummaryRow[];
  filingsTotal: number;
  filingsRia: number;
  filingsEra: number;
  withdrawals: AdvWithdrawalRow[];
  crs: AdvCrsRow[];
  part2aCount: number;
  hiddenReviewRequired: TrustReportV2Snapshot['current']['hiddenReviewRequired'];
}): TrustReportV2Snapshot {
  const attrs = attrMap(input.attributes);
  const asOf =
    asDate(attrs.get('employee_count')?.asOfDate) ??
    asDate(attrs.get('disclosure_indicator')?.asOfDate) ??
    asDate(attrs.get('raum_total')?.asOfDate);

  const directOwners: AdvNamedParty[] = [];
  const indirectOwners: AdvNamedParty[] = [];
  const executives: AdvNamedParty[] = [];
  const seenOwner = new Set<string>();
  const seenExec = new Set<string>();

  for (const row of input.owners) {
    const name = (row.fullLegalName ?? '').trim();
    if (!name) continue;
    const kind = row.ownerKind === 'PERSON' || row.ownerKind === 'ORGANIZATION' ? row.ownerKind : 'UNKNOWN';
    const band = ownershipBandLabel(row.ownershipCode);
    const hasOwnership = Boolean(band || (row.ownershipCode ?? '').trim());
    const control = isControlPersonFlag(row.controlPerson) || Boolean((row.titleOrStatus ?? '').trim());
    if (hasOwnership && mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'owner' })) {
      const key = partyKey(name, `${row.schedule}:${row.ownerId ?? ''}`);
      if (!seenOwner.has(key)) {
        seenOwner.add(key);
        const party: AdvNamedParty = {
          displayName: name,
          kind,
          relationshipLabel: row.schedule === 'B' ? ADV_PUBLIC_COPY.reportedIndirectOwner : ADV_PUBLIC_COPY.reportedDirectOwner,
          ownershipBand: band,
          titleOrStatus: (row.titleOrStatus ?? '').trim() || null,
          filingDate: asDate(row.dateSubmitted),
          filingId: row.filingId,
          datasetKind: row.datasetKind,
          confidence: row.identityConfidence as AdvIdentityConfidence,
          relatedCrd: null,
          relatedFirmHref: null,
        };
        if (row.schedule === 'B') indirectOwners.push(party);
        else directOwners.push(party);
      }
    }
    if (control && mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'executive' })) {
      const key = partyKey(name, row.ownerId ?? row.titleOrStatus ?? '');
      if (!seenExec.has(key)) {
        seenExec.add(key);
        executives.push({
          displayName: name,
          kind,
          relationshipLabel: ADV_PUBLIC_COPY.reportedExecutive,
          ownershipBand: null,
          titleOrStatus: (row.titleOrStatus ?? '').trim() || null,
          filingDate: asDate(row.dateSubmitted),
          filingId: row.filingId,
          datasetKind: row.datasetKind,
          confidence: row.identityConfidence as AdvIdentityConfidence,
          relatedCrd: null,
          relatedFirmHref: null,
        });
      }
    }
  }

  const relatedOrganizations: AdvNamedParty[] = [];
  const seenRelated = new Set<string>();
  for (const row of input.related) {
    const name = (row.legalName ?? '').trim();
    if (!name) continue;
    if (!mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'related_organization' })) {
      continue;
    }
    const key = partyKey(name, row.relatedCrd ?? '');
    if (seenRelated.has(key)) continue;
    seenRelated.add(key);
    relatedOrganizations.push({
      displayName: name,
      kind: 'ORGANIZATION',
      relationshipLabel: ADV_PUBLIC_COPY.relatedOrganization,
      ownershipBand: null,
      titleOrStatus: null,
      filingDate: asDate(row.dateSubmitted),
      filingId: row.filingId,
      datasetKind: row.datasetKind,
      confidence: row.identityConfidence as AdvIdentityConfidence,
      relatedCrd: row.relatedCrd,
      relatedFirmHref: row.relatedFirmSlug ? `/firm/${row.relatedFirmSlug}` : null,
    });
  }

  const privateFunds: AdvNamedFund[] = [];
  const seenFund = new Set<string>();
  for (const row of input.funds) {
    const name = (row.fundName ?? '').trim();
    const fundId = (row.fundId ?? '').trim();
    if (!name || !fundId || !row.productId) continue;
    if (!mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'private_fund' })) {
      continue;
    }
    if (seenFund.has(fundId.toUpperCase())) continue;
    seenFund.add(fundId.toUpperCase());
    privateFunds.push({
      fundName: name,
      fundId,
      state: row.state,
      country: row.country,
      filingDate: asDate(row.dateSubmitted),
    });
  }

  const serviceProviders: AdvServiceProvider[] = [];
  const seenSp = new Set<string>();
  for (const row of input.providers) {
    const name = (row.providerName ?? '').trim();
    if (!name) continue;
    if (!mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'service_provider' })) {
      continue;
    }
    const key = `${row.role}::${name.toLowerCase()}`;
    if (seenSp.has(key)) continue;
    seenSp.add(key);
    serviceProviders.push({
      role: row.role,
      roleLabel: SERVICE_PROVIDER_ROLE_LABELS[row.role] ?? `${row.role} reported for a private fund`,
      providerName: name,
      confidence: row.identityConfidence as AdvIdentityConfidence,
      relatedCrd: row.providerCrd,
      filingDate: asDate(row.dateSubmitted),
    });
  }

  const otherOffices: AdvOffice[] = [];
  for (const row of input.offices) {
    if (!mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'other_office' })) {
      continue;
    }
    otherOffices.push({
      city: row.city,
      region: row.region,
      postalCode: row.postalCode,
      country: row.country,
      branchNumber: row.branchNumber,
      filingDate: asDate(row.dateSubmitted),
    });
  }

  const relyingAdvisers: AdvNamedParty[] = [];
  const seenRely = new Set<string>();
  for (const row of input.relying) {
    const name = (row.legalName ?? '').trim();
    if (!name) continue;
    if (!mayPublishAdvRelationship({ confidence: row.identityConfidence, isCurrent: row.isCurrent, family: 'relying_adviser' })) {
      continue;
    }
    const key = partyKey(name, row.relyingCrd ?? '');
    if (seenRely.has(key)) continue;
    seenRely.add(key);
    relyingAdvisers.push({
      displayName: name,
      kind: 'ORGANIZATION',
      relationshipLabel: 'Relying adviser reported in Form ADV',
      ownershipBand: null,
      titleOrStatus: null,
      filingDate: asDate(row.dateSubmitted),
      filingId: null,
      datasetKind: null,
      confidence: row.identityConfidence as AdvIdentityConfidence,
      relatedCrd: row.relyingCrd,
      relatedFirmHref: row.relyingFirmSlug ? `/firm/${row.relyingFirmSlug}` : null,
    });
  }

  const sortName = (a: AdvNamedParty, b: AdvNamedParty) => a.displayName.localeCompare(b.displayName);
  directOwners.sort(sortName);
  indirectOwners.sort(sortName);
  executives.sort(sortName);
  relatedOrganizations.sort(sortName);
  relyingAdvisers.sort(sortName);
  privateFunds.sort((a, b) => a.fundName.localeCompare(b.fundName));
  serviceProviders.sort((a, b) => a.roleLabel.localeCompare(b.roleLabel) || a.providerName.localeCompare(b.providerName));

  const recentFilings = [...input.filings]
    .sort((a, b) => (b.dateSubmitted ?? '').localeCompare(a.dateSubmitted ?? ''))
    .slice(0, ADV_PROFILE_FILING_LIMIT);
  const latest = recentFilings[0];

  const eraScale = notFiled(input.attributes, 'employee_count');
  const eraCustody = notFiled(input.attributes, 'custody_cash');
  const eraComp = notFiled(input.attributes, 'percentage_of_assets');

  return {
    version: TRUST_REPORT_SNAPSHOT_VERSION,
    crd: input.crd,
    slug: input.slug,
    wave1: input.wave1,
    item11: item11Copy(input.disclosureIndicator),
    scale: {
      employeeCount: eraScale ? null : numericLabel(attrs.get('employee_count')?.numericValue),
      advisoryPersonnelCount: eraScale ? null : numericLabel(attrs.get('advisory_personnel_count')?.numericValue),
      clientCount: eraScale ? null : numericLabel(attrs.get('client_count')?.numericValue),
      asOf,
      notFiledNote: eraScale ? 'Item 5 scale fields are not filed on this form type.' : null,
    },
    compensation: {
      methods: listedYes(input.attributes, COMPENSATION_METHOD_LABELS),
      asOf,
      notFiledNote: eraComp ? 'Item 5 compensation methods are not filed on this form type.' : null,
    },
    custody: {
      cash: eraCustody ? null : ynLabel(attrs.get('custody_cash')?.reportedYn),
      securities: eraCustody ? null : ynLabel(attrs.get('custody_securities')?.reportedYn),
      relatedPersonCash: eraCustody ? null : ynLabel(attrs.get('related_person_custody_cash')?.reportedYn),
      relatedPersonSecurities: eraCustody ? null : ynLabel(attrs.get('related_person_custody_securities')?.reportedYn),
      asOf,
      notFiledNote: eraCustody ? 'Item 9 custody is not filed on this form type.' : null,
    },
    otherBusiness: listedYes(input.attributes, OTHER_BUSINESS_LABELS),
    affiliationTypes: listedYes(input.attributes, AFFILIATION_TYPE_LABELS),
    clientTypes: listedYes(input.attributes, CLIENT_TYPE_LABELS),
    privateFundAggregates: {
      reportsPrivateFunds: ynLabel(attrs.get('reports_private_funds')?.reportedYn),
      count7b1: numericLabel(attrs.get('private_fund_count_7b1')?.numericValue),
      grossAssets: numericLabel(attrs.get('private_fund_gross_assets')?.numericValue),
      asOf: asDate(attrs.get('private_fund_count_7b1')?.asOfDate) ?? asOf,
    },
    current: {
      directOwners: cap(directOwners),
      indirectOwners: cap(indirectOwners),
      executives: cap(executives),
      relatedOrganizations: cap(relatedOrganizations),
      privateFunds: cap(privateFunds, 10),
      serviceProviders: cap(serviceProviders, 12),
      otherOffices: cap(otherOffices),
      relyingAdvisers: cap(relyingAdvisers),
      hiddenReviewRequired: input.hiddenReviewRequired,
      counts: {
        directOwners: directOwners.length,
        indirectOwners: indirectOwners.length,
        executives: executives.length,
        relatedOrganizations: relatedOrganizations.length,
        privateFunds: privateFunds.length,
        otherOffices: otherOffices.length,
        relyingAdvisers: relyingAdvisers.length,
      },
    },
    historical: {
      filingsTotal: input.filingsTotal,
      filingsRia: input.filingsRia,
      filingsEra: input.filingsEra,
      latestFilingDate: latest?.dateSubmitted ?? null,
      latestDatasetKind: latest?.datasetKind ?? null,
      latestFilingTypes: latest?.filingTypes ?? [],
      recentFilings,
      withdrawals: input.withdrawals.slice(0, 10),
    },
    documents: {
      crs: input.crs.slice(0, 8),
      part2aCount: input.part2aCount,
    },
    sources: {
      systemName: 'U.S. Securities and Exchange Commission / IARD',
      lead: ADV_PUBLIC_COPY.sourcesLead,
      notIndependentVerification: ADV_PUBLIC_COPY.notIndependentVerification,
    },
  };
}
