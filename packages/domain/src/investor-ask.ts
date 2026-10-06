/**
 * investor-ask-v1 — natural language → structured InvestorResearchQuery.
 * The interpreter parses language. It does not invent firm facts.
 */

import { COMPENSATION_METHOD_LABELS } from './adv-profile-intelligence';
import { REGION_NAMES, V1_RIA_RAUM_BANDS, V1_SOURCE } from './investor-home-intel';
import { planInvestorResearch, type InvestorResearchIntent, type InvestorCondition } from './investor-research-plan';
import { decideUsGeography, isNationwideScope } from './us-geography';
import { MA_PUBLIC_SNAPSHOT } from './ma-public-snapshot';
import { TN_PUBLIC_SNAPSHOT } from './tn-public-snapshot';
import { NV_PUBLIC_SNAPSHOT } from './nv-public-snapshot';
import { MN_PUBLIC_SNAPSHOT } from './mn-public-snapshot';
import { MI_IAPD_LENSES, MI_SECURITIES_ORDERS } from './mi-public-intel';
import { CT_REGISTRATION_LENSES, CT_SECURITIES_ORDERS } from './ct-public-intel';
import { MD_SECURITIES_ACTIONS } from './md-public-intel';
import { MD_REGISTRATION_LENSES } from './md-public-intel';
import { WI_REGISTRATION_LENSES, WI_SECURITIES_ORDERS } from './wi-public-intel';
import { IN_IAPD_LENSES, IN_SECURITIES_ORDERS } from './in-public-intel';
import { LA_REGISTRATION_LENSES } from './la-public-intel';
import { KY_DFI_2025_SECURITIES, KY_REGISTRATION_LENSES } from './ky-public-intel';
import { AL_REGISTRATION_LENSES, AL_SECURITIES_ORDERS } from './al-public-intel';
import { SC_REGISTRATION_LENSES, SC_SECURITIES_ORDERS } from './sc-public-intel';
import { MS_REGISTRATION_LENSES } from './ms-public-intel';
import AR_IAPD_CENSUS from '../../../data/arkansas/ar-inv-001/iapd-ar-census.json';
import NE_IAPD_CENSUS from '../../../data/nebraska/ne-inv-001/iapd-ne-census.json';
import ID_IAPD_CENSUS from '../../../data/idaho/id-inv-001/iapd-id-census.json';
export type { InvestorResearchIntent, InvestorCondition } from './investor-research-plan';

export const INVESTOR_ASK_CONTRACT = 'investor-ask-v1' as const;
export const INVESTOR_ASK_PAGE_SIZE = 20;

export const INVESTOR_ASK_CAPABILITY = {
  contract: INVESTOR_ASK_CONTRACT,
  askStatus: 'live' as const,
  federatedExecution: 'execute' as const,
  askUrl: 'https://www.investortrusthub.com/ask',
  apiUrl: 'https://www.investortrusthub.com/api/ask',
  supportedModes: [
    'entity',
    'identifier',
    'count',
    'aggregate',
    'comparison',
    'evidence',
    'definition',
    'fail_closed',
  ] as const,
  identifier: 'labeled_firm_crd_or_sec_file_number',
  geographyMeaning: 'Principal-office state/city/ZIP on the SEC/IARD roster — not client geography, service area, or notice-filing footprint.',
  limitations: [
    'RIA and ERA stay separate classes unless the interpretation explicitly shows both.',
    'Principal office is not client geography.',
    'RAUM is Form ADV Item 5F(2)(c), RIA only. It is not performance or firm quality.',
    'Item 5.E compensation methods are Y/N checkboxes, not fee amounts.',
    'ERA filers do not file RAUM or Item 5.E.',
    'Observation count is not firm count.',
    'Wave-1 public profiles (1,000) are a publication gate, not a quality ranking.',
    'Historical Form ADV field diffs are not supported.',
    'No Trust Score, paid ranking, or investment recommendation.',
  ],
};

export type InvestorAskMode =
  | 'entity'
  | 'identifier'
  | 'count'
  | 'aggregate'
  | 'comparison'
  | 'evidence'
  | 'definition'
  | 'fail_closed';

export type InvestorFirmType = 'ria' | 'era' | 'all';

export type InvestorAskSort = 'name' | 'raum_desc' | 'raum_asc' | 'filing_date' | 'crd';

export type CompensationMethodKey = keyof typeof COMPENSATION_METHOD_LABELS;

export type RaumBandId =
  | 'zero'
  | 'under25m'
  | 'from25mTo100m'
  | 'from100mTo1b'
  | 'from1bTo10b'
  | 'atLeast10b';

/** Existing homepage RAUM bands (Item 5F(2)(c)). Zero is reported, not missing. */
export const ASK_RAUM_BANDS: ReadonlyArray<{
  id: RaumBandId;
  label: string;
  min: number | null;
  maxExclusive: number | null;
  equalsZero?: boolean;
}> = [
  { id: 'zero', label: 'Reported zero', min: 0, maxExclusive: 0, equalsZero: true },
  { id: 'under25m', label: 'Under $25 million', min: 0, maxExclusive: 25_000_000 },
  { id: 'from25mTo100m', label: '$25 million–under $100 million', min: 25_000_000, maxExclusive: 100_000_000 },
  { id: 'from100mTo1b', label: '$100 million–under $1 billion', min: 100_000_000, maxExclusive: 1_000_000_000 },
  { id: 'from1bTo10b', label: '$1 billion–under $10 billion', min: 1_000_000_000, maxExclusive: 10_000_000_000 },
  { id: 'atLeast10b', label: '$10 billion or more', min: 10_000_000_000, maxExclusive: null },
];

export const COMPENSATION_FIELD_NAMES: Record<CompensationMethodKey, string> = {
  percentage_of_assets: '5E(1)',
  hourly_charges: '5E(2)',
  subscription_fees: '5E(3)',
  fixed_fees: '5E(4)',
  commissions: '5E(5)',
  performance_based_fees: '5E(6)',
  other_compensation: '5E(7)',
};

export const AFFILIATION_FIELDS = {
  affiliation_broker_dealer: { field: '7A(1)', label: 'affiliation with a broker-dealer (Item 7.A(1))' },
  affiliation_banking: { field: '7A(8)', label: 'affiliation with a banking or thrift institution (Item 7.A(8))' },
  other_business_broker_dealer: { field: '6A(1)', label: 'other business as a broker-dealer (Item 6.A(1))' },
} as const;

export type InvestorResearchQuery = {
  intent?: InvestorResearchIntent;
  conditions?: InvestorCondition[];
  registrationJurisdictions?: string[];
  registrationType?: 'state_ria' | 'state_era' | 'notice' | 'sec_ria';
  terminalState?: 'NEEDS_CLARIFICATION' | 'UNSUPPORTED' | 'INVALID_INPUT';
  answer?: string;
  selectedCrd?: string;
  originalName?: string;
  inputOverrides?: InvestorAskOverrides;
  mode: InvestorAskMode;
  firmType?: InvestorFirmType;
  status?: 'registered' | 'pending' | 'reporting' | 'current_roster';
  geography?: {
    type: 'principal_office_state' | 'principal_office_city' | 'zip';
    value: string;
    meaning: string;
    ambiguous?: boolean;
    state?: string;
  };
  compareGeography?: {
    type: 'principal_office_state';
    value: string;
    meaning: string;
  };
  identifier?: { type: 'crd' | 'sec_file_number'; value: string };
  raum?: { min?: number; maxExclusive?: number; equalsZero?: boolean; bandId?: RaumBandId };
  compensationMethods?: CompensationMethodKey[];
  compensationMatch?: 'all' | 'any';
  affiliationField?: keyof typeof AFFILIATION_FIELDS;
  nameQuery?: string;
  /** Honest disclosure when a fee-model or specialty qualifier (e.g. "fee-only", "retirement
   * planning specialist") was asked for but is not a searchable Form ADV field -- the search
   * broadens to real advisers/firms instead of dead-ending on the unsupported specificity. */
  unsupportedSpecialtyNote?: string;
  evidenceFamilies?: string[];
  aggregateMetric?:
    | 'raum_bands'
    | 'compensation_methods'
    | 'firm_type'
    | 'principal_office_state'
    | 'observation_count';
  sort?: InvestorAskSort;
  page: number;
  definitionId?: string;
  failReason?: string;
  alternatives?: string[];
};

export type InterpretationLine = { label: string; value: string };

export type ParsedInvestorAsk = {
  raw: string;
  query: InvestorResearchQuery;
  interpretation: InterpretationLine[];
  geographyNote?: string;
};

export type InvestorAskOverrides = {
  page?: number;
  sort?: InvestorAskSort;
  firmType?: InvestorFirmType;
  state?: string;
  broaden?: string;
  selected?: string;
  identity?: string;
  raum?: InvestorResearchQuery['raum'];
  compensationMethods?: CompensationMethodKey[];
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

const LABELED_CRD = /\bcrd\s*#?\s*(\d{1,10})\b/i;
const LABELED_SEC_FILE = /\b(?:sec(?:\s+file)?(?:\s+number)?|file)\s*#?\s*(801-\d{1,8})\b/i;
const BARE_DIGITS = /^\d{4,10}$/;

function parseMoneyToken(raw: string): number | undefined {
  const m = raw
    .replace(/,/g, '')
    .trim()
    .match(/^\$?\s*([\d.]+)\s*(trillion|t|billion|b|million|m|thousand|k)?$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'trillion' || unit === 't') return n * 1_000_000_000_000;
  if (unit === 'billion' || unit === 'b') return n * 1_000_000_000;
  if (unit === 'million' || unit === 'm') return n * 1_000_000;
  if (unit === 'thousand' || unit === 'k') return n * 1_000;
  return n;
}

function detectStates(q: string): string[] {
  const found: string[] = [];
  const add = (code: string) => {
    if (!found.includes(code)) found.push(code);
  };
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(q)) add(code);
  }
  for (const code of Object.keys(REGION_NAMES)) {
    if (new RegExp(`\\bin ${code}\\b`, 'i').test(q) || new RegExp(`\\b${code}\\b(?=\\s+principal office)`, 'i').test(q)) {
      add(code);
    }
  }
  // TH-DISCOVERY-PARITY-001B: the checks above only ever recognise a literal state name/code
  // token. A question that names only a city or county ("... near Fort Worth", "financial
  // advisors Palm Beach County") resolved no state here at all. Fall back to the shared US
  // geography gazetteer (city/county/metro -> state), which is the same general resolver every
  // other layer of the interpreter now uses, so bare place names behave consistently everywhere
  // detectStates() feeds a decision (count, aggregate, comparison, and the entity flow).
  if (!found.length) {
    const decision = decideUsGeography(q);
    if (decision.state) add(decision.state);
  }
  return found;
}

/**
 * Finance-domain qualifier stems and the consumer role words they combine with. This is a
 * generalised synonym/stem match (TH-DISCOVERY-PARITY-001B), not a growing allowlist of literal
 * example strings -- it is meant to keep recognising new adjective + role combinations ("estate
 * planning advisor", "asset management firm") without another one-off ticket.
 */
const FINANCE_QUALIFIER = '(?:investment|financial|wealth(?:\\s+management)?|retirement(?:[- ]planning)?|fee[- ]only|money|asset(?:\\s+management)?|estate(?:[- ]planning)?)';
const DISCOVERY_ROLE = '(?:advis(?:er|or)s?|planners?|managers?|specialists?)';
const DISCOVERY_QUALIFIER_ROLE_PATTERN = new RegExp(`\\b${FINANCE_QUALIFIER}[ -]?${DISCOVERY_ROLE}\\b`, 'i');
const DISCOVERY_FIRM_PATTERN =
  /\b(?:advis(?:er|or)|advisory|wealth management|financial planning|investment|money management)\s+firms?\b/i;

/** Consumer product qualifiers (fee model or claimed specialty) not established by Form ADV source
 * fields. These must never dead-end the search -- they broaden to real advisers/firms with an
 * honest disclosure instead (ticket Section 4, same shape as the Insurance LOA-specificity fix). */
const UNSUPPORTED_SPECIALTY_PATTERN =
  /\bfee[- ]only\b|\bfee[- ]based\b|\bcommission[- ]only\b|\bno[- ]load\b|\bfiduciary[- ]only\b|\bretirement(?:[- ]planning)? specialist\b|\bretirement(?:[- ]planning)? expert\b|\bcertified\b/i;

function detectFirmType(q: string): InvestorFirmType | undefined {
  const ria = /\brias?\b|\bregistered investment advisers?\b|\bsec-registered\b/i.test(q);
  const era = /\beras?\b|\bexempt reporting advisers?\b/i.test(q);
  if (ria && era) return 'all';
  if (ria) return 'ria';
  if (era) return 'era';
  // TH-DISCOVERY-GEN-001 / TH-DISCOVERY-PARITY-001B: ordinary consumer provider-category phrases
  // ("financial adviser", "wealth management firm", "fee-only financial planner", "retirement
  // planning advisor" ...) are a request to browse the adviser/firm universe, not a company name
  // and not a request that needs clarification. Generalised to a qualifier+role / role+firm
  // pattern (see above) instead of a literal-string allowlist, so new phrasing of the same shape
  // does not require another hardcoded fix.
  if (DISCOVERY_QUALIFIER_ROLE_PATTERN.test(q) || DISCOVERY_FIRM_PATTERN.test(q)) return 'all';
  return undefined;
}

function detectCompensation(q: string): CompensationMethodKey[] {
  const keys: CompensationMethodKey[] = [];
  const add = (k: CompensationMethodKey) => {
    if (!keys.includes(k)) keys.push(k);
  };
  if (/\basset-based\b|\bpercentage of assets\b|\baum fees?\b|\b5e\(1\)\b/i.test(q)) add('percentage_of_assets');
  if (/\bhourly\b|\b5e\(2\)\b/i.test(q)) add('hourly_charges');
  if (/\bsubscription\b|\b5e\(3\)\b/i.test(q)) add('subscription_fees');
  if (/\bfixed fees?\b|\b5e\(4\)\b/i.test(q)) add('fixed_fees');
  if (/\bcommissions?\b|\b5e\(5\)\b/i.test(q)) add('commissions');
  if (/\bperformance-based fees?\b|\b5e\(6\)\b/i.test(q) && !/\bbest performance\b|\binvestment performance\b/i.test(q)) {
    add('performance_based_fees');
  }
  if (/\bother compensation\b|\b5e\(7\)\b/i.test(q)) add('other_compensation');
  return keys;
}

function detectRaum(q: string): InvestorResearchQuery['raum'] | undefined {
  const between = q.match(
    /between\s+(\$?[\d.,]+\s*(?:trillion|billion|million|thousand|[tbm k])?)\s+and\s+(\$?[\d.,]+\s*(?:trillion|billion|million|thousand|[tbm k])?)\s*(?:raum|regulatory assets)?/i,
  );
  if (between) {
    const min = parseMoneyToken(between[1] ?? '');
    const max = parseMoneyToken(between[2] ?? '');
    if (min !== undefined && max !== undefined) {
      const band = ASK_RAUM_BANDS.find((b) => b.min === min && b.maxExclusive === max);
      return { min, maxExclusive: max, bandId: band?.id };
    }
  }
  const moreThan = q.match(
    /(?:more than|greater than|over|at least|≥|>=)\s+(\$?[\d.,]+\s*(?:trillion|billion|million|thousand|[tbm k])?)\s*(?:raum|regulatory assets)?/i,
  );
  if (moreThan) {
    const min = parseMoneyToken(moreThan[1] ?? '');
    if (min !== undefined) {
      const gt = /\bmore than\b|\bgreater than\b|\bover\b/i.test(moreThan[0]);
      return { min: gt ? min : min, maxExclusive: undefined };
    }
  }
  if (/\bunder \$100\s*m|\bless than \$100\s*million/i.test(q)) {
    return { min: 0, maxExclusive: 100_000_000, bandId: undefined };
  }
  for (const band of ASK_RAUM_BANDS) {
    if (band.id !== 'zero' && q.toLowerCase().includes(band.label.toLowerCase())) {
      return { min: band.min ?? undefined, maxExclusive: band.maxExclusive ?? undefined, bandId: band.id, equalsZero: band.equalsZero };
    }
  }
  return undefined;
}

function detectSort(q: string): InvestorAskSort | undefined {
  if (/\bmost raum\b|\bhighest raum\b|\braum descending\b|\blargest reported raum\b/i.test(q)) return 'raum_desc';
  if (/\blowest raum\b|\braum ascending\b|\bsmallest reported raum\b/i.test(q)) return 'raum_asc';
  if (/\blatest filing\b|\brecent(?:ly)? amended\b|\bfiling date\b/i.test(q)) return 'filing_date';
  if (/\bby crd\b|\bcrd order\b/i.test(q)) return 'crd';
  if (/\bby name\b|\balphabetical\b/i.test(q)) return 'name';
  return undefined;
}

