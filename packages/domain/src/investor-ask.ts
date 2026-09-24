/**
 * investor-ask-v1 — natural language → structured InvestorResearchQuery.
 * The interpreter parses language. It does not invent firm facts.
 */

import { COMPENSATION_METHOD_LABELS } from './adv-profile-intelligence';
import { isOrganizationNameShape } from './firm-name-match';
import { REGION_NAMES, V1_RIA_RAUM_BANDS, V1_SOURCE } from './investor-home-intel';
import { planInvestorResearch, type InvestorResearchIntent, type InvestorCondition } from './investor-research-plan';
import { decideUsGeography, isNationwideScope } from './us-geography';
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
    /\b(best|safest|most trustworthy|trustworthiest|lowest fees?|cheapest|who should i hire|should i (hire|use)|best returns?|highest[- ]performing|highest (returns?|performance)|most profitable|make me the most money|most money|top[- ]rated|most trusted)\b/i.test(
      q,
    ) || /\b(what stocks? should i buy|should i buy|move my ira|portfolio recommendation|pick (an? )?investments?)\b/i.test(q)
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

  if (isRecommendationQuery(q) && !/\bperformance-based fees?\b/i.test(q)) {
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
  // TH-SEARCH-R1-019H: the shape test used to be `/^[A-Za-z][A-Za-z0-9&.,' -]{1,79}$/`, requiring
  // the first character to be a letter. That silently excluded real, legitimately organization-
  // shaped names beginning with a digit ("1ST GLOBAL", "3 SIGMA", "180 DEGREE CAPITAL CORP") from
  // native bare-name discovery while the structured specialist identityName path (which passes the
  // raw string straight through) had no such restriction -- a native/structured parity gap. Both
  // paths now share isOrganizationNameShape() (firm-name-match.ts), which allows a digit-leading
  // name only when the string also contains a letter, so bare ambiguous digit strings ("123456",
  // "2026", "1", "3", an unlabeled SEC-file shape like "801-11953") remain excluded exactly as
  // before -- BARE_DIGITS above already fail-closes pure 4-10 digit runs before this point is ever
  // reached, and isOrganizationNameShape() additionally excludes any string of only digits/spaces/
  // hyphens regardless of length.
  const simpleFirmName = !firmType && !states.length && !raum && !compensation.length && !affiliation && isOrganizationNameShape(q) && !/\b(what|how|who|does|is|show|find|advis(?:er|or)s?|firm|fees?|ownership|disclosure)\b/i.test(q) ? q : undefined;
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
