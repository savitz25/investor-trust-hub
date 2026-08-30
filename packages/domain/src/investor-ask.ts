/**
 * investor-ask-v1 — natural language → structured InvestorResearchQuery.
 * The interpreter parses language. It does not invent firm facts.
 */

import { COMPENSATION_METHOD_LABELS } from './adv-profile-intelligence';
import { REGION_NAMES, V1_RIA_RAUM_BANDS, V1_SOURCE } from './investor-home-intel';

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
  identifier: 'labeled_crd',
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
  mode: InvestorAskMode;
  firmType?: InvestorFirmType;
  status?: 'registered' | 'pending' | 'reporting' | 'current_roster';
  geography?: {
    type: 'principal_office_state' | 'principal_office_city' | 'zip';
    value: string;
    meaning: string;
    ambiguous?: boolean;
  };
  compareGeography?: {
    type: 'principal_office_state';
    value: string;
    meaning: string;
  };
  identifier?: { type: 'crd'; value: string };
  raum?: { min?: number; maxExclusive?: number; equalsZero?: boolean; bandId?: RaumBandId };
  compensationMethods?: CompensationMethodKey[];
  compensationMatch?: 'all' | 'any';
  affiliationField?: keyof typeof AFFILIATION_FIELDS;
  nameQuery?: string;
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
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

const LABELED_CRD = /\bcrd\s*#?\s*(\d{1,10})\b/i;
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
  return found;
}

function detectFirmType(q: string): InvestorFirmType | undefined {
  const ria = /\brias?\b|\bregistered investment advisers?\b|\bsec-registered\b/i.test(q);
  const era = /\beras?\b|\bexempt reporting advisers?\b/i.test(q);
  if (ria && era) return 'all';
  if (ria) return 'ria';
  if (era) return 'era';
  if (/\binvestment advisers?\b|\badviser firms?\b|\badvisory firms?\b/i.test(q)) return 'all';
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
    /\b(best|safest|most trustworthy|trustworthiest|lowest fees?|cheapest|who should i hire|should i (hire|use)|best returns?|highest (returns?|performance)|make me the most money|most money|top[- ]rated|most trusted)\b/i.test(
      q,
    ) || /\b(what stocks? should i buy|should i buy|move my ira|portfolio recommendation|pick (an? )?investments?)\b/i.test(q)
  );
}

function isFiduciaryBinary(q: string): boolean {
  return /\b(more trustworthy|more fiduciary|ria or broker)\b/i.test(q) && /\b(ria|broker)\b/i.test(q);
}

export function interpretInvestorAskQuery(raw: string, overrides: InvestorAskOverrides = {}): ParsedInvestorAsk {
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
  if (/\bwhat does asset-based compensation mean\b|\basset-based (compensation|fees?) mean\b/i.test(q)) {
    return definitionResult(q, 'asset_based', page);
  }

  const crdMatch = q.match(LABELED_CRD);
  if (crdMatch?.[1]) {
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
  if (/\baffiliated broker-dealers?\b|\bbroker-dealer affiliat/i.test(q)) affiliation = 'affiliation_broker_dealer';
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
  const nameQuery = nameQuoted?.[1]?.trim() || named?.[1]?.trim();

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
  } else if (cityMatch && /\bcity\b|\bin [A-Z]/i.test(q) && !states.length) {
    const city = cityMatch[1]?.trim();
    if (city && city.length > 2 && !/ria|era|firm/i.test(city)) {
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
  identifier?: { type: 'crd'; value: string };
  nameQuery?: string;
  affiliationField?: keyof typeof AFFILIATION_FIELDS;
}): string {
  const bits: string[] = [];
  if (input.identifier) bits.push(`its organization CRD is ${input.identifier.value}`);
  if (input.firmType === 'ria') bits.push('it is classified as an RIA in the current SEC/IARD roster');
  if (input.firmType === 'era') bits.push('it is classified as an ERA in the current SEC/IARD roster');
  if (input.geography?.type === 'principal_office_state') {
    bits.push(`it reports its principal office in ${REGION_NAMES[input.geography.value] ?? input.geography.value}`);
  }
  if (input.geography?.type === 'principal_office_city') {
    bits.push(`it reports its principal-office city as ${input.geography.value}`);
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