export const ASK_DEFINITIONS: Record<string, { title: string; body: string }> = {
  ria: {
    title: 'Registered investment adviser (RIA)',
    body: 'An RIA is a firm whose Form ADV / IARD record reports it as a registered investment adviser. InvestorTrustHub shows what the cited SEC/IARD extract reports. Registration is a regulatory category — not SEC approval, endorsement, or a quality rating. ERA is not an RIA.',
  },
  era: {
    title: 'Exempt reporting adviser (ERA)',
    body: 'An ERA files a limited Form ADV report because it qualifies for an exemption from full SEC registration. It is not a registered investment adviser. Exemption from full registration is not a finding of safety, quality, or honesty.',
  },
  crd: {
    title: 'CRD number',
    body: 'A CRD number is the Central Registration Depository identifier for a firm (or, in other systems, a person). InvestorTrustHub uses organization CRD as the firm identity key. A CRD is an identifier, not an endorsement.',
  },
  raum: {
    title: 'Regulatory assets under management (RAUM)',
    body: 'RAUM here is Form ADV Item 5F(2)(c) as the RIA filer reported it, in U.S. dollars. It is a regulatory size figure. It is not client assets as a marketing claim, firm value, investment performance, returns, or a quality score. ERA filers do not file this item. Zero is a reported value, not missing data.',
  },
  form_adv: {
    title: 'Form ADV',
    body: 'Form ADV is the official SEC/IARD registration and reporting form for investment advisers. InvestorTrustHub organizes selected fields from the current IARD extract. The SEC states that neither the SEC nor state authorities have approved the information filed on Form ADV.',
  },
  asset_based: {
    title: 'Asset-based compensation on Form ADV',
    body: 'Form ADV Item 5.E(1) is a Yes/No checkbox: “Percentage of assets under management.” It is a reported compensation method, not a fee schedule, not a 1% rate, and not a “fee-only” classification.',
  },
  principal_office: {
    title: 'Principal office',
    body: 'Principal office is the main-office address stored on the SEC/IARD roster record. It is not client geography, service territory, or the set of states where the adviser notice-files or serves clients.',
  },
  sec_file: {
    title: 'SEC file number',
    body: 'An SEC file number is a sourced regulatory filing identifier for an adviser firm. It is not a CRD, a Form ADV filing ID, an individual identifier, or SEC approval.',
  },
};

function failClosed(reason: string, alternatives: string[]): InvestorResearchQuery {
  return {
    mode: 'fail_closed',
    page: 1,
    failReason: reason,
    alternatives,
  };
}

function isRecommendationQuery(q: string): boolean {
  return (
    /\b(best|safest|most trustworthy|trustworthiest|lowest fees?|cheapest|who should i hire|should i (hire|use)|best returns?|highest[- ]performing|highest[- ]rated|highest (returns?|performance)|most profitable|make me the most money|most money|top[- ]rated|most trusted)\b/i.test(
      q,
    ) ||
    /\b(what stocks? should i buy|should i buy|move my ira|portfolio recommendation|pick (an? )?investments?)\b/i.test(q) ||
    /\b(?:recommended|recommendations?)\b/i.test(q) ||
    /\b(?:paid|sponsored)\s+rankings?\b/i.test(q) ||
    /\btrust\s+scores?\b/i.test(q) ||
    /\baggregate\s*ratings?\b/i.test(q) ||
    /\bnumber one\b/i.test(q) ||
    /\bratingValue\b/i.test(q) ||
    /(?:^|\s)#1\b/i.test(q) ||
    /\brank(?:ings?|ed)\b/i.test(q)
  );
}

function isFiduciaryBinary(q: string): boolean {
  return /\b(more trustworthy|more fiduciary|ria or broker)\b/i.test(q) && /\b(ria|broker)\b/i.test(q);
}

