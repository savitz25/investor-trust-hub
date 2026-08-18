export const SOURCE_AUTHORITIES = [
  {
    id: 'sec',
    name: 'U.S. Securities and Exchange Commission',
    officialUrl: 'https://www.sec.gov',
    notes: 'Primary federal securities regulator for advisers, funds, issuers, and EDGAR filings.',
  },
  {
    id: 'finra',
    name: 'Financial Industry Regulatory Authority',
    officialUrl: 'https://www.finra.org',
    notes:
      'Broker-dealer and registered-person research. BrokerCheck has special permitted-use constraints.',
  },
  {
    id: 'nfa',
    name: 'National Futures Association',
    officialUrl: 'https://www.nfa.futures.org',
    notes: 'Futures and commodities self-regulatory organization.',
  },
  {
    id: 'cftc',
    name: 'U.S. Commodity Futures Trading Commission',
    officialUrl: 'https://www.cftc.gov',
    notes: 'Federal commodities and derivatives regulator.',
  },
  {
    id: 'state_securities',
    name: 'State securities regulators',
    officialUrl: 'https://www.nasaa.org',
    notes: 'State notice filings, IAR state registrations, and enforcement.',
  },
  {
    id: 'synthetic',
    name: 'Synthetic development source',
    officialUrl: 'https://github.com/savitz25/investor-trust-hub',
    notes: 'Not an official authority. Used only for labeled development fixtures.',
  },
] as const;

export const SOURCE_SYSTEMS = [
  {
    id: 'iapd',
    authorityId: 'sec',
    name: 'Investment Adviser Public Disclosure (IAPD / IARD)',
    officialUrl: 'https://adviserinfo.sec.gov',
    datasetKind: 'adviser_and_iar',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'ADV and IAR records change; display retrieved/effective dates.',
    correctionNotes: 'Corrections belong at the official IAPD/IARD filing, not by silent rewrite.',
    anticipatedEntities: ['person', 'firm', 'registration', 'disclosure', 'filing'] as const,
  },
  {
    id: 'form_adv',
    authorityId: 'sec',
    name: 'Form ADV / IARD adviser filings',
    officialUrl: 'https://www.sec.gov/information-for/investment-advisers',
    datasetKind: 'adviser_filing',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'Annual updating amendments and other-than-annual amendments.',
    correctionNotes: 'Preserve raw filing values even when later amendments supersede them.',
    anticipatedEntities: ['firm', 'filing', 'disclosure'] as const,
  },
  {
    id: 'brokercheck',
    authorityId: 'finra',
    name: 'FINRA BrokerCheck',
    officialUrl: 'https://brokercheck.finra.org',
    datasetKind: 'broker_and_bd',
    attributionRequired: true,
    marketingRestricted: true,
    prospectingProhibited: true,
    freshnessRequirementNotes:
      'BrokerCheck data may have freshness, attribution, correction, and marketing restrictions. Do not treat extracts as a sales-prospecting database.',
    correctionNotes:
      'Research/public evidence and any future Business Console prospecting systems must remain logically separable.',
    anticipatedEntities: ['person', 'firm', 'registration', 'disclosure', 'branch'] as const,
  },
  {
    id: 'edgar',
    authorityId: 'sec',
    name: 'SEC EDGAR',
    officialUrl: 'https://www.sec.gov/edgar',
    datasetKind: 'issuer_filing',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'Filings are point-in-time. Keep accession-level provenance.',
    correctionNotes: 'Amendments are new filings, not overwrites of the original accession.',
    anticipatedEntities: ['issuer', 'product', 'filing'] as const,
  },
  {
    id: 'sec_investment_company',
    authorityId: 'sec',
    name: 'SEC investment company data (N-CEN, N-PORT, series/class)',
    officialUrl: 'https://www.sec.gov/data-research/sec-markets-data/investment-company-series-class',
    datasetKind: 'registered_fund',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'Series/class identities change; keep historical mappings.',
    correctionNotes: 'Do not invent CUSIP/ISIN/ticker links without an official mapping.',
    anticipatedEntities: ['product', 'issuer', 'filing'] as const,
  },
  {
    id: 'nfa_basic',
    authorityId: 'nfa',
    name: 'NFA BASIC',
    officialUrl: 'https://www.nfa.futures.org/basicnet/',
    datasetKind: 'commodity_professional',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'Registration and disciplinary records change; store observed-at.',
    correctionNotes: 'Cite BASIC record identifiers; do not paraphrase into accusations.',
    anticipatedEntities: ['person', 'firm', 'registration', 'disclosure'] as const,
  },
  {
    id: 'cftc',
    authorityId: 'cftc',
    name: 'CFTC public enforcement and registration sources',
    officialUrl: 'https://www.cftc.gov',
    datasetKind: 'commodity_enforcement',
    attributionRequired: true,
    marketingRestricted: false,
    prospectingProhibited: false,
    freshnessRequirementNotes: 'Enforcement dockets are not a complete fitness history.',
    correctionNotes: 'Distinguish allegations, settlements, and judgments.',
    anticipatedEntities: ['person', 'firm', 'disclosure', 'filing'] as const,
  },
  {
    id: 'synthetic_dev',
    authorityId: 'synthetic',
    name: 'Synthetic development fixtures',
    officialUrl: 'https://github.com/savitz25/investor-trust-hub',
    datasetKind: 'development_only',
    attributionRequired: true,
    marketingRestricted: true,
    prospectingProhibited: true,
    freshnessRequirementNotes: 'Not a regulatory source.',
    correctionNotes: 'Must always display the synthetic disclaimer.',
    anticipatedEntities: ['person', 'firm', 'registration', 'disclosure'] as const,
  },
] as const;

export type SourceSystemId = (typeof SOURCE_SYSTEMS)[number]['id'];
export type SourceAuthorityId = (typeof SOURCE_AUTHORITIES)[number]['id'];

export function getSourceSystem(id: string) {
  return SOURCE_SYSTEMS.find((s) => s.id === id);
}

export function getSourceAuthority(id: string) {
  return SOURCE_AUTHORITIES.find((s) => s.id === id);
}

export function isProspectingProhibited(sourceSystemId: string): boolean {
  return getSourceSystem(sourceSystemId)?.prospectingProhibited === true;
}

export const BROKERCHECK_SEPARATION_RULE =
  'Never architect BrokerCheck-derived information as a sales-prospecting database. Research evidence and future Business Console prospecting must remain logically separable.';