function interpretInvestorAskQueryCore(raw: string, overrides: InvestorAskOverrides = {}): ParsedInvestorAsk {
  const queryText = raw.trim().slice(0, 400);
  const q = queryText;
  const page = Math.max(1, Math.min(200, overrides.page ?? 1));

  const lines: InterpretationLine[] = [];
  const push = (label: string, value: string) => lines.push({ label, value });

  if (!q) {
    const empty: InvestorResearchQuery = {
      mode: 'fail_closed',
      page: 1,
      failReason: 'Enter a research question. InvestorTrustHub organizes SEC/IARD records; it does not recommend advisers.',
      alternatives: [
        'Show SEC-registered RIAs in Florida.',
        'Find CRD 123456.',
        'What does RAUM mean?',
      ],
    };
    return { raw: q, query: empty, interpretation: [{ label: 'Status', value: 'No question yet' }] };
  }

  if (/\bwhat changed\b|\bwhat changed in this firm's form adv\b/i.test(q)) {
    const query = failClosed(
      'Field-level Form ADV change comparison is not supported in the current extract. InvestorTrustHub can show current filing dates, not inferred differences.',
      ['When was this firm’s latest Form ADV filing? Use a labeled CRD.', 'Show SEC-registered RIAs in Florida.'],
    );
    push('Mode', 'fail_closed');
    push('Reason', query.failReason ?? '');
    return { raw: q, query, interpretation: lines };
  }

  if (isFiduciaryBinary(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank RIAs against broker-dealers as more trustworthy. Duties depend on the relationship and the law. Registration class is not a trust claim.',
      ['What is an RIA?', 'What is an ERA?', 'Show SEC-registered RIAs in Florida.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (isRecommendationQuery(q)) {
    const query = failClosed(
      'InvestorTrustHub researches adviser regulatory records. It does not rank advisers, predict returns, price advice, or recommend investments or hiring decisions.',
      [
        'Show SEC-registered RIAs in Florida.',
        'Show RIAs reporting between $1 billion and $10 billion RAUM.',
        'Show firms reporting asset-based fees.',
        'What does RAUM mean?',
      ],
    );
    push('Mode', 'fail_closed');
    push('Reason', query.failReason ?? '');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(no disclosures?|clean disciplinary history|no enforcement|clean history)\b/i.test(q)) {
    const query = failClosed(
      'Missing or unlinked disclosure and enforcement evidence cannot establish a clean history. Research an exact firm and review the coverage and source limitations.',
      ['Find CRD 105958.', 'Ownership evidence for CRD 105958.'],
    );
    push('Mode', 'fail_closed');
    push('Coverage', 'UNKNOWN / PARTIAL — absence is not established');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(?:check|verify|research) the adviser (?:who|that)\b|\bdoes this adviser have (?:disciplinary|disclosure) history\b/i.test(q)) {
    const query = failClosed(
      'A firm name, labeled firm CRD, or SEC file number is required to research a specific adviser without returning unrelated firms.',
      ['Find CRD 105958.', 'Find SEC 801-11953.', 'Search a firm name in the firm directory.'],
    );
    push('Mode', 'fail_closed');
    push('Identity', 'Specific firm not supplied');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bownership (?:evidence|control) for (?:an?|this) adviser\b|\bwho owns this adviser firm\b/i.test(q)) {
    const query = failClosed(
      'Ownership/control research is firm-specific and partial. Supply a labeled firm CRD so source observations can be attributed without guessing identity.',
      ['Ownership evidence for CRD 105958.', 'Find CRD 105958.'],
    );
    push('Mode', 'fail_closed');
    push('Coverage', 'PARTIAL — exact firm identity required');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhat is an? ria\b|\bwhat is a registered investment adviser\b/i.test(q)) {
    return definitionResult(q, 'ria', page);
  }
  if (/\bwhat is an? era\b|\bwhat is an exempt reporting adviser\b/i.test(q)) {
    return definitionResult(q, 'era', page);
  }
  if (/\bwhat is (a |an )?crd\b|\bwhat does a crd number identify\b/i.test(q)) {
    return definitionResult(q, 'crd', page);
  }
  if (/\bwhat (is|does) (regulatory )?(assets under management|raum|aum)\b|\bwhat does raum mean\b|\bwhat does regulatory aum mean\b/i.test(q)) {
    return definitionResult(q, 'raum', page);
  }
  if (/\bwhat is form adv\b/i.test(q)) {
    return definitionResult(q, 'form_adv', page);
  }
  if (/\bwhat (?:is|does) (?:an? )?sec file(?: number)?(?: mean| identify)?\b/i.test(q)) {
    return definitionResult(q, 'sec_file', page);
  }
  if (/\bwhat does asset-based compensation mean\b|\basset-based (compensation|fees?) mean\b/i.test(q)) {
    return definitionResult(q, 'asset_based', page);
  }

  const secMatch = q.match(LABELED_SEC_FILE);
  if (secMatch?.[1]) {
    const value = secMatch[1].toUpperCase();
    const query: InvestorResearchQuery = { mode: 'identifier', identifier: { type: 'sec_file_number', value }, evidenceFamilies: ['identity'], page, sort: 'crd' };
    push('Mode', 'identifier');
    push('Identifier', `SEC file ${value} (labeled)`);
    push('Source', 'SEC/IARD Form ADV roster');
    if (/\bwisconsin\b/i.test(q)) push('Wisconsin context', 'InvestorTrustHub /wisconsin; SEC file identity alone does not establish Wisconsin registration.');
    if (/\bindiana\b/i.test(q)) push('Indiana context', 'InvestorTrustHub Indiana (/indiana); SEC file identity alone does not establish Indiana registration or notice filing.');
    if (/\blouisiana\b/i.test(q)) push('Louisiana context', 'InvestorTrustHub /louisiana; SEC file identity alone does not establish Louisiana registration or notice filing.');
    if (/\bkentucky\b/i.test(q)) push('Kentucky context', 'InvestorTrustHub /kentucky; SEC file identity alone does not establish Kentucky registration or notice filing.');
    if (/\balabama\b/i.test(q)) push('Alabama context', 'InvestorTrustHub /alabama; SEC file identity alone does not establish Alabama registration or notice filing.');
    if (/\bsouth carolina\b/i.test(q)) push('South Carolina context', 'InvestorTrustHub /south-carolina; SEC file identity alone does not establish South Carolina registration or notice filing.');
    if (/\bmississippi\b/i.test(q)) push('Mississippi context', 'InvestorTrustHub /mississippi; SEC file identity alone does not establish Mississippi registration or notice filing.');
    return { raw: q, query, interpretation: lines };
  }

  const crdMatch = q.match(LABELED_CRD);
  if (crdMatch?.[1]) {
    if (/\b(?:iar|individual adviser|person)\s+crd\b/i.test(q)) {
      const query = failClosed('InvestorTrustHub Specialist Search is firm-focused. A person or IAR CRD must not be resolved as a firm CRD.', ['Find firm CRD 105958.', 'What is a CRD number?']);
      push('Mode', 'fail_closed');
      push('Identity class', 'Individual/IAR — outside the public firm search');
      return { raw: q, query, interpretation: lines };
    }
    const value = crdMatch[1];
    const evidence =
      /\b(compensation|raum|filing|owner|ownership|affiliat|evidence|what compensation)\b/i.test(q) ||
      /\bwhat compensation methods\b/i.test(q);
    const query: InvestorResearchQuery = {
      mode: evidence ? 'evidence' : 'identifier',
      identifier: { type: 'crd', value },
      evidenceFamilies: evidence ? ['identity', 'raum', 'compensation', 'filing'] : ['identity'],
      page,
      sort: 'crd',
    };
    push('Mode', query.mode);
    push('Identifier', `CRD ${value} (labeled)`);
    push('Source', 'SEC/IARD Form ADV roster');
    if (/\bwisconsin\b/i.test(q)) push('Wisconsin context', 'InvestorTrustHub /wisconsin; firm CRD identity alone does not establish Wisconsin registration.');
    if (/\bindiana\b/i.test(q)) push('Indiana context', 'InvestorTrustHub Indiana (/indiana); firm CRD identity alone does not establish Indiana registration or notice filing.');
    if (/\blouisiana\b/i.test(q)) push('Louisiana context', 'InvestorTrustHub /louisiana; firm CRD identity alone does not establish Louisiana registration or notice filing.');
    if (/\bkentucky\b/i.test(q)) push('Kentucky context', 'InvestorTrustHub /kentucky; firm CRD identity alone does not establish Kentucky registration or notice filing.');
    if (/\balabama\b/i.test(q)) push('Alabama context', 'InvestorTrustHub /alabama; firm CRD identity alone does not establish Alabama registration or notice filing.');
    if (/\bsouth carolina\b/i.test(q)) push('South Carolina context', 'InvestorTrustHub /south-carolina; firm CRD identity alone does not establish South Carolina registration or notice filing.');
    if (/\bmississippi\b/i.test(q)) push('Mississippi context', 'InvestorTrustHub /mississippi; firm CRD identity alone does not establish Mississippi registration or notice filing.');
    return { raw: q, query, interpretation: lines };
  }

  if (BARE_DIGITS.test(q.trim())) {
    const query = failClosed(
      'Bare digits are ambiguous (CRD, CIK, and other identifiers). Use a labeled CRD such as “Find CRD 123456.”',
      ['Find CRD 123456.'],
    );
    push('Mode', 'fail_closed');
    push('Identifier', 'Unlabeled digits');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(?:iar|individual adviser|person)\s+crd\b/i.test(q)) {
    const query = failClosed('InvestorTrustHub Specialist Search is firm-focused. A person or IAR CRD must not be resolved as a firm CRD.', ['Find firm CRD 105958.', 'What is a CRD number?']);
    push('Mode', 'fail_closed');
    push('Identity class', 'Individual/IAR — outside the public firm search');
    return { raw: q, query, interpretation: lines };
  }

  // KY-INV-001: labeled firm identifiers above outrank state and city words.
  const kyNamed = /\bkentucky\b/i.test(q);
  const kyCity = /\b(louisville|lexington)\b/i.exec(q);
  const kyBlockedByOtherState = !kyNamed && /\b(alabama|mississippi|louisiana|indiana|wisconsin|tennessee|ohio|georgia|pennsylvania|north carolina|texas|nevada|minnesota|michigan|maryland|connecticut|virginia|colorado|illinois|oregon|california|washington|arizona|new york|new jersey|massachusetts)\b/i.test(q);
  if ((kyNamed || (kyCity && !kyBlockedByOtherState)) && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const ky = KY_REGISTRATION_LENSES;
    const report = KY_DFI_2025_SECURITIES;
    const reason = kyCity && !kyNamed
      ? 'The named Kentucky city is geography only. InvestorTrustHub publishes no Louisville or Lexington securities route. A principal office does not establish Kentucky registration or notice filing. Use /kentucky.'
      : /\bcomplaints?\b/i.test(q)
        ? 'The Kentucky Department of Financial Institutions, Securities Division investigates complaints. Provider-level complaint records and outcomes were not acquired. A complaint is not a finding. Use /kentucky.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? `The 2025 DFI annual report, as of December 31, 2025, prints ${report.enforcement.administrativeOrders} securities administrative orders and ${report.enforcement.civilOrders} civil orders. The Securities Enforcement Actions index was not parsed into rows. Exact CRD attachments: 0. An annual-report total is not an order document. Use /kentucky.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? `DFI's 2025 Compliance Branch table prints ${report.examinations.brokerDealer} broker-dealer examinations, ${report.examinations.investmentAdvisory} investment-advisory examinations, and ${report.examinations.total} total. An examination is not a violation, and the ${report.examinations.ordersOrAgreementsEnteredFromExamination} orders or agreements entered from examinations are not the ${report.enforcement.administrativeOrders} administrative orders. Use /kentucky.`
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? `DFI's year-end 2025 table prints ${report.investmentAdviserRepresentatives.totalStateAndFederalYearEnd.toLocaleString('en-US')} state and federal investment adviser representatives. That is a person grain, not split into state versus federal, and not the ${report.glance.securitiesProfessionals.toLocaleString('en-US')} broker-dealer agent registrations. A person CRD is not a firm CRD. Use /kentucky.`
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? `DFI's year-end 2025 table prints ${report.yearEnd.brokerDealers.totalRegistered.toLocaleString('en-US')} broker-dealer firms and ${report.yearEnd.brokerDealerAgents.totalRegistered.toLocaleString('en-US')} broker-dealer agent registrations. Issuer agents are a separate printed ${report.yearEnd.issuerAgents.totalRegistered}. These are not investment-adviser firms and not a CRD roster. Use /kentucky.`
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The accepted national SEC/IARD roster reports ${ky.principalOffice.count} Kentucky principal-office firm records as of ${ky.principalOffice.sourceAsOf}. Office geography is not Kentucky registration or notice filing. DFI's printed headquarters name list is a different grain. Use /kentucky.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The accepted IAPD state compilation lists ${ky.era.count} active Kentucky exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /kentucky.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The accepted IAPD SEC compilation lists ${ky.federalNotice.count.toLocaleString('en-US')} firms with a FILED Kentucky notice as of ${ky.acceptedIapdSourceDate}. DFI's December 31, 2025 effective notice filings are ${report.federalCoveredNoticeFilings.totalEffectiveYearEnd.toLocaleString('en-US')}. A notice filing is not Kentucky state IA registration, and the two clocks are not the same count. Use /kentucky.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Kentucky IAPD state IA (${ky.stateIa.count}), federal notice (${ky.federalNotice.count.toLocaleString('en-US')}), ERA (${ky.era.count}) and principal-office (${ky.principalOffice.count}) lenses cannot be combined. DFI's December 31, 2025 state-registered IA total (${report.yearEnd.stateRegisteredInvestmentAdvisers.totalRegistered}) is a separate clock. Use /kentucky.`
                        : `The accepted IAPD state compilation lists ${ky.stateIa.count} Kentucky state-registered IA firm CRDs (APPROVED) as of ${ky.acceptedIapdSourceDate}. DFI's December 31, 2025 year-end state-registered IA total is ${report.yearEnd.stateRegisteredInvestmentAdvisers.totalRegistered}. Those clocks are not added. Federal notice, ERA and principal office stay separate. Use /kentucky.`;
    const query = failClosed(reason, ['Kentucky investor research page.', 'Find firm CRD 105958.']);
    if (kyCity && !kyNamed) query.geography = { type: 'principal_office_city', value: kyCity[1]!, state: 'KY', meaning: 'City context only; not Kentucky registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // LA-INV-001: labeled firm identifiers above outrank state and city words.
  const laNamed = /\blouisiana\b/i.test(q);
  const laCity = /\b(new orleans|baton rouge|shreveport|lafayette)\b/i.exec(q);
  if ((laNamed || laCity) && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const la = LA_REGISTRATION_LENSES;
    const reason = laCity
      ? 'The named Louisiana city is geography only. InvestorTrustHub publishes no city securities route and no parish route. A principal office does not establish Louisiana registration or notice filing. Use /louisiana.'
      : /\bcomplaints?\b/i.test(q)
        ? 'The Louisiana Office of Financial Institutions, Securities Division accepts written investor complaints. Provider-level complaint records and outcomes were not acquired; a complaint is not a finding. Use /louisiana.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? 'A public OFI securities administrative-order index was not acquired. Criminal-prosecution headlines were not counted as orders and were not attached to CRDs. A cease-and-desist is not a final finding. Exact CRD attachments: 0. Use /louisiana.'
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'OFI publishes an examination policy for broker-dealers and state-registered investment advisers; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /louisiana.'
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Louisiana investment adviser representatives are persons, not firms. The IAR bulk roster was not acquired. A person CRD is not a firm CRD. Use /louisiana.'
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? 'OFI registers broker-dealers, agents and adviser representatives as separate firm and person grains. Bulk rosters were not acquired. Use /louisiana.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The accepted national SEC/IARD roster reports ${la.principalOffice.count} Louisiana principal-office firm records as of ${la.principalOffice.sourceAsOf}. Office geography is not Louisiana registration or notice filing. Use /louisiana.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The accepted IAPD state compilation lists ${la.era.count} active Louisiana exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /louisiana.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The accepted IAPD SEC compilation lists ${la.federalNotice.count.toLocaleString('en-US')} firms with a FILED Louisiana notice. A notice filing is not Louisiana state IA registration. Use /louisiana.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Louisiana state IA (${la.stateIa.count}), federal notice (${la.federalNotice.count.toLocaleString('en-US')}), ERA (${la.era.count}) and principal-office (${la.principalOffice.count}) lenses cannot be combined into one adviser total. Use /louisiana.`
                        : `The accepted IAPD state compilation lists ${la.stateIa.count} Louisiana state-registered IA firm CRDs (APPROVED). Federal notice (${la.federalNotice.count.toLocaleString('en-US')}), ERA (${la.era.count}) and principal-office (${la.principalOffice.count}) lenses are separate and must not be added. Use /louisiana.`;
    const query = failClosed(reason, ['Louisiana investor research page.', 'Find firm CRD 105958.']);
    if (laCity) query.geography = { type: 'principal_office_city', value: laCity[1]!, state: 'LA', meaning: 'City context only; not Louisiana registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // AL-INV-001: labeled firm identifiers above outrank state and city words.
  // Bare "mobile" is an ordinary word and is not an Alabama city trigger.
  const alNamed = /\balabama\b/i.test(q);
  const alCity = /\b(birmingham|montgomery|huntsville|tuscaloosa)\b/i.exec(q);
  const mobileAlabama = /\bmobile,?\s+alabama\b/i.test(q);
  if ((alNamed || alCity || mobileAlabama) && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const al = AL_REGISTRATION_LENSES;
    const cityLabel = mobileAlabama ? 'Mobile' : alCity?.[1];
    const reason = cityLabel && !(/\balabama\b/i.test(q) && !mobileAlabama && !alCity)
      ? 'The named Alabama city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish Alabama registration or notice filing. Use /alabama.'
      : /\bcomplaints?\b/i.test(q)
        ? 'The Alabama Securities Commission publishes a complaint procedure. Provider-level complaint records and outcomes were not acquired; a complaint is not a finding. Use /alabama.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? `The ASC administrative-action index lists ${AL_SECURITIES_ORDERS.rowCount} documents in the 2025 and 2026 folders (${AL_SECURITIES_ORDERS.yearCounts['2026']} in 2026 and ${AL_SECURITIES_ORDERS.yearCounts['2025']} in 2025). Source action tags stay separate. A cease-and-desist is not a final adjudication. Older year folders were not acquired. Exact CRD attachments: 0. Use /alabama.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'The Alabama Securities Commission publishes an Auditing Division page; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /alabama.'
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Alabama investment adviser representatives are persons, not firms. The IAR bulk roster was not acquired. A person CRD is not a firm CRD. Use /alabama.'
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? 'The Alabama Securities Commission registers broker-dealers, broker-dealer agents and adviser representatives as separate firm and person grains. Bulk rosters were not acquired. Use /alabama.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The accepted national SEC/IARD roster reports ${al.principalOffice.count} Alabama principal-office firm records as of ${al.principalOffice.sourceAsOf}. Office geography is not Alabama registration or notice filing. Use /alabama.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The accepted IAPD state compilation lists ${al.era.count} active Alabama exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /alabama.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The accepted IAPD SEC compilation lists ${al.federalNotice.count.toLocaleString('en-US')} firms with a FILED Alabama notice. A notice filing is not Alabama state IA registration. Use /alabama.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Alabama state IA (${al.stateIa.count}), federal notice (${al.federalNotice.count.toLocaleString('en-US')}), ERA (${al.era.count}) and principal-office (${al.principalOffice.count}) lenses cannot be combined into one adviser total. Use /alabama.`
                        : `The accepted IAPD state compilation lists ${al.stateIa.count} Alabama state-registered IA firm CRDs (APPROVED). Federal notice (${al.federalNotice.count.toLocaleString('en-US')}), ERA (${al.era.count}) and principal-office (${al.principalOffice.count}) lenses are separate and must not be added. Use /alabama.`;
    const query = failClosed(reason, ['Alabama investor research page.', 'Find firm CRD 105958.']);
    if (cityLabel) query.geography = { type: 'principal_office_city', value: cityLabel, state: 'AL', meaning: 'City context only; not Alabama registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // SC-INV-001: full state name or "in sc". Bare "sc" is not South Carolina.
  // Charleston, Columbia and Greenville are geography only when the state is also named.
  const scNamed = /\bsouth carolina\b|\bin sc\b/i.test(q);
  const scCity = scNamed && /\b(charleston|columbia|greenville)\b/i.exec(q);
  if (scNamed && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const sc = SC_REGISTRATION_LENSES;
    const reason = scCity
      ? 'The named South Carolina city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish South Carolina registration or notice filing. Use /south-carolina.'
      : /\bcomplaints?\b/i.test(q)
        ? 'Provider-level South Carolina securities complaint records were not acquired. A complaint is not a finding. Use /south-carolina.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? `The South Carolina Attorney General notices-and-orders index lists ${SC_SECURITIES_ORDERS.yearCounts['2025']} documents on the 2025 page and ${SC_SECURITIES_ORDERS.yearCounts['2026']} on the 2026 page. Those ${SC_SECURITIES_ORDERS.rowCount} index rows keep their printed dispositions. A cease-and-desist is not a final adjudication. A consent order stays a consent order. A summons and complaint is not an order. Older year pages were not acquired. Captions that print a CRD were not copied and were not joined. Exact CRD attachments: 0. Use /south-carolina.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'Provider-level South Carolina securities examination rows were not acquired. An examination is not a violation. Missing rows are not a clean examination history. Use /south-carolina.'
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? 'South Carolina investment adviser representatives are persons, not firms. The IAR bulk roster was not acquired. A person CRD is not a firm CRD. Use /south-carolina.'
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? 'The South Carolina Securities Act treats broker-dealers, agents and adviser representatives as separate firm and person grains. Bulk rosters were not acquired. Use /south-carolina.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The accepted national SEC/IARD roster reports ${sc.principalOffice.count} South Carolina principal-office firm records as of ${sc.principalOffice.sourceAsOf}. Office geography is not South Carolina registration or notice filing. Use /south-carolina.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The accepted IAPD state compilation lists ${sc.era.count} active South Carolina exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /south-carolina.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The accepted IAPD SEC compilation lists ${sc.federalNotice.count.toLocaleString('en-US')} firms with a FILED South Carolina notice. A notice filing is not South Carolina state IA registration. Use /south-carolina.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `South Carolina state IA (${sc.stateIa.count}), federal notice (${sc.federalNotice.count.toLocaleString('en-US')}), ERA (${sc.era.count}) and principal-office (${sc.principalOffice.count}) lenses cannot be combined into one adviser total. Use /south-carolina.`
                        : `The accepted IAPD state compilation lists ${sc.stateIa.count} South Carolina state-registered IA firm CRDs (APPROVED). Federal notice (${sc.federalNotice.count.toLocaleString('en-US')}), ERA (${sc.era.count}) and principal-office (${sc.principalOffice.count}) lenses are separate and must not be added. Use /south-carolina.`;
    const query = failClosed(reason, ['South Carolina investor research page.', 'Find firm CRD 105958.']);
    if (scCity) query.geography = { type: 'principal_office_city', value: scCity[1]!, state: 'SC', meaning: 'City context only; not South Carolina registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // MS-INV-001: bare Jackson, Gulfport, and Biloxi are not Mississippi triggers.
  const msNamed = /\bmississippi\b/i.test(q) || (/\bin ms\b/i.test(q) && !/\bmissouri\b/i.test(q));
  const msCity = msNamed ? /\b(jackson|gulfport|biloxi)\b/i.exec(q) : null;
  if (msNamed && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const ms = MS_REGISTRATION_LENSES;
    const reason = msCity
      ? 'The named Mississippi city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish Mississippi registration or notice filing. Use /mississippi.'
      : /\bcomplaints?\b/i.test(q)
        ? 'The Mississippi Secretary of State Securities Division publishes a complaint form. Provider-level complaint records and outcomes were not acquired; a complaint is not a finding. Use /mississippi.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? 'A Mississippi securities order roster was NOT_ACQUIRED. The public enforcement search is not a census. A cease-and-desist is not a final adjudication. Exact CRD attachments: 0. Use /mississippi.'
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'Provider-level Mississippi examination outcomes were NOT_ACQUIRED. Missing is not a clean examination history. Use /mississippi.'
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Mississippi investment adviser representatives are persons, not firms. The IAR bulk roster was not acquired. A person CRD is not a firm CRD. Use /mississippi.'
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? 'The Mississippi Secretary of State registers broker-dealers, agents and adviser representatives as separate firm and person grains. Bulk rosters were not acquired. Use /mississippi.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The accepted national SEC/IARD roster reports ${ms.principalOffice.count} Mississippi principal-office firm records as of ${ms.principalOffice.sourceAsOf}. Office geography is not Mississippi registration or notice filing. Use /mississippi.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The accepted IAPD state compilation lists ${ms.era.count} active Mississippi exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /mississippi.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The accepted IAPD SEC compilation lists ${ms.federalNotice.count.toLocaleString('en-US')} firms with a FILED Mississippi notice. A notice filing is not Mississippi state IA registration. Use /mississippi.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Mississippi state IA (${ms.stateIa.count}), federal notice (${ms.federalNotice.count.toLocaleString('en-US')}), ERA (${ms.era.count}) and principal-office (${ms.principalOffice.count}) lenses cannot be combined into one adviser total. Use /mississippi.`
                        : `The accepted IAPD state compilation lists ${ms.stateIa.count} Mississippi state-registered IA firm CRDs (APPROVED). Federal notice (${ms.federalNotice.count.toLocaleString('en-US')}), ERA (${ms.era.count}) and principal-office (${ms.principalOffice.count}) lenses are separate and must not be added. Use /mississippi.`;
    const query = failClosed(reason, ['Mississippi investor research page.', 'Find firm CRD 105958.']);
    if (msCity) query.geography = { type: 'principal_office_city', value: msCity[1]!, state: 'MS', meaning: 'City context only; not Mississippi registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // AR-INV-001: full state name, uppercase AR, or "in ar". "in arizona" is not Arkansas.
  // Little Rock, Fayetteville, and Fort Smith are geography only when Arkansas is named.
  const arNamed = (/\barkansas\b/i.test(q) || /\bAR\b/.test(q) || /(?:\bin\s+|,\s*)ar\b/i.test(q)) && !/\barizona\b/i.test(q);
  const arCity = arNamed ? /\b(little rock|fayetteville|fort smith)\b/i.exec(q) : null;
  if (arNamed && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many)\b/i.test(q)) {
    const arState = AR_IAPD_CENSUS.state;
    const arSec = AR_IAPD_CENSUS.sec;
    const reason = arCity
      ? 'The named Arkansas city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish Arkansas registration or notice filing. Use /arkansas.'
      : /\bcomplaints?\b/i.test(q)
        ? 'Provider-level Arkansas securities complaint records were NOT_ACQUIRED. A complaint is not a finding. Use /arkansas.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? 'An Arkansas Securities Department order corpus was NOT_ACQUIRED. No order was attached by name. Exact CRD attachments: 0. Use /arkansas.'
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'Provider-level Arkansas examination outcomes were NOT_ACQUIRED. Missing is not a clean examination history. Use /arkansas.'
            : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Arkansas investment adviser representatives are persons, not firms. The IAR bulk roster was not acquired. A person CRD is not a firm CRD. Use /arkansas.'
              : /\b(?:broker[- ]?dealers?|securities agents?|agents?)\b/i.test(q)
                ? 'Broker-dealers, agents and adviser representatives are separate firm and person grains. Arkansas bulk rosters were not acquired. Use /arkansas.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The SEC IAPD compilation lists ${arSec.ar_principal_office_distinct_crd} Arkansas principal-office firm CRDs as of ${arSec.sourceAsOf}. Office geography is not Arkansas registration or notice filing. Use /arkansas.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The IAPD state compilation lists ${arState.ar_state_era_active_distinct_crd} active Arkansas exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /arkansas.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The IAPD SEC compilation lists ${arSec.ar_notice_filed_distinct_crd.toLocaleString('en-US')} firms with a FILED Arkansas notice. A notice filing is not Arkansas state IA registration. Use /arkansas.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Arkansas state IA (${arState.ar_state_ia_approved_distinct_crd}), federal notice (${arSec.ar_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${arState.ar_state_era_active_distinct_crd}) and principal-office (${arSec.ar_principal_office_distinct_crd}) lenses cannot be combined into one adviser total. Use /arkansas.`
                        : `The IAPD state compilation lists ${arState.ar_state_ia_approved_distinct_crd} Arkansas state-registered IA firm CRDs (APPROVED). Federal notice (${arSec.ar_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${arState.ar_state_era_active_distinct_crd}) and principal-office (${arSec.ar_principal_office_distinct_crd}) lenses are separate and must not be added. Use /arkansas.`;
    const query = failClosed(reason, ['Arkansas investor research page.', 'Find firm CRD 105958.']);
    if (arCity) query.geography = { type: 'principal_office_city', value: arCity[1]!, state: 'AR', meaning: 'City context only; not Arkansas registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // NE-INV-001: "in ne" does not match Nevada. Omaha and Lincoln are not triggers.
  const neNamed = (/\bnebraska\b/i.test(q) || /\bin ne\b/i.test(q)) && !/\bnevada\b/i.test(q);
  const neCity = neNamed ? /\b(omaha|lincoln)\b/i.exec(q) : null;
  if (neNamed && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many|registration)\b/i.test(q)) {
    const neState = NE_IAPD_CENSUS.state;
    const neSec = NE_IAPD_CENSUS.sec;
    const reason = neCity
      ? 'The named Nebraska city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish Nebraska registration or notice filing. Use /nebraska.'
      : /\bcomplaints?\b/i.test(q)
        ? 'Provider-level Nebraska securities complaint records were NOT_ACQUIRED. A complaint is not a finding. Use /nebraska.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? 'A Nebraska securities order corpus was NOT_ACQUIRED. No order was attached by name. Use /nebraska.'
          : /\b(?:investment adviser representatives?|iars?)\b/i.test(q)
            ? 'The 2024 annual report prints 4,891 investment adviser representatives registered as of June 30, 2024, and 1,197 new representative registrations in that same dated table. New registrations are not the stock. A person-level roster was NOT_ACQUIRED. A person is not a firm. Use /nebraska.'
            : /\b(?:broker[- ]?dealers?|agents?)\b/i.test(q)
              ? 'The 2024 annual report prints 1,336 broker-dealers and 144,170 agents of broker-dealers registered as of June 30, 2024. New registrations in that year were 64 broker-dealers and 33,285 agents. Those new rows are not the stock. IAPD firm feeds are not this broker-dealer roster. Use /nebraska.'
              : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                ? `The SEC IAPD compilation lists ${neSec.ne_principal_office_distinct_crd} Nebraska principal-office firm CRDs as of ${neSec.sourceAsOf}. The state compilation lists ${neState.principal_office_ne_among_state_ia} of ${neState.ne_state_ia_distinct_crd} state IA CRDs with a Nebraska office. Office geography is not registration. Use /nebraska.`
                : /\b(?:era|exempt reporting)\b/i.test(q)
                  ? `The IAPD state compilation lists ${neState.ne_state_era_active_distinct_crd} active Nebraska exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /nebraska.`
                  : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                    ? `The IAPD SEC compilation lists ${neSec.ne_notice_filed_distinct_crd.toLocaleString('en-US')} firms with a FILED Nebraska notice as of ${neSec.sourceAsOf}. The June 30, 2024 annual report printed 2,004 federal covered advisers. Those clocks are not added. A notice filing is not Nebraska state IA registration. Use /nebraska.`
                    : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                      ? `Nebraska state IA APPROVED (${neState.ne_state_ia_approved_distinct_crd}), federal notice (${neSec.ne_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${neState.ne_state_era_active_distinct_crd}) and principal-office (${neSec.ne_principal_office_distinct_crd}) lenses cannot be combined into one adviser total. Use /nebraska.`
                      : `The IAPD state compilation lists ${neState.ne_state_ia_distinct_crd} Nebraska state IA firm CRDs as of ${neState.sourceAsOf}: ${neState.ne_state_ia_approved_distinct_crd} APPROVED, 1 CONDREST, and 1 TERMREQUEST. Federal notice (${neSec.ne_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${neState.ne_state_era_active_distinct_crd}) and SEC principal-office (${neSec.ne_principal_office_distinct_crd}) lenses are separate and must not be added. Use /nebraska.`;
    const query = failClosed(reason, ['Nebraska investor research page.', 'Open IAPD for a named firm CRD.']);
    if (neCity) query.geography = { type: 'principal_office_city', value: neCity[1]!, state: 'NE', meaning: 'City context only; not Nebraska registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // ID-INV-001: full name or "in id". A bare id token is not Idaho. Boise is not a trigger by itself.
  const idNamed = /\bidaho\b/i.test(q) || /\bin id\b/i.test(q);
  const idCity = idNamed ? /\b(boise|meridian|nampa|pocatello|idaho falls|twin falls|coeur d'alene)\b/i.exec(q) : null;
  if (idNamed && /\b(?:investment|advis[eo]rs?|ria|eras?|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exams?|principal office|agents?|representatives?|iars?|total|combined|how many|registration|best|rank|recommend)\b/i.test(q)) {
    const idState = ID_IAPD_CENSUS.state;
    const idSec = ID_IAPD_CENSUS.sec;
    const reason = /\b(?:best|rank|recommend|trust score|aggregaterating)\b/i.test(q)
      ? 'InvestorTrustHub does not rank Idaho advisers and does not publish a Trust Score. Use /idaho.'
      : idCity
        ? 'The named Idaho city is geography only. InvestorTrustHub publishes no city securities route and no county route. A principal office does not establish Idaho registration or notice filing. Use /idaho.'
        : /\bcomplaints?\b/i.test(q)
          ? 'Provider-level Idaho securities complaint records were NOT_ACQUIRED. A complaint is not a finding. Use /idaho.'
          : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?|examinations?|exams?)\b/i.test(q)
            ? 'Idaho securities examinations and the order corpus were NOT_ACQUIRED. No order was attached by name. Use /idaho.'
            : /\b(?:investment adviser representatives?|iars?|representatives?)\b/i.test(q)
              ? 'Idaho investment adviser representatives are persons, not firms. The IAR roster was NOT_ACQUIRED. A person is not a firm. Use /idaho.'
              : /\b(?:broker[- ]?dealers?|agents?)\b/i.test(q)
                ? 'Idaho broker-dealers and securities salespersons were NOT_ACQUIRED. Those grains are not the IAPD firm feeds. Use /idaho.'
                : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                  ? `The SEC IAPD compilation lists ${idSec.id_principal_office_distinct_crd} Idaho principal-office firm CRDs as of ${idSec.sourceAsOf}. Office geography is not Idaho registration. Use /idaho.`
                  : /\b(?:era|exempt reporting)\b/i.test(q)
                    ? `The IAPD state compilation lists ${idState.id_state_era_active_distinct_crd} active Idaho exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /idaho.`
                    : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                      ? `The IAPD SEC compilation lists ${idSec.id_notice_filed_distinct_crd.toLocaleString('en-US')} firms with a FILED Idaho notice. A notice filing is not Idaho state IA registration. Use /idaho.`
                      : /\b(?:total|combined|how many|all)\b/i.test(q) && !/\b(?:state[- ]registered|notice|era|exempt|principal|broker|agent|representative|federal)\b/i.test(q)
                        ? `Idaho APPROVED state IA (${idState.id_state_ia_approved_distinct_crd}), federal notice (${idSec.id_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${idState.id_state_era_active_distinct_crd}) and principal-office (${idSec.id_principal_office_distinct_crd}) lenses cannot be combined into one adviser total. Use /idaho.`
                        : `The IAPD state compilation lists ${idState.id_state_ia_approved_distinct_crd} Idaho state-registered IA firm CRDs (APPROVED) as of ${idState.sourceAsOf}. One TERMREQUEST firm is not added. Federal notice (${idSec.id_notice_filed_distinct_crd.toLocaleString('en-US')}), ERA (${idState.id_state_era_active_distinct_crd}) and principal-office (${idSec.id_principal_office_distinct_crd}) lenses are separate and must not be added. Use /idaho.`;
    const query = failClosed(reason, ['Idaho investor research page.', 'Open IAPD for a named firm CRD.']);
    if (idCity) query.geography = { type: 'principal_office_city', value: idCity[1]!, state: 'ID', meaning: 'City context only; not Idaho registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // IN-INV-001: labeled firm identifiers above outrank state and city words.
  const inNamed = /\bindiana\b/i.test(q);
  const inCity = /\b(indianapolis|fort wayne|evansville|south bend)\b/i.exec(q);
  if ((inNamed || inCity) && /\b(?:investment|advis[eo]r|advisers|ria|era|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exam|principal office|agent|representative|iar)\b/i.test(q)) {
    const reason = inCity
      ? 'The named Indiana city is geography only. InvestorTrustHub publishes no city securities route. A principal office does not establish Indiana registration or notice filing. Use /indiana.'
      : /\bcomplaints?\b/i.test(q)
        ? 'The Indiana Secretary of State, Securities Division accepts investor complaints. Provider-level complaint records and outcomes were not acquired; a complaint is not a finding. Use /indiana.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?|administrative actions?)\b/i.test(q)
          ? `The Indiana Securities Division index lists ${IN_SECURITIES_ORDERS.rowCount} securities administrative actions dated 2022–2026, with final, consent, cease-and-desist, bar and revocation labels kept distinct. ${IN_SECURITIES_ORDERS.exactFirmCrdLinks} carry an exact IAPD firm-CRD link; no adverse profile evidence was attached. Use /indiana.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'The Indiana Securities Division describes an investment-adviser examination program and an annual questionnaire for Indiana-domiciled advisers; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /indiana.'
            : /\b(?:broker[- ]?dealers?|securities agents?|agents?|investment adviser representatives?|iars?|representatives?)\b/i.test(q)
              ? 'The Indiana Securities Division registers broker-dealers, broker-dealer agents and investment adviser representatives as separate firm and person grains. Indiana bulk rosters were not acquired; verify through BrokerCheck or IAPD. Use /indiana.'
              : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                ? `The accepted 2026-09-17 SEC compilation reports ${IN_IAPD_LENSES.principalOffice.distinctFirmCrd} Indiana principal-office firm CRDs. Office geography is not Indiana registration or notice filing. Use /indiana.`
                : /\b(?:era|exempt reporting)\b/i.test(q)
                  ? `The accepted IAPD state compilation lists ${IN_IAPD_LENSES.era.activeDistinctFirmCrd} active Indiana exempt reporting adviser firm CRDs. ERA status is not state IA or SEC registration. Use /indiana.`
                  : /\b(?:federal[- ]covered|notice[- ]filed|notice filing|notice)\b/i.test(q)
                    ? `The accepted IAPD SEC compilation lists ${IN_IAPD_LENSES.federalNotice.filedDistinctFirmCrd} firms with a FILED Indiana notice. A notice filing is not Indiana state IA registration. Use /indiana.`
                    : `The accepted IAPD state compilation lists ${IN_IAPD_LENSES.stateIa.approvedDistinctFirmCrd} Indiana state-registered IA firm CRDs (APPROVED). Federal notice (${IN_IAPD_LENSES.federalNotice.filedDistinctFirmCrd}), ERA (${IN_IAPD_LENSES.era.activeDistinctFirmCrd}) and principal-office (${IN_IAPD_LENSES.principalOffice.distinctFirmCrd}) lenses are separate and must not be added. Use /indiana.`;
    const query = failClosed(reason, ['Indiana investor research page.', 'Find firm CRD 105958.']);
    if (inCity) query.geography = { type: 'principal_office_city', value: inCity[1]!, state: 'IN', meaning: 'City context only; not Indiana registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // WI-INV-001: labeled firm identifiers above outrank state and city words.
  const wiNamed = /\bwisconsin\b/i.test(q) || /\bWI\b/.test(q);
  const wiCity = /\b(milwaukee|madison|green bay|kenosha)\b/i.exec(q);
  if ((wiNamed || wiCity) && /\b(?:investment|advis[eo]r|ria|era|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exam|principal office)\b/i.test(q)) {
    const reason = wiCity
      ? 'The named Wisconsin city is geography only. InvestorTrustHub publishes no city securities route. A principal office does not establish Wisconsin registration or notice filing. Use /wisconsin.'
      : /\bcomplaints?\b/i.test(q)
        ? 'Wisconsin DFI accepts investor complaints. Provider-level complaint records and outcomes were not acquired; a complaint is not a finding. Use /wisconsin.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? `Wisconsin DFI indexes ${WI_SECURITIES_ORDERS.rowCount} dated administrative orders in 2022–2026. Summary, consent, final and settlement entries remain distinct. No adverse profile evidence was attached. Use /wisconsin.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'Wisconsin DFI describes an investment-adviser examination program; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /wisconsin.'
            : /\b(?:broker[- ]?dealers?|securities agents?|investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Wisconsin DFI verifies broker-dealers, agents and adviser representatives as separate firm and person grains. Bulk rosters were not acquired. Use /wisconsin.'
              : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                ? `The accepted national SEC/IARD roster reports ${WI_REGISTRATION_LENSES.principalOffice.count} Wisconsin principal-office firm records as of ${WI_REGISTRATION_LENSES.principalOffice.sourceAsOf}. Office geography is not Wisconsin registration or notice filing. Use /wisconsin.`
                : 'Wisconsin state IA, federal notice and ERA counts and exact CRD overlaps were not acquired; verify exact current status with DFI or IAPD. The older principal-office geography lens is separate. Use /wisconsin.';
    const query = failClosed(reason, ['Wisconsin investor research page.', 'Find firm CRD 105958.']);
    if (wiCity) query.geography = { type: 'principal_office_city', value: wiCity[1]!, state: 'WI', meaning: 'City context only; not Wisconsin registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // MD-INV-001: labeled firm identifiers above outrank state and city words.
  const mdNamed = /\bmaryland\b/i.test(q) || /\bMD\b/.test(q);
  const mdCity = /\b(baltimore|annapolis|frederick|rockville)\b/i.exec(q);
  if ((mdNamed || mdCity) && /\b(?:investment|advis[eo]r|ria|era|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exam|principal office)\b/i.test(q)) {
    const reason = mdCity
      ? 'The named Maryland city is geography only. InvestorTrustHub publishes no city securities route. A principal office does not establish Maryland registration or notice filing. Use /maryland.'
      : /\bcomplaints?\b/i.test(q)
        ? 'Maryland Securities Division accepts investor complaints; public provider-level complaint records and outcomes were not acquired. A complaint is not a finding. Use /maryland.'
        : /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q)
          ? `Maryland Securities Division indexes ${MD_SECURITIES_ACTIONS.rows.length} dated action documents in 2022–2026. Show-cause, consent and final orders remain distinct. No adverse profile evidence was attached. Use /maryland.`
          : /\b(?:examinations?|exams?)\b/i.test(q)
            ? 'Maryland describes an investment-adviser examination program; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /maryland.'
            : /\b(?:broker[- ]?dealers?|securities agents?|investment adviser representatives?|iars?)\b/i.test(q)
              ? 'Maryland broker-dealers, agents and adviser representatives have separate firm and person grains. Verify exact status with the Securities Division, IAPD or BrokerCheck. Bulk rosters were not acquired. Use /maryland.'
              : /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q)
                ? `The accepted national SEC/IARD roster reports ${MD_REGISTRATION_LENSES.principalOffice.count} Maryland principal-office firm records as of ${MD_REGISTRATION_LENSES.principalOffice.sourceAsOf}. Office geography is not Maryland registration or notice filing. Use /maryland.`
                : 'Maryland state IA, federal notice and ERA counts and exact CRD overlaps were not acquired; verify exact current status with the Securities Division or IAPD. The older principal-office geography lens is separate. Use /maryland.';
    const query = failClosed(reason, ['Maryland investor research page.', 'Find firm CRD 105958.']);
    if (mdCity) query.geography = { type: 'principal_office_city', value: mdCity[1]!, state: 'MD', meaning: 'City context only; not Maryland registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // CT-INV-001: exact labeled firm identifiers above outrank geography and keywords.
  const ctNamed = /\bconnecticut\b/i.test(q) || /\bCT\b/.test(q);
  const ctCity = /\b(hartford|new haven|stamford|bridgeport)\b/i.exec(q);
  if ((ctNamed || ctCity) && /\b(?:investment|advis[eo]r|ria|era|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exam|principal office)\b/i.test(q)) {
    const lenses = CT_REGISTRATION_LENSES.iapd;
    const complaint = /\bcomplaints?\b/i.test(q);
    const enforcement = /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q);
    const exam = /\bexaminations?|exams?\b/i.test(q);
    const bd = /\b(?:broker[- ]?dealers?|securities agents?|investment adviser representatives?|iars?)\b/i.test(q);
    const notice = /\b(?:notice[- ]fil\w*|federal[- ]covered)\b/i.test(q);
    const era = /\b(?:era|exempt reporting)\b/i.test(q);
    const principal = /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q);
    const reason = ctCity
      ? 'The named Connecticut city is geography only. InvestorTrustHub publishes no city securities route. A principal office does not establish Connecticut registration or notice filing. Use /connecticut for statewide lenses.'
      : complaint
        ? 'Connecticut DOB accepts securities complaints with a Connecticut nexus. Provider-level complaint records and outcomes were not acquired. A complaint is not a finding. Use /connecticut.'
        : enforcement
          ? `Connecticut DOB indexes ${CT_SECURITIES_ORDERS.rows.length} securities-order PDF links in 2022–2026. These are documents, not unique matters or final findings. ${CT_SECURITIES_ORDERS.exactFirmCrdCrosswalks} have exact firm-CRD crosswalks; no adverse evidence was attached to profiles. Use /connecticut.`
          : exam
            ? 'Connecticut DOB examines investment advisers and broker-dealers; provider-level outcomes were not acquired. Missing is not a clean examination history. Use /connecticut.'
            : bd
              ? 'Connecticut broker-dealers, securities agents and investment adviser representatives have separate firm/person grains. Connecticut-only bulk rosters were not acquired; verify through DOB, IAPD or BrokerCheck. Use /connecticut.'
              : notice
                ? `IAPD reports ${lenses.federalNotice.filedFirmCrds.toLocaleString('en-US')} Connecticut FILED federal notice firm CRDs (${lenses.sourceAsOf}). A notice is not state IA registration. Use /connecticut.`
                : era
                  ? `IAPD reports ${lenses.era.activeFirmCrds} Connecticut ACTIVE ERA firm CRDs (${lenses.sourceAsOf}). ERA is not an RIA. Use /connecticut.`
                  : principal
                    ? `The SEC compilation has ${lenses.principalOffice.firmCrds} firm CRDs with a Connecticut principal office (${lenses.sourceAsOf}). Office geography is not registration. Use /connecticut.`
                    : `IAPD reports ${lenses.stateIa.approvedFirmCrds} Connecticut state IA firm CRDs with status APPROVED (${lenses.sourceAsOf}). ERA (${lenses.era.activeFirmCrds}), federal notice (${lenses.federalNotice.filedFirmCrds.toLocaleString('en-US')}) and principal-office (${lenses.principalOffice.firmCrds}) lenses are separate and must not be summed. DOB's three dated adviser lists are also available. Use /connecticut.`;
    const query = failClosed(reason, ['Connecticut investor research page.', 'Find firm CRD 105958.']);
    if (ctCity) query.geography = { type: 'principal_office_city', value: ctCity[1]!, state: 'CT', meaning: 'City context only; not Connecticut registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // MI-INV-001: regulator-specific lenses are public research, not national search filters.
  // Labeled firm identifiers above remain stronger than state/name/geography routing.
  const miNamed = /\bmichigan\b/i.test(q) || /\bMI\b/.test(q);
  const miCity = /\b(detroit|grand rapids|lansing|ann arbor)\b/i.exec(q);
  if ((miNamed || miCity) && /\b(?:investment|advis[eo]r|ria|era|broker|securities|crd|sec|notice|disciplin|enforc|complaint|exam|principal office)\b/i.test(q)) {
    const ia = MI_IAPD_LENSES.stateIa;
    const era = MI_IAPD_LENSES.era;
    const notice = MI_IAPD_LENSES.federalNotice;
    const principal = MI_IAPD_LENSES.principalOffice;
    const complaint = /\bcomplaints?\b/i.test(q);
    const enforcement = /\b(?:disciplin\w*|enforc\w*|orders?|sanctions?)\b/i.test(q);
    const exam = /\bexaminations?|exams?\b/i.test(q);
    const bd = /\b(?:broker[- ]?dealers?|securities agents?|investment adviser representatives?|iars?)\b/i.test(q);
    const noticeAsked = /\b(?:notice[- ]fil\w*|federal[- ]covered)\b/i.test(q);
    const eraAsked = /\b(?:era|exempt reporting)\b/i.test(q);
    const principalAsked = /\b(?:principal office|headquarter\w*|based in|located in)\b/i.test(q);
    const reason = miCity
      ? `The named Michigan city is geography only. InvestorTrustHub publishes no city securities route. A principal office does not establish Michigan registration or notice filing. Use /michigan for statewide lenses; /firms?state=MI is the existing office-geography research path.`
      : complaint
        ? 'Michigan CSCL accepts securities complaints through MiCLEAR. Provider-level complaint cases and outcomes were not acquired; a complaint is not an order. Use /michigan.'
        : enforcement
          ? `Michigan CSCL publishes ${MI_SECURITIES_ORDERS.rows.length} MUSA-tagged documents in 2022–2026 order-index paths. These are documents, not unique matters or findings. ${MI_SECURITIES_ORDERS.exactFirmCrdCrosswalks} documents have a caption-printed firm CRD exactly overlapping an accepted IAPD firm lens; no adverse evidence was attached to profiles. Use /michigan.`
          : exam
            ? 'Michigan CSCL examines state investment advisers; provider-level examination outcomes were not acquired. Missing is not a clean examination history. Use /michigan.'
            : bd
              ? 'Michigan broker-dealers, securities agents and investment adviser representatives have separate firm/person grains. Michigan-only bulk rosters were not acquired; verify on MiCLEAR, IAPD or BrokerCheck. Use /michigan.'
              : noticeAsked
                ? `IAPD reports ${notice.filedDistinctFirmCrd.toLocaleString('en-US')} Michigan FILED federal notice firm CRDs (${notice.filter}, ${MI_IAPD_LENSES.secFeed.sourceAsOf}). Notice filing is not Michigan state IA registration. Use /michigan.`
                : eraAsked
                  ? `IAPD reports ${era.activeDistinctFirmCrd} Michigan ACTIVE ERA firm CRDs (${era.filter}, ${MI_IAPD_LENSES.stateFeed.sourceAsOf}). ERA is not an RIA. Use /michigan.`
                  : principalAsked
                    ? `The SEC compilation has ${principal.distinctFirmCrd} firm CRDs with a Michigan principal office (${MI_IAPD_LENSES.secFeed.sourceAsOf}). Office geography is not registration or notice filing. Use /michigan.`
                    : `IAPD reports ${ia.approvedDistinctFirmCrd} Michigan state IA firm CRDs with status APPROVED (${ia.filter}, ${MI_IAPD_LENSES.stateFeed.sourceAsOf}). ERA (${era.activeDistinctFirmCrd}), federal notice (${notice.filedDistinctFirmCrd.toLocaleString('en-US')}) and principal-office (${principal.distinctFirmCrd}) lenses are separate and must not be summed. Michigan's CSCL bulk license spreadsheet is request-only. Use /michigan.`;
    const query = failClosed(reason, ['Michigan investor research page.', 'Find firm CRD 105958.']);
    if (miCity) query.geography = { type: 'principal_office_city', value: miCity[1]!, state: 'MI', meaning: 'City context only; not Michigan registration or service territory' };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\b(?:new jersey state rias?|advisers? registered in new jersey)\b/i.test(q)) {
    const query = failClosed('New Jersey’s complete state-RIA roster is request-only and is not the SEC/IARD principal-office universe. Missing coverage is not zero.', ['SEC/IARD firms reporting a principal office in New Jersey.']);
    push('Coverage', 'REQUEST_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:california state rias?|advisers? registered in california)\b/i.test(q)) {
    const query = failClosed('California’s complete current state-RIA roster is not acquired. Missing coverage is not zero.', ['SEC/IARD firms reporting a principal office in California.']);
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:colorado state rias?|advisers? registered in colorado|licensed (?:investment )?advisers? in colorado)\b/i.test(q)) {
    const query = failClosed(
      'Colorado state-registered investment-adviser firms are published on /colorado from the IAPD state compilation (jurisdiction=CO). Search V1 remains the SEC/IARD roster and does not treat the 589 principal-office overlay as Colorado state registration.',
      ['SEC/IARD firms reporting a principal office in Colorado.', 'RIA principal offices in Colorado.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:virginia state rias?|advisers? registered in virginia|licensed (?:investment )?advisers? in virginia)\b/i.test(q)) {
    const query = failClosed(
      'Virginia state-registered investment-adviser firms are published on /virginia from the IAPD state compilation (jurisdiction=VA). Search V1 remains the SEC/IARD roster and does not treat the 339 principal-office overlay as Virginia state registration. Current verification is IAPD/SCC search, not the 2025 SCC activity totals.',
      ['SEC/IARD firms reporting a principal office in Virginia.', 'RIA principal offices in Virginia.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bvirginia\b/i.test(q) && /\bcomplaint/i.test(q)) {
    const query = failClosed(
      'SCC 2025 complaint/investigation aggregates are statewide process counts. They are not firm-specific complaints, not violations, and not findings. Use /virginia for the aggregate context.',
      ['Virginia investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bvirginia scc action against\b/i.test(q)) {
    const query = failClosed(
      'Virginia SCC Securities & Retail Franchising regulatory activity is a mixed case table. Name-only matching is unsafe. Exact CRD/case identity is required before attaching a row to a firm.',
      ['Virginia SCC Regulatory Activity table on /virginia.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:new york state rias?|advisers? registered in new york|licensed (?:investment )?advisers? in new york|investment advisers? registered in new york)\b/i.test(q)) {
    const query = failClosed(
      'New York state-registered investment-adviser firms are published on /new-york from the IAPD state compilation (jurisdiction=NY). Search V1 remains the SEC/IARD roster and does not treat the 3,152 principal-office overlay as New York state registration. Notice filing is a different grain from state IA.',
      ['SEC/IARD firms reporting a principal office in New York.', 'RIA principal offices in New York.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:new york era|new york state era)\b/i.test(q)) {
    const query = failClosed(
      'New York state ERA reporting firms are published on /new-york. ERA is not an RIA and is not New York state IA registration. Search V1 remains the SEC/IARD roster.',
      ['New York investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:sec adviser doing business in new york|notice-?filed in new york)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in New York is not New York state IA registration and is not a New York principal office. Use /new-york for the separate grains. Verify current status on IAPD.',
      ['New York investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\bnew york\b/i.test(q) || /\bnyc\b/i.test(q) || /\bnew york city\b/i.test(q)) && /\bcomplaint/i.test(q)) {
    const query = failClosed(
      'OAG Investor Protection activity is mixed and is not a firm-specific complaint history. Name-only matching is unsafe. Use IAPD/BrokerCheck and /new-york for statewide context.',
      ['New York investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bis this adviser registered in illinois\b/i.test(q)) {
    const query = failClosed(
      'Current Illinois registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. Use /illinois for statewide grains.',
      ['Find CRD 105958.', 'Illinois investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:illinois state rias?|advisers? registered in illinois|licensed (?:investment )?advisers? in illinois|investment advisers? registered in illinois|how many state registered advisers are in illinois)\b/i.test(q)) {
    const query = failClosed(
      'Illinois state-registered investment-adviser firms are published on /illinois from the IAPD state compilation (jurisdiction=IL). Search V1 remains the SEC/IARD roster and does not treat the 793 principal-office overlay as Illinois state registration. Notice filing is a different grain from state IA.',
      ['SEC/IARD firms reporting a principal office in Illinois.', 'RIA principal offices in Illinois.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:illinois era|illinois state era|exempt reporting advisers? in illinois)\b/i.test(q)) {
    const query = failClosed(
      'Illinois state ERA reporting firms are published on /illinois. ERA is not an RIA and is not Illinois state IA registration. Search V1 remains the SEC/IARD roster.',
      ['Illinois investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:sec adviser doing business in illinois|notice-?filed in illinois|federal advisers? doing business in illinois)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in Illinois is not Illinois state IA registration and is not an Illinois principal office. Use /illinois for the separate grains. Verify current status on IAPD.',
      ['Illinois investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\billinois\b/i.test(q) || /\bchicago\b/i.test(q)) && /\b(?:complaint|disciplin|enforcement|administrative action)\b/i.test(q)) {
    const query = failClosed(
      'Illinois SOS Administrative Actions are mixed and are not a firm-specific enforcement history. Name-only matching is unsafe. Exact CRD or official matter identity is required. Use IAPD/BrokerCheck and /illinois for statewide context. Chicago is not a separate InvestorTrustHub route.',
      ['Illinois investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|highest performing|safe) (?:investment )?adviser in (?:illinois|chicago)\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score. Chicago is not a separate InvestorTrustHub route.',
      ['Illinois investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bis this adviser registered in oregon\b|\bis .+ registered in oregon\b/i.test(q)) {
    const query = failClosed(
      'Current Oregon registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. An Oregon principal office is not Oregon state registration. Use /oregon for statewide grains.',
      ['Find CRD 105958.', 'Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:oregon (?:state )?rias?|oregon registered investment adviser|advisers? registered in oregon|licensed (?:investment )?advisers? in oregon|investment advisers? registered in oregon)\b/i.test(q)) {
    const query = failClosed(
      'Oregon state-registered investment-adviser firms are published on /oregon from the IAPD state compilation (jurisdiction=OR, APPROVED). Search V1 remains the SEC/IARD roster and does not treat the 167 principal-office overlay as Oregon state registration. Notice filing is a different grain from state IA.',
      ['SEC/IARD firms reporting a principal office in Oregon.', 'Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:oregon era|oregon state era|exempt reporting advisers? in oregon)\b/i.test(q)) {
    const query = failClosed(
      'Oregon state ERA reporting firms are published on /oregon. ERA is not an RIA and is not Oregon state IA registration. Search V1 remains the SEC/IARD roster.',
      ['Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:oregon notice filing|notice-?filed in oregon|federal-covered advisers? in oregon|sec adviser doing business in oregon)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in Oregon is not Oregon state IA registration and is not an Oregon principal office. Use /oregon for the separate grains. Verify current status on IAPD.',
      ['Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:financial adviser in oregon|investment adviser in oregon)\b/i.test(q) && !/\bregistered\b|\bnotice\b|\bera\b|\bcrd\b|\b801-/i.test(q)) {
    const query = failClosed(
      'Financial adviser in Oregon is not a single universe. Oregon principal office, Oregon state IA registration, Oregon state ERA reporting, and Oregon notice filing are separate grains. Search V1 geography is principal office, not Oregon licensure. Use /oregon.',
      ['SEC/IARD firms reporting a principal office in Oregon.', 'Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\boregon\b/i.test(q) || /\bportland\b/i.test(q) || /\bmultnomah\b/i.test(q)) && /\b(?:complaints?|disciplin|enforcement|securities order|administrative (?:action|order))\b/i.test(q)) {
    const query = failClosed(
      'Oregon DFR S- prefix orders are mixed securities administrative matters, not a firm-specific complaint or IA disciplinary history. Name-only matching is unsafe. Exact firm CRD or exact DFR case number is required. Complaints were not acquired as a bulk dataset; missing is not zero. Portland is not a separate InvestorTrustHub route. Use /oregon.',
      ['Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\binvestment adviser representative oregon|oregon iar\b/i.test(q)) {
    const query = failClosed(
      'No complete current Oregon IAR person universe was published. IAR is not the firm. Person CRD is not firm CRD. Official verification remains IAPD individual lookup. Search-only is not zero.',
      ['Oregon investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|highest performing|safe) (?:investment )?adviser in (?:oregon|portland)\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score. Portland is not a separate InvestorTrustHub route.',
      ['Oregon investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bis this adviser registered in north carolina\b|\bis .+ registered in north carolina\b/i.test(q)) {
    const query = failClosed(
      'Current North Carolina registration is verified on IAPD with an exact firm CRD. Name-only matching is unsafe. A North Carolina principal office is not North Carolina state registration. The official NC SOS IA register (current as of 2026-06-30) is a complementary grain to IAPD. Use /north-carolina.',
      ['North Carolina investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:how many (?:investment )?advisers? (?:are )?in north carolina|north carolina (?:state )?rias?|state registered investment adviser north carolina|nc investment adviser registration|investment advisers? north carolina|registered investment advisers? north carolina)\b/i.test(q)) {
    const query = failClosed(
      'The official Register of NC IAs (current as of 2026-06-30) has 687 distinct firm CRDs. That is not IAR people, not broker-dealers, not notice filings, and not principal-office firms. IAPD shows 701 APPROVED NC state IA CRDs on the 2026-09-17 compilation — a complementary clock, not a correction. Do not add the classes. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:north carolina era|era north carolina|exempt reporting advisers? in north carolina)\b/i.test(q)) {
    const query = failClosed(
      'North Carolina state ERA reporting firms are published on /north-carolina. ERA is not an RIA and is not NC state IA registration.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:notice filing north carolina|sec registered adviser north carolina|federal-covered advisers? in north carolina)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in North Carolina is not NC state IA registration and is not a North Carolina principal office. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:investment adviser headquartered north carolina|adviser headquartered in north carolina)\b/i.test(q)) {
    const query = failClosed(
      'A North Carolina principal office is not North Carolina state registration and is not a notice filing. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\binvestment adviser representative north carolina|\biar north carolina\b/i.test(q)) {
    const query = failClosed(
      'The Register of NC IARs is a person grain. IAR is not an IA firm. Person CRD is not firm CRD. This ticket does not mass-publish IAR profiles. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bbroker dealer north carolina|securities agent north carolina\b/i.test(q)) {
    const query = failClosed(
      'The Register of NC BDs and Register of NC AGs are separate securities classes. AG means securities agent, not Attorney General. Broker-dealers are not investment advisers. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\bnorth carolina\b/i.test(q) || /\bcharlotte\b/i.test(q) || /\braleigh\b/i.test(q)) && /\b(?:complaints?|disciplin|enforcement|cease and desist|administrative (?:action|order))\b/i.test(q)) {
    const query = failClosed(
      'NC SOS Criminal Enforcement & Administrative Actions is a mixed securities catalog. A summary cease and desist is not a final finding. A charge is not a conviction. Exact CRD is required to attach a matter to a firm. Complaints were not acquired as a bulk dataset; missing is not zero. Charlotte and Raleigh are not separate InvestorTrustHub routes. Use /north-carolina.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|highest performing|safe) (?:investment |financial )?adviser in (?:north carolina|charlotte|raleigh)\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score. Charlotte and Raleigh are not separate InvestorTrustHub routes.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(charlotte|raleigh|mecklenburg|wake county)\b/i.test(q) && /investment adviser|financial adviser|adviser/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not publish Charlotte, Raleigh, Mecklenburg, or Wake intelligence routes. Statewide North Carolina research remains /north-carolina. Ranking is unsupported.',
      ['North Carolina investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bis this adviser registered in ohio\b|\bis .+ registered in ohio\b/i.test(q)) {
    const query = failClosed(
      'Current Ohio registration is verified on IAPD with an exact firm CRD. Name-only matching is unsafe. An Ohio principal office is not Ohio state registration. STAR Filing Search is not an IA census. Use /ohio.',
      ['Ohio investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:how many (?:investment )?advisers? (?:are )?in ohio|ohio (?:state )?rias?|state registered investment adviser ohio|ohio investment adviser license|investment advisers? ohio|registered investment advisers? ohio)\b/i.test(q)) {
    const query = failClosed(
      'IAPD shows 784 APPROVED Ohio state IA firm CRDs on the 2026-09-17 compilation (StateRgstn/Rgltr/@Cd=OH). That is not ERA, not notice filings, not principal-office firms, and not IAR people. Do not add the classes. Use /ohio.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:ohio era|era ohio|exempt reporting advisers? in ohio)\b/i.test(q)) {
    const query = failClosed(
      'Ohio state ERA reporting firms are published on /ohio. ERA is not an RIA and is not Ohio state IA registration.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:notice filing ohio|sec registered adviser ohio|federal covered adviser ohio|federal-covered advisers? in ohio)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in Ohio is not Ohio state IA registration and is not an Ohio principal office. Use /ohio.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:investment adviser headquartered ohio|adviser headquartered in ohio)\b/i.test(q)) {
    const query = failClosed(
      'An Ohio principal office is not Ohio state registration and is not a notice filing. Use /ohio.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\binvestment adviser representative ohio\b|\biar ohio\b|\bohio iar\b/i.test(q) || (/\biar\b/i.test(q) && /\bohio\b/i.test(q))) {
    const query = failClosed(
      'Ohio IAR is a person grain, not an IA firm. Person CRD is not firm CRD. Statewide IAR bulk was not acquired; STAR/records-request is not a census. This ticket does not mass-publish IAR profiles. Use /ohio.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:ohio securities final orders|ohio securities notice of opportunity for hearing|ohio investment adviser discipline|ohio cease and desist securities)\b/i.test(q) || ((/\bohio\b/i.test(q) || /\bcolumbus\b/i.test(q) || /\bcleveland\b/i.test(q)) && /\b(?:complaints?|disciplin|enforcement|final order|notice of opportunity|cease and desist|administrative (?:action|order))\b/i.test(q))) {
    const query = failClosed(
      'Ohio Division Orders distinguish a Notice of Opportunity for Hearing from a Final Order. NOH is not a final finding. The Division warns its online final-order search may not retrieve all responsive documents. Mixed securities orders are not an IA census. Exact CRD is required to attach a matter. Complaints are intake-only; missing is not zero. Columbus and Cleveland are not separate InvestorTrustHub routes. Use /ohio.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|highest performing|safe) (?:investment |financial )?advisers?(?: in)? (?:ohio|columbus|cleveland)\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score. Columbus and Cleveland are not separate InvestorTrustHub routes.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(atlanta|savannah)\b/i.test(q) && /investment adviser|financial adviser|adviser|broker/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not publish Atlanta or Savannah intelligence routes. Statewide Georgia research remains /georgia. Atlanta is geography, not a separate securities regime.',
      ['Georgia investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:investment adviser(?:s)? in georgia|financial adviser(?:s)? in georgia|adviser registered in georgia|georgia investment adviser)\b/i.test(q) && !/\bcrd\b/i.test(q)) {
    const query = failClosed(
      'A Georgia investment-adviser question is not one population. The existing SEC/IARD roster has 364 firms with a Georgia principal office. That is not Georgia state registration and not a notice filing. Georgia state IA firms, IARs, broker-dealers, and agents were not acquired as rosters. Verify a firm on IAPD with an exact CRD. Use /georgia.',
      ['Georgia investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bbroker-?dealer(?:s)? in georgia\b/i.test(q)) {
    const query = failClosed(
      'Georgia broker-dealer firm and agent rosters were not acquired. A broker-dealer is not an investment adviser. BrokerCheck and CRD remain the identity systems. Use /georgia.',
      ['Georgia investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (/\bgeorgia\b/i.test(q) && /\b(?:securities enforcement|disciplinary|cease-and-desist|cease and desist|securities order)\b/i.test(q)) {
    const query = failClosed(
      'The Georgia Securities Orders index lists 57 linked documents. Captions are not findings. Emergency, proposed, investigation, and consent status is taken only from the index caption. Exact profile attachments: 0. A printed CRD is not a profile join in this extract. Implementation and COVID relief orders are not discipline. Use /georgia.',
      ['Georgia investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|safest|highest performing) (?:investment |financial )?advisers?(?: in)? georgia\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score.',
      ['Georgia investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(columbus|cleveland|cincinnati|toledo|akron|dayton)\b/i.test(q) && /investment adviser|financial adviser|adviser/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not publish Columbus, Cleveland, Cincinnati, Toledo, Akron, or Dayton intelligence routes. Statewide Ohio research remains /ohio. Ranking is unsupported.',
      ['Ohio investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // MA-INV-001: Massachusetts lenses come from the accepted IAPD compilation; exact CRD / SEC identifiers
  // are resolved by the research plan before this core runs, so these branches never intercept them.
  if (/\b(boston|worcester)\b/i.test(q) && /investment adviser|financial adviser|adviser|advisor|broker|\bria\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not publish Boston or Worcester intelligence routes. A city is geography, not a separate securities regime, and a principal-office address is not Massachusetts registration. Statewide Massachusetts research remains /massachusetts.',
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  const maAsked = /\bmassachusetts\b/i.test(q) || /\bMA\b/.test(q);
  if (maAsked && /\b(?:enforcement|disciplin\w*|consent orders?|cease[- ]and[- ]desist|complaints?|securities orders?|sanctions?|fined?|penalt\w*)\b/i.test(q)) {
    const e = MA_PUBLIC_SNAPSHOT.enforcement;
    const query = failClosed(
      `The Massachusetts Securities Division enforcement archive lists ${e.announcements} announcements from ${e.archiveYears[0]} to ${e.archiveYears[1]} linking ${e.observationRows} documents: ${e.documentTypes.COMPLAINT} Complaints, ${e.documentTypes.CONSENT_ORDER} Consent Orders and other listed types. A Division complaint states allegations; it is not a finding. Orders keep their listed type. Document count is not matter count (${e.distinctCaseNumbers} printed dockets). Nothing is attached to a firm by name; exact CRD attachments: ${e.MA_ENFORCEMENT_EXACT_CRD_ATTACHMENTS}. Actions before 2012 are available by contacting the Division. Investor complaints are taken by the Division's Enforcement Section; no provider-level complaint dataset exists, and a complaint is not an enforcement order. Use /massachusetts.`,
      ['Massachusetts investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:investment adviser representatives?|iars?|adviser representatives?)\b/i.test(q)) {
    const query = failClosed(
      'A Massachusetts investment adviser representative is a person registered through IARD/CRD, not a firm. Person CRD is not firm CRD. A Massachusetts representative directory is not published, and representatives are never added to firm counts. Verify a person on IAPD. Use /massachusetts.',
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:broker[- ]?dealers?|brokers?|securities agents?|agents?|brokercheck|finra)\b/i.test(q)) {
    const query = failClosed(
      'Massachusetts broker-dealers and agents are verified through CRD and BrokerCheck; the Securities Division is the regulator and can provide registration status and disciplinary records on request. A Massachusetts-only broker-dealer or agent bulk roster was not acquired. A broker-dealer is not an investment adviser, and an agent is a person, not a firm. Use /massachusetts.',
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:era|exempt reporting advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${MA_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd} exempt reporting advisers reporting to Massachusetts (ERA/Rgltr/@Cd=MA, 2026-09-17 compilation). An ERA is not a Massachusetts state-registered adviser and not an SEC RIA. Use /massachusetts.`,
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:notice[- ]fil\w*|federal[- ]covered|sec[- ]registered)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${MA_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')} SEC-registered advisers with a Massachusetts notice filing (NoticeFiled/States/@RgltrCd=MA, FILED, 2026-09-17). A notice filing is not Massachusetts state IA registration and not a Massachusetts office. Use /massachusetts.`,
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:headquarter\w*|principal office|main office|based in|located in)\b/i.test(q)) {
    const query = failClosed(
      `The SEC/IARD roster has ${MA_PUBLIC_SNAPSHOT.nationalOverlay.maPrincipalOfficeSecIardFirms} firms with a Massachusetts principal office (2026-08-27 roster geography). A principal office is not Massachusetts state registration and not a notice filing. Research them at /firms?state=MA; statewide lenses are on /massachusetts.`,
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\bis .+ registered in (?:massachusetts|MA)\b/i.test(q)) {
    const query = failClosed(
      'Current Massachusetts registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. A Massachusetts principal office is not Massachusetts state registration. Use /massachusetts.',
      ['Massachusetts investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:offerings?|securities registrations?)\b/i.test(q)) {
    const query = failClosed(
      'Massachusetts securities offering registrations were not acquired; they are not provider identity. Use /massachusetts for adviser lenses and the enforcement archive.',
      ['Massachusetts investor research page.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (maAsked && /\b(?:investment advis[eo]rs?|rias?|registered advis[eo]rs?|state[- ]registered|advis[eo]rs?|investment advisory firms?)\b/i.test(q)) {
    const ia = MA_PUBLIC_SNAPSHOT.stateRia;
    const query = failClosed(
      `IAPD shows ${ia.approvedDistinctCrd} APPROVED Massachusetts state-registered investment-adviser firm CRDs on the 2026-09-17 compilation (StateRgstn/Rgltr/@Cd=MA); ${ia.condrestDistinctCrd} more are CONDREST and ${ia.termrequestDistinctCrd} have termination requested. That is not ERA (${MA_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd}), not SEC-registered notice filers (${MA_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}), not principal-office firms (${MA_PUBLIC_SNAPSHOT.nationalOverlay.maPrincipalOfficeSecIardFirms}), and not IAR people. Do not add the classes. Use /massachusetts.`,
      ['Massachusetts investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // TN-INV-001: Tennessee lenses come from the accepted IAPD compilation and the Securities Division order
  // archives. Exact CRD / SEC identifiers are resolved by the research plan before this core runs.
  if (/\b(nashville|memphis|knoxville|chattanooga)\b/i.test(q) && /investment adviser|financial adviser|adviser|advisor|broker|\bria\b/i.test(q)) {
    const po = TN_PUBLIC_SNAPSHOT.nationalOverlay.tnPrincipalOfficeSecIardFirms;
    const query = failClosed(
      `InvestorTrustHub does not publish Nashville, Memphis, Knoxville, or Chattanooga intelligence routes. A city is geography, not a separate securities regime, and a principal-office address is not Tennessee registration. Statewide, the SEC/IARD roster has ${po} firms with a Tennessee principal office; research them at /firms?state=TN. Statewide Tennessee research remains /tennessee.`,
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  const tnAsked = /\btennessee\b/i.test(q) || /\bTN\b/.test(q);
  if (tnAsked && /\b(?:enforcement|disciplin\w*|consent orders?|cease[- ]and[- ]desist|c&d|orders?|complaints?|sanctions?|fined?|penalt\w*)\b/i.test(q)) {
    const e = TN_PUBLIC_SNAPSHOT.enforcement;
    const n = (v: number) => v.toLocaleString('en-US');
    const complaintOnly = /\bcomplaints?\b/i.test(q) && !/\b(?:enforcement|disciplin\w*|orders?|cease|consent)\b/i.test(q);
    const query = failClosed(
      complaintOnly
        ? 'The Tennessee Securities Division takes investor complaints through its Securities / Investments complaint form. No provider-level complaint dataset is published, so there is no complaint count, and complaint outcomes are not public in bulk. A complaint is not an enforcement order, and complaint counts are not derived from the order archives. Division orders are on /tennessee.'
        : `The Tennessee Securities Division publishes separate order archives: ${n(e.consentOrders.listings)} Consent Order listings and ${n(e.ceaseAndDesistOrders.listings)} Cease and Desist Order listings (${e.consentOrders.listingsSince2012} and ${e.ceaseAndDesistOrders.listingsSince2012} since 2012), plus ${e.finalAdministrativeOrders.listings} Final Administrative Orders and ${e.initialOrders.listings} Initial Order. Each keeps its own order type; they are not one violation count, and a listing is not a unique matter. A cease and desist order is not a finding beyond what the order states. ${e.TN_ENFORCEMENT_EXACT_CRD_LINKS} recent orders print a firm CRD that exactly matches an IAPD firm; nothing is attached to a firm by name. Investor complaints are separate from orders. Use /tennessee.`,
      ['Tennessee investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', complaintOnly ? 'NOT_ACQUIRED' : 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:investment adviser representatives?|iars?|adviser representatives?)\b/i.test(q)) {
    const query = failClosed(
      'A Tennessee investment adviser representative is a person registered on Form U4 through Web CRD/IARD, not a firm. Person CRD is not firm CRD. A Tennessee representative directory is not published, and representatives are never added to firm counts. Verify a person on IAPD. Use /tennessee.',
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:broker[- ]?dealers?|brokers?|securities agents?|agents?|brokercheck|finra)\b/i.test(q)) {
    const query = failClosed(
      'Tennessee broker-dealers and agents are verified through CRD and BrokerCheck; the Securities Division is the regulator. A Tennessee-only broker-dealer or agent bulk roster was not acquired. A broker-dealer is not an investment adviser, and an agent is a person, not a firm. Use /tennessee.',
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:era|exempt reporting advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${TN_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd} exempt reporting advisers reporting to Tennessee (ERA/Rgltr/@Cd=TN, 2026-09-17 compilation). An ERA is not a Tennessee state-registered adviser and not an SEC RIA. Use /tennessee.`,
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:notice[- ]fil\w*|federal[- ]covered|sec[- ]registered|sec advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${TN_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')} SEC-registered advisers with a Tennessee notice filing (NoticeFiled/States/@RgltrCd=TN, FILED, 2026-09-17). A notice filing is not Tennessee state IA registration and not a Tennessee office. Use /tennessee.`,
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:headquarter\w*|principal office|main office|based in|located in)\b/i.test(q)) {
    const query = failClosed(
      `The SEC/IARD roster has ${TN_PUBLIC_SNAPSHOT.nationalOverlay.tnPrincipalOfficeSecIardFirms} firms with a Tennessee principal office (2026-08-27 roster geography). A principal office is not Tennessee state registration and not a notice filing. Research them at /firms?state=TN; statewide lenses are on /tennessee.`,
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\bis .+ registered in (?:tennessee|TN)\b/i.test(q)) {
    const query = failClosed(
      'Current Tennessee registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. A Tennessee principal office is not Tennessee state registration. Use /tennessee.',
      ['Tennessee investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:offerings?|securities registrations?)\b/i.test(q)) {
    const query = failClosed(
      'Tennessee securities offering registrations and exemptions were not acquired; they are not provider identity. Use /tennessee for adviser lenses and the Division order archives.',
      ['Tennessee investor research page.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (tnAsked && /\b(?:investment advis[eo]rs?|rias?|registered advis[eo]rs?|state[- ]registered|advis[eo]rs?|investment advisory firms?)\b/i.test(q)) {
    const ia = TN_PUBLIC_SNAPSHOT.stateRia;
    const query = failClosed(
      `IAPD shows ${ia.approvedDistinctCrd} APPROVED Tennessee state-registered investment-adviser firm CRDs on the 2026-09-17 compilation (StateRgstn/Rgltr/@Cd=TN); ${ia.termrequestDistinctCrd} more has termination requested. That is not ERA (${TN_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd}), not SEC-registered notice filers (${TN_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}), not principal-office firms (${TN_PUBLIC_SNAPSHOT.nationalOverlay.tnPrincipalOfficeSecIardFirms}), and not IAR people. Do not add the classes. Use /tennessee.`,
      ['Tennessee investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // NV-INV-001: Nevada lenses come from the IAPD compilations (STATE 2026-09-17, SEC 2026-09-18). The Securities
  // Division site rejects automated access, so no order is acquired or attached. Exact CRD / SEC identifiers are
  // resolved by the research plan before this core runs.
  const nvCity = /\b(las vegas|north las vegas|reno|henderson|sparks|carson city)\b/i.exec(q);
  const otherStateNamed = /\b(kentucky|north carolina|texas|tennessee|louisiana|minnesota|KY|NC|TX|TN|LA|MN)\b/.test(q) || /\b(kentucky|north carolina|texas|tennessee|louisiana|minnesota)\b/i.test(q);
  if (nvCity && !otherStateNamed && /investment adviser|financial adviser|adviser|advisor|broker|\bria\b/i.test(q)) {
    const po = NV_PUBLIC_SNAPSHOT.nationalOverlay.nvPrincipalOfficeSecIardFirms;
    const query = failClosed(
      `InvestorTrustHub does not publish Las Vegas, Reno, Henderson, or other Nevada city intelligence routes. A city is geography, not a separate securities regime, and a principal-office address is not Nevada licensing. Statewide, the SEC/IARD roster has ${po} firms with a Nevada principal office; research them at /firms?state=NV. Statewide Nevada research remains /nevada.`,
      ['Nevada investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  const nvAsked = /\bnevada\b/i.test(q) || /\bNV\b/.test(q);
  if (nvAsked && /\b(?:enforcement|disciplin\w*|consent orders?|cease[- ]and[- ]desist|c&d|orders?|complaints?|sanctions?|fined?|penalt\w*)\b/i.test(q)) {
    const complaintOnly = /\bcomplaints?\b/i.test(q) && !/\b(?:enforcement|disciplin\w*|orders?|cease|consent)\b/i.test(q);
    const query = failClosed(
      complaintOnly
        ? 'The Nevada Secretary of State Securities Division investigates written investor complaints. No provider-level complaint dataset is published, so there is no complaint count, and complaint outcomes are not public in bulk. A complaint is not an enforcement order. Use /nevada.'
        : 'The Nevada Secretary of State Securities Division is the regulator; NRS 90.620 and 90.630 give it investigation and order powers (consent orders, summary orders to cease and desist, administrative orders). Its website rejected automated access and a normal browser session, so no Nevada order listing was acquired: there is no Nevada order count and nothing is attached to any firm or person. Other Nevada regulators are not substituted. Regulatory disclosures, including state actions, appear on each record on IAPD and BrokerCheck; verify with an exact CRD. Use /nevada.',
      ['Nevada investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:investment adviser representatives?|iars?|adviser representatives?)\b/i.test(q)) {
    const query = failClosed(
      'A Nevada investment adviser representative is a person licensed under NRS 90.330 through Web CRD/IARD (Form U4), not a firm. Person CRD is not firm CRD. A Nevada representative directory is not published, and representatives are never added to firm counts. Verify a person on IAPD. Use /nevada.',
      ['Nevada investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:broker[- ]?dealers?|brokers?|securities representatives?|sales representatives?|securities agents?|agents?|brokercheck|finra)\b/i.test(q)) {
    const query = failClosed(
      'Nevada broker-dealers and sales representatives are licensed under NRS 90.310 and verified through CRD and BrokerCheck; the Securities Division is the regulator and FINRA operates the system. A Nevada-only broker-dealer or sales-representative bulk roster was not acquired. A broker-dealer is not an investment adviser, and a sales representative is a person, not a firm. Use /nevada.',
      ['Nevada investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:era|exempt reporting advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${NV_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd} exempt reporting advisers reporting to Nevada (ERA/Rgltr/@Cd=NV, 2026-09-17 compilation). An ERA is not a Nevada-licensed adviser and not an SEC RIA. Use /nevada.`,
      ['Nevada investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:notice[- ]fil\w*|federal[- ]covered|sec[- ]registered|sec advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${NV_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')} SEC-registered advisers with a Nevada notice filing (NoticeFiled/States/@RgltrCd=NV, FILED, 2026-09-18 compilation). A notice filing is not Nevada state IA licensing and not a Nevada office. Use /nevada.`,
      ['Nevada investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:headquarter\w*|principal office|main office|based in|located in)\b/i.test(q)) {
    const query = failClosed(
      `The SEC/IARD roster has ${NV_PUBLIC_SNAPSHOT.nationalOverlay.nvPrincipalOfficeSecIardFirms} firms with a Nevada principal office (2026-08-27 roster geography). A principal office is not Nevada state licensing and not a notice filing. Research them at /firms?state=NV; statewide lenses are on /nevada.`,
      ['Nevada investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\bis .+ (?:registered|licensed) in (?:nevada|NV)\b/i.test(q)) {
    const query = failClosed(
      'Current Nevada licensing is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. A Nevada principal office is not Nevada state licensing. Use /nevada.',
      ['Nevada investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:offerings?|securities registrations?|crowdfunding|transfer agents?|athlete agents?)\b/i.test(q)) {
    const query = failClosed(
      'Nevada securities offering registrations and exemptions, transfer agents and athlete agents are separate Securities Division classes. They were not acquired and are never counted with advisers or broker-dealers. Use /nevada for adviser lenses.',
      ['Nevada investor research page.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (nvAsked && /\b(?:investment advis[eo]rs?|rias?|registered advis[eo]rs?|state[- ]registered|advis[eo]rs?|investment advisory firms?)\b/i.test(q)) {
    const ia = NV_PUBLIC_SNAPSHOT.stateRia;
    const query = failClosed(
      `IAPD shows ${ia.approvedDistinctCrd} APPROVED Nevada state investment-adviser firm CRDs on the 2026-09-17 compilation (StateRgstn/Rgltr/@Cd=NV; Nevada law calls this licensing); ${ia.termrequestDistinctCrd} more have termination requested. That is not ERA (${NV_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd}), not SEC-registered notice filers (${NV_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}), not principal-office firms (${NV_PUBLIC_SNAPSHOT.nationalOverlay.nvPrincipalOfficeSecIardFirms}), and not IAR people. Do not add the classes. Use /nevada.`,
      ['Nevada investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  // MN-INV-001: Minnesota lenses come from the IAPD compilations (STATE 2026-09-17, SEC 2026-09-18); enforcement is
  // the Commerce CARDS Securities industry-type index. Exact CRD / SEC identifiers are resolved by the research plan
  // before this core runs. Rochester is Minnesota only when Minnesota is named (Rochester, New York).
  // Duluth with no other named state is Minnesota context. The geography object is the pin the
  // research plan must keep; the national gazetteer otherwise reads Duluth as Georgia.
  const mnNamed = /\bminnesota\b/i.test(q) || /\bMN\b/.test(q);
  const mnOtherState = /\b(new york|georgia|kentucky|texas|tennessee|nevada|NY|GA|KY|TX|TN|NV)\b/.test(q) || /\b(new york|georgia|kentucky|texas|tennessee|nevada)\b/i.test(q);
  const mnCity = /\b(minneapolis|st\.? paul|saint paul|duluth)\b/i.exec(q) ?? (mnNamed ? /\b(rochester)\b/i.exec(q) : null);
  if (mnCity && !mnOtherState && /investment adviser|financial adviser|adviser|advisor|broker|\bria\b/i.test(q)) {
    const po = MN_PUBLIC_SNAPSHOT.nationalOverlay.mnPrincipalOfficeSecIardFirms;
    const cityToken = (mnCity[1] ?? '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    const cityLabel =
      cityToken === 'minneapolis' ? 'Minneapolis' : cityToken === 'duluth' ? 'Duluth' : cityToken === 'rochester' ? 'Rochester' : 'St. Paul';
    const query = failClosed(
      `InvestorTrustHub does not publish Minneapolis, St. Paul, Rochester, Duluth, or other Minnesota city intelligence routes. A city is geography, not a separate securities regime, and a principal-office address is not Minnesota registration. Statewide, the SEC/IARD roster has ${po} firms with a Minnesota principal office; research them at /firms?state=MN. Statewide Minnesota research remains /minnesota.`,
      ['Minnesota investor research page.'],
    );
    query.geography = {
      type: 'principal_office_city',
      value: cityLabel,
      state: 'MN',
      meaning: 'Recorded principal office, not client geography, registration jurisdiction or service territory',
    };
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:enforcement|disciplin\w*|consent orders?|cease[- ]and[- ]desist|c&d|orders?|complaints?|sanctions?|fined?|penalt\w*|actions?)\b/i.test(q)) {
    const e = MN_PUBLIC_SNAPSHOT.enforcement;
    const complaintOnly = /\bcomplaints?\b/i.test(q) && !/\b(?:enforcement|disciplin\w*|orders?|cease|consent|actions?)\b/i.test(q);
    const query = failClosed(
      complaintOnly
        ? 'The Minnesota Department of Commerce takes investor complaints; its complaint form lists Securities as a complaint type. No provider-level complaint dataset is published, so there is no complaint count, and complaint outcomes are not public in bulk. A complaint is not an order. Commerce securities actions are on /minnesota.'
        : `The Minnesota Department of Commerce Securities Unit is the regulator (Minn. Stat. 80A.79 and 80A.81). Commerce's CARDS index lists ${e.rows} actions under the Securities industry type signed ${e.firstSignedDate} to ${e.lastSignedDate}; ${e.securitiesScopeRows} are securities matters (investment adviser, broker-dealer, agent, unregistered securities) and ${e.otherSecuritiesUnitProgramRows} belong to other programs such as subdivided land. Action types are kept as Commerce lists them, and a consent order is not by itself an adjudicated finding. A row is not a unique matter. ${e.MN_ENFORCEMENT_EXACT_CRD_LINKS} rows print a firm CRD that exactly matches an IAPD firm; nothing is attached to a firm or person by name. Complaints are separate from orders. Use /minnesota.`,
      ['Minnesota investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', complaintOnly ? 'NOT_ACQUIRED' : 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:investment adviser representatives?|iars?|adviser representatives?)\b/i.test(q)) {
    const query = failClosed(
      'A Minnesota investment adviser representative is a person who registers with the Department of Commerce by filing Form U4 on CRD (Minn. Stat. 80A.58 and 80A.61), not a firm. Person CRD is not firm CRD. A Minnesota representative directory is not published, and representatives are never added to firm counts. Verify a person on IAPD. Use /minnesota.',
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:broker[- ]?dealers?|brokers?|securities agents?|agents?|sales representatives?|brokercheck|finra)\b/i.test(q)) {
    const query = failClosed(
      'Minnesota broker-dealers and agents must be registered or exempt (Minn. Stat. 80A.56 and 80A.57) and file through CRD; they are verified on BrokerCheck. The Department of Commerce is the regulator and FINRA operates the system. A Minnesota-only broker-dealer or agent bulk roster was not acquired. A broker-dealer is not an investment adviser, and an agent is a person, not a firm. Use /minnesota.',
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:era|exempt reporting advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${MN_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd} exempt reporting advisers reporting to Minnesota (ERA/Rgltr/@Cd=MN, 2026-09-17 compilation). An ERA is not a Minnesota-registered adviser and not an SEC RIA. Use /minnesota.`,
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:notice[- ]fil\w*|federal[- ]covered|sec[- ]registered|sec advis[eo]rs?)\b/i.test(q)) {
    const query = failClosed(
      `IAPD lists ${MN_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')} SEC-registered advisers with a Minnesota notice filing (Minn. Stat. 80A.60; NoticeFiled/States/@RgltrCd=MN, FILED, 2026-09-18 compilation). A notice filing is not Minnesota state IA registration and not a Minnesota office. Use /minnesota.`,
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:headquarter\w*|principal office|main office|based in|located in)\b/i.test(q)) {
    const query = failClosed(
      `The SEC/IARD roster has ${MN_PUBLIC_SNAPSHOT.nationalOverlay.mnPrincipalOfficeSecIardFirms} firms with a Minnesota principal office (2026-08-27 roster geography). A principal office is not Minnesota state registration and not a notice filing. Research them at /firms?state=MN; statewide lenses are on /minnesota.`,
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\bis .+ registered in (?:minnesota|MN)\b/i.test(q)) {
    const query = failClosed(
      'Current Minnesota registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. A Minnesota principal office is not Minnesota state registration. Use /minnesota.',
      ['Minnesota investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:offerings?|securities registrations?|crowdfunding|mnvest|franchises?|subdivided land|timeshares?)\b/i.test(q)) {
    const query = failClosed(
      'Minnesota securities offerings, MNvest crowdfunding, franchises, and subdivided land and timeshares are separate Securities Unit programs. They were not acquired as rosters and are never counted with advisers or broker-dealers. Use /minnesota for adviser lenses.',
      ['Minnesota investor research page.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (mnNamed && /\b(?:investment advis[eo]rs?|rias?|registered advis[eo]rs?|state[- ]registered|advis[eo]rs?|investment advisory firms?)\b/i.test(q)) {
    const ia = MN_PUBLIC_SNAPSHOT.stateRia;
    const query = failClosed(
      `IAPD shows ${ia.approvedDistinctCrd} APPROVED Minnesota state investment-adviser firm CRDs on the 2026-09-17 compilation (StateRgstn/Rgltr/@Cd=MN; Minn. Stat. 80A.58); ${ia.termrequestDistinctCrd} more have termination requested. That is not ERA (${MN_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd}), not SEC-registered notice filers (${MN_PUBLIC_SNAPSHOT.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}), not principal-office firms (${MN_PUBLIC_SNAPSHOT.nationalOverlay.mnPrincipalOfficeSecIardFirms}), and not IAR people. Do not add the classes. Use /minnesota.`,
      ['Minnesota investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bis this adviser registered in pennsylvania\b|\bis .+ registered in pennsylvania\b/i.test(q)) {
    const query = failClosed(
      'Current Pennsylvania registration is verified on IAPD with an exact firm CRD or SEC file number. Name-only matching is unsafe. A Pennsylvania principal office is not Pennsylvania state registration. Use /pennsylvania for statewide grains.',
      ['Pennsylvania investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:pennsylvania (?:state )?rias?|state registered investment adviser pennsylvania|pennsylvania investment adviser license|advisers? registered in pennsylvania|licensed (?:investment )?advisers? in pennsylvania|investment advisers? registered in pennsylvania|registered investment advisers? pennsylvania)\b/i.test(q)) {
    const query = failClosed(
      'Pennsylvania state-registered investment-adviser firms are published on /pennsylvania from the IAPD state compilation (jurisdiction=PA, APPROVED). Search V1 remains the SEC/IARD roster and does not treat the 623 principal-office overlay as Pennsylvania state registration. Notice filing is a different grain from state IA.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:pennsylvania era|era pennsylvania|exempt reporting advisers? in pennsylvania)\b/i.test(q)) {
    const query = failClosed(
      'Pennsylvania state ERA reporting firms are published on /pennsylvania. ERA is not an RIA and is not Pennsylvania state IA registration. Search V1 remains the SEC/IARD roster.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:pennsylvania notice filing|notice filing pennsylvania|notice-?filed in pennsylvania|sec registered adviser pennsylvania|federal-covered advisers? in pennsylvania)\b/i.test(q)) {
    const query = failClosed(
      'A federal-covered notice filing in Pennsylvania is not Pennsylvania state IA registration and is not a Pennsylvania principal office. Use /pennsylvania for the separate grains. Verify current status on IAPD.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:investment adviser headquartered pennsylvania|adviser headquartered in pennsylvania)\b/i.test(q)) {
    const query = failClosed(
      'A Pennsylvania principal office is not Pennsylvania state registration and is not a notice filing. Search V1 geography is principal office. Use /pennsylvania for the separate grains.',
      ['Pennsylvania investor research page.', 'Research Pennsylvania-headquartered SEC/IARD firms.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:financial adviser in pennsylvania|investment adviser in pennsylvania|investment advisers pennsylvania)\b/i.test(q) && !/\bregistered\b|\bnotice\b|\bera\b|\bcrd\b|\b801-/i.test(q)) {
    const query = failClosed(
      'Financial adviser in Pennsylvania is not a single universe. Pennsylvania principal office, Pennsylvania state IA registration, Pennsylvania state ERA reporting, and Pennsylvania notice filing are separate grains. Search V1 geography is principal office, not Pennsylvania licensure. Use /pennsylvania. DoBS mixed securities-class totals exceeding 200,000 are not an adviser count.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if ((/\bpennsylvania\b/i.test(q) || /\bphiladelphia\b/i.test(q) || /\bpittsburgh\b/i.test(q)) && /\b(?:complaints?|disciplin|enforcement|dobs (?:order|enforcement)|administrative (?:action|order))\b/i.test(q)) {
    const query = failClosed(
      'Pennsylvania DoBS enforcement orders are a mixed catalog of banking, mortgage, and securities PDFs, not a firm-specific complaint or IA disciplinary history. Name-only matching is unsafe. Exact firm CRD or exact DoBS docket is required. Complaints were not acquired as a bulk dataset; missing is not zero. Philadelphia and Pittsburgh are not separate InvestorTrustHub routes. Use /pennsylvania.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (/\binvestment adviser examination pennsylvania|pennsylvania adviser exam/i.test(q)) {
    const query = failClosed(
      'DoBS examination program guidance is not a list of exam findings. Pennsylvania IA exam results were not publicly acquired. Examination guidance is not a violation or disciplinary matter.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'NOT_ACQUIRED');
    return { raw: q, query, interpretation: lines };
  }
  if (/\binvestment adviser representative pennsylvania|pennsylvania iar\b/i.test(q)) {
    const query = failClosed(
      'No complete current Pennsylvania IAR person universe was published. IAR is not the firm. Person CRD is not firm CRD. Official verification remains IAPD individual lookup. Search-only is not zero.',
      ['Pennsylvania investor research page.', 'Find CRD 105958.'],
    );
    push('Coverage', 'OPEN_SEARCH_ONLY');
    return { raw: q, query, interpretation: lines };
  }
  if (/\b(?:best|highest performing|safe) (?:investment )?adviser in (?:pennsylvania|philadelphia|pittsburgh)\b/i.test(q)) {
    const query = failClosed(
      'InvestorTrustHub does not rank advisers, score performance, or publish a Trust Score. Philadelphia and Pittsburgh are not separate InvestorTrustHub routes.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }
  if (
    /\b(philadelphia|pittsburgh|allegheny|montgomery county)\b/i.test(q) &&
    /investment adviser|financial adviser|adviser/i.test(q)
  ) {
    const query = failClosed(
      'InvestorTrustHub does not publish Philadelphia, Pittsburgh, Allegheny, or Montgomery intelligence routes. Statewide Pennsylvania research remains /pennsylvania. Ranking is unsupported.',
      ['Pennsylvania investor research page.'],
    );
    push('Coverage', 'STATE_PAGE_NOT_SEARCH_V1');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bhow many form adv observations\b|\bhow many (normalized )?adv observations\b/i.test(q)) {
    const query: InvestorResearchQuery = {
      mode: 'count',
      aggregateMetric: 'observation_count',
      page: 1,
    };
    push('Mode', 'count');
    push('Grain', 'form_adv_reported_attributes rows (observations, not firms)');
    return { raw: q, query, interpretation: lines };
  }

  const firmType = overrides.firmType ?? detectFirmType(q);
  const compensation = detectCompensation(q);
  const raum = detectRaum(q);
  const states = overrides.state ? [overrides.state.toUpperCase()] : detectStates(q);
  const sort = overrides.sort ?? detectSort(q) ?? (raum || /\bmost raum\b/i.test(q) ? 'raum_desc' : 'name');
  const cityMatch = q.match(/\bin ([A-Za-z .]+?)(?:,|\b florida\b|\b texas\b|$)/i);
  const zipMatch = q.match(/\b(\d{5})(?:-\d{4})?\b/);
  const servesLanguage = /\bserv(e|es|ing)\b|\bclients in\b|\bnotice-?filed\b|\blicensed in\b/i.test(q);
  const hqLanguage = /\bheadquarter(?:ed)?\b|\bprincipal office\b|\bmain office\b/i.test(q);

  if (raum && firmType === 'era') {
    const query = failClosed(
      'ERA filers do not file Form ADV Item 5F(2)(c) regulatory assets under management. RAUM queries are RIA-only.',
      ['How many ERAs are currently indexed?', 'Show RIAs reporting between $1 billion and $10 billion RAUM.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bhow are rias distributed by raum\b|\braum (bands?|distribution)\b/i.test(q) && states.length < 2) {
    const query: InvestorResearchQuery = {
      mode: 'aggregate',
      firmType: 'ria',
      aggregateMetric: 'raum_bands',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Firm type', 'RIA');
    push('Metric', 'RAUM bands (Item 5F(2)(c))');
    push('Grain', 'RIA firm facts');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhich compensation methods are most commonly reported\b|\bcompensation methods?\b.*\bdistribution\b/i.test(q)) {
    const query: InvestorResearchQuery = {
      mode: 'aggregate',
      firmType: 'ria',
      aggregateMetric: 'compensation_methods',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Firm type', 'RIA');
    push('Metric', 'Item 5.E independent YES counts');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bwhich states have the most (ria )?principal offices\b|\bmost ria principal offices\b/i.test(q)) {
    const query: InvestorResearchQuery = {
      mode: 'aggregate',
      firmType: firmType === 'era' ? 'era' : 'ria',
      aggregateMetric: 'principal_office_state',
      page: 1,
    };
    push('Mode', 'aggregate');
    push('Firm type', query.firmType === 'era' ? 'ERA' : 'RIA');
    push('Metric', 'Principal-office state counts');
    push('Geography meaning', INVESTOR_ASK_CAPABILITY.geographyMeaning);
    return { raw: q, query, interpretation: lines };
  }

  if (states.length >= 2 && /\bcompar(e|ison)\b/i.test(q)) {
    const [a, b] = states;
    const query: InvestorResearchQuery = {
      mode: 'comparison',
      firmType: firmType ?? 'ria',
      geography: {
        type: 'principal_office_state',
        value: a!,
        meaning: 'Principal-office state on the SEC/IARD roster — not client geography.',
      },
      compareGeography: {
        type: 'principal_office_state',
        value: b!,
        meaning: 'Principal-office state on the SEC/IARD roster — not client geography.',
      },
      aggregateMetric: raum || /\braum\b/i.test(q) ? 'raum_bands' : 'firm_type',
      page: 1,
    };
    push('Mode', 'comparison');
    push('Firm type', query.firmType === 'ria' ? 'RIA' : query.firmType === 'era' ? 'ERA' : 'RIA + ERA (kept separate)');
    push('Geography', `Principal office ${a} vs ${b}`);
    push('Metric', query.aggregateMetric === 'raum_bands' ? 'RAUM band counts' : 'Firm counts');
    return { raw: q, query, interpretation: lines };
  }

  if (/\bhow many\b|\bcount of\b|\bnumber of\b/i.test(q)) {
    const query: InvestorResearchQuery = {
      mode: 'count',
      firmType: compensation.length || raum ? 'ria' : firmType ?? undefined,
      raum,
      compensationMethods: compensation.length ? compensation : undefined,
      compensationMatch: /\bboth\b/.test(q) && compensation.length > 1 ? 'all' : 'any',
      page: 1,
    };
    if (!query.firmType && /\binvestment advisers?\b|\bfirms?\b/i.test(q)) {
      query.firmType = 'all';
    }
    if (states[0]) {
      query.geography = principalOfficeGeo(states[0], servesLanguage);
    }
    if (query.firmType === 'all') {
      push('Firm types', 'RIA + ERA (counts stay separate; not one adviser total)');
    } else if (query.firmType === 'ria') {
      push('Firm type', 'RIA');
    } else if (query.firmType === 'era') {
      push('Firm type', 'ERA');
    } else {
      const closed = failClosed(
        'Counts require a firm class. RIA and ERA are not added into one “advisers” total unless both classes are shown separately.',
        ['How many RIAs are currently indexed?', 'How many ERAs are currently indexed?'],
      );
      push('Mode', 'fail_closed');
      return { raw: q, query: closed, interpretation: lines };
    }
    push('Mode', 'count');
    push('Grain', 'form_adv_firm_facts (one current roster row per CRD)');
    if (query.geography) push('Principal-office state', query.geography.value);
    return { raw: q, query, interpretation: lines, geographyNote: query.geography?.ambiguous ? query.geography.meaning : undefined };
  }

  let affiliation: keyof typeof AFFILIATION_FIELDS | undefined;
  if (/\baffiliated(?: with)? broker-dealers?\b|\bbroker-dealer affiliat/i.test(q)) affiliation = 'affiliation_broker_dealer';
  if (/\bbanking affiliat/i.test(q)) affiliation = 'affiliation_banking';

  if (/\bwho owns\b|\bownership organization\b/i.test(q) && !crdMatch) {
    const query = failClosed(
      'Ownership is firm-specific and confidence-gated. Ask with a labeled CRD. InvestorTrustHub does not publish a national owner ranking.',
      ['Find CRD 123456.', 'Show firms with reported affiliated broker-dealers.'],
    );
    push('Mode', 'fail_closed');
    return { raw: q, query, interpretation: lines };
  }

  const nameQuoted = q.match(/[“"]([^”"]{2,80})[”"]/);
  const named = q.match(/\b(?:named|called|firm name)\s+([A-Za-z0-9&.,' -]{2,80})/i);
  // TH-DISCOVERY-RESET-001 (production certification fix): the exclusion list below only matched
  // singular "adviser," not "advisers"/"advisor"/"advisors" -- \badviser\b never matches inside
  // "advisers" (no word boundary right after "adviser"). "financial advisers in Miami" therefore
  // matched none of these exclusion words and the entire descriptive query became a literal
  // simpleFirmName search, which combined with investor-research-plan.ts's own bare-city geography
  // fix (Miami -> FL) to silently AND a real geography filter with a nonexistent literal firm
  // name, always returning zero rows even after that geography fix correctly applied.
  const simpleFirmName = !firmType && !states.length && !raum && !compensation.length && !affiliation && /^[A-Za-z][A-Za-z0-9&.,' -]{1,79}$/.test(q) && !/\b(what|how|who|does|is|show|find|advis(?:er|or)s?|firm|fees?|ownership|disclosure)\b/i.test(q) ? q : undefined;
  const nameQuery = nameQuoted?.[1]?.trim() || named?.[1]?.trim() || simpleFirmName;

  const effectiveType: InvestorFirmType | undefined =
    raum || compensation.length ? 'ria' : firmType ?? (states.length ? 'all' : undefined);

  let geography: InvestorResearchQuery['geography'] | undefined;
  if (states[0]) {
    geography = principalOfficeGeo(states[0], servesLanguage && !hqLanguage);
  } else if (zipMatch && /\bzip\b|\bpostal\b/i.test(q)) {
    geography = {
      type: 'zip',
      value: zipMatch[1]!,
      meaning: 'Principal-office ZIP on the SEC/IARD roster — not service territory.',
    };
  } else if (cityMatch && /\bcity\b|\bin [A-Z]/.test(q) && !states.length) {
    // TH-DISCOVERY-PARITY-001B-REVIEW findings 1 & 3: the `/i` flag on the guard above used to make
    // `[A-Z]` match ANY case, so "in retirement planning" or "in the US" were read as "in
    // <Capitalized city>" and silently produced a bogus principal_office_city geography ("retirement
    // planning", "the US") instead of correctly finding no city here. The guard now genuinely
    // requires a capitalized token after "in" (or the literal word "city"), and the captured phrase
    // itself must still look like a real place attempt, not a nationwide-scope alias or ordinary
    // lowercase text.
    const city = cityMatch[1]?.trim();
    // TH-DISCOVERY-PARITY-001B-REVIEW2 finding A: isNationwideScope() must see the preposition
    // attached (cityMatch[0], e.g. "in America") -- the nationwide-phrase patterns only match with
    // their "in"/"across"/... prefix present, so checking the bare captured word alone ("America")
    // would miss them and let this fallback silently manufacture a bogus "America" city filter.
    if (
      city &&
      city.length > 2 &&
      /^[A-Z]/.test(city) &&
      !isNationwideScope(cityMatch[0]) &&
      !/ria|era|firm/i.test(city)
    ) {
      geography = {
        type: 'principal_office_city',
        value: city,
        meaning: 'Principal-office city on the SEC/IARD roster — not client geography.',
      };
    }
  }

  const status: InvestorResearchQuery['status'] | undefined = /\bsec-registered\b/i.test(q)
    ? 'registered'
    : 'current_roster';

  const unsupportedSpecialtyNote =
    !compensation.length && UNSUPPORTED_SPECIALTY_PATTERN.test(q)
      ? 'The requested fee-model or specialty (e.g. "fee-only", "retirement planning specialist") is not a searchable Form ADV field. Showing broader results across all reported compensation methods and firm types instead of stopping the search.'
      : undefined;

  const query: InvestorResearchQuery = {
    mode: 'entity',
    firmType: effectiveType,
    status,
    geography,
    raum,
    compensationMethods: compensation.length ? compensation : undefined,
    compensationMatch: /\bboth\b|\band\b/.test(q) && compensation.length > 1 ? 'all' : 'any',
    affiliationField: affiliation,
    nameQuery,
    unsupportedSpecialtyNote,
    sort,
    page,
  };

  push('Mode', 'entity');
  if (effectiveType === 'ria') push('Firm type', status === 'registered' ? 'RIA (reported as registered)' : 'RIA');
  else if (effectiveType === 'era') push('Firm type', 'ERA');
  else if (effectiveType === 'all') push('Firm types', 'RIA + ERA (kept separate)');
  if (geography) {
    push(
      geography.type === 'principal_office_state' ? 'Principal-office state' : geography.type === 'zip' ? 'Principal-office ZIP' : 'Principal-office city',
      geography.value,
    );
  }
  if (raum) {
    const band = ASK_RAUM_BANDS.find((b) => b.id === raum.bandId);
    push('RAUM', band?.label ?? rangeLabel(raum));
    push('RAUM field', 'Form ADV Item 5F(2)(c) (USD)');
  }
  if (compensation.length) {
    push(
      'Compensation methods',
      compensation.map((k) => `${COMPENSATION_FIELD_NAMES[k]} · ${COMPENSATION_METHOD_LABELS[k]}`).join(' + '),
    );
    push('Limitation', 'Item 5.E is a method checkbox, not a fee amount.');
  }
  if (affiliation) push('Affiliation', AFFILIATION_FIELDS[affiliation].label);
  if (unsupportedSpecialtyNote) push('Limitation', unsupportedSpecialtyNote);
  if (nameQuery) push('Name contains', nameQuery);
  push('Source', `Form ADV / ${V1_SOURCE.dataset}`);
  push('Sort', sort.replace('_', ' '));
  if (servesLanguage && geography) {
    push('Interpretation note', 'We interpreted location as principal-office geography. Client/service geography is not in this extract.');
  }

  return {
    raw: q,
    query,
    interpretation: lines,
    geographyNote: geography?.ambiguous ? geography.meaning : undefined,
  };
}

export function interpretInvestorAskQuery(raw: string, overrides: InvestorAskOverrides = {}): ParsedInvestorAsk {
  return planInvestorResearch(raw, overrides, interpretInvestorAskQueryCore);
}

function definitionResult(raw: string, definitionId: string, page: number): ParsedInvestorAsk {
  const def = ASK_DEFINITIONS[definitionId];
  return {
    raw,
    query: { mode: 'definition', definitionId, page },
    interpretation: [
      { label: 'Mode', value: 'definition' },
      { label: 'Term', value: def?.title ?? definitionId },
    ],
  };
}

function principalOfficeGeo(code: string, ambiguous: boolean): NonNullable<InvestorResearchQuery['geography']> {
  const name = REGION_NAMES[code] ?? code;
  return {
    type: 'principal_office_state',
    value: code,
    ambiguous,
    meaning: ambiguous
      ? `We interpreted this as principal office in ${name}. That is not client geography, service area, or notice-filing.`
      : `Principal office in ${name} (SEC/IARD main-office region). Not client geography.`,
  };
}

function rangeLabel(raum: NonNullable<InvestorResearchQuery['raum']>): string {
  const fmt = (n: number) =>
    n >= 1_000_000_000 ? `$${n / 1_000_000_000}B` : n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${n}`;
  if (raum.equalsZero) return 'Reported zero';
  if (raum.min != null && raum.maxExclusive != null) return `${fmt(raum.min)}–under ${fmt(raum.maxExclusive)}`;
  if (raum.min != null) return `${fmt(raum.min)} or more`;
  if (raum.maxExclusive != null) return `under ${fmt(raum.maxExclusive)}`;
  return 'RAUM filter';
}

export function whyThisMatched(input: {
  firmType?: InvestorFirmType;
  geography?: InvestorResearchQuery['geography'];
  raum?: InvestorResearchQuery['raum'];
  compensationMethods?: CompensationMethodKey[];
  identifier?: { type: 'crd' | 'sec_file_number'; value: string };
  nameQuery?: string;
  affiliationField?: keyof typeof AFFILIATION_FIELDS;
}): string {
  const bits: string[] = [];
  if (input.identifier?.type === 'crd') bits.push(`its organization CRD is ${input.identifier.value}`);
  if (input.identifier?.type === 'sec_file_number') bits.push(`its sourced SEC file number is ${input.identifier.value}`);
  if (input.firmType === 'ria') bits.push('it is classified as an RIA in the current SEC/IARD roster');
  if (input.firmType === 'era') bits.push('it is classified as an ERA in the current SEC/IARD roster');
  if (input.geography?.type === 'principal_office_state') {
    bits.push(`it reports its principal office in ${REGION_NAMES[input.geography.value] ?? input.geography.value}`);
  }
  if (input.geography?.type === 'principal_office_city') {
    bits.push(`it reports its principal-office city as ${input.geography.value}${input.geography.state ? `, ${REGION_NAMES[input.geography.state] ?? input.geography.state}` : ''}`);
  }
  if (input.raum) bits.push(`it reports RAUM ${rangeLabel(input.raum)} on Form ADV Item 5F(2)(c)`);
  if (input.compensationMethods?.length) {
    bits.push(
      `it reports ${input.compensationMethods.map((k) => COMPENSATION_METHOD_LABELS[k]).join(' and ')} on Form ADV Item 5.E`,
    );
  }
  if (input.affiliationField) bits.push(`it reports ${AFFILIATION_FIELDS[input.affiliationField].label}`);
  if (input.nameQuery) bits.push(`its sourced firm name contains “${input.nameQuery}”`);
  if (!bits.length) bits.push('it is a current SEC/IARD roster firm matching the structured filters');
  return `This firm matches because ${bits.join(', ')}.`;
}

export { V1_RIA_RAUM_BANDS };
