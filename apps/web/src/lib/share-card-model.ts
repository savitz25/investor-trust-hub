/**
 * SHARE-003 — Investor share-card models (no I/O).
 * Official cards use only fields already published on the firm page.
 * Do not characterize investment quality or convert missing disclosures into endorsement.
 */

export type InvestorShareCardKind = 'fallback' | 'entity' | 'content';

export type InvestorShareCardModel = {
  kind: InvestorShareCardKind;
  eyebrow: string;
  title: string;
  subtitle?: string;
  fact?: string;
};

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

export function truncateShareText(value: string, maxChars: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function displayStateName(codeOrName?: string | null): string {
  const raw = (codeOrName || '').trim();
  if (!raw) return '';
  if (raw.length === 2) return US_STATE_NAMES[raw.toUpperCase()] || raw.toUpperCase();
  return raw;
}

function locationLine(city?: string | null, region?: string | null): string {
  const cityName = (city || '').trim();
  const state = displayStateName(region);
  if (cityName && state) return `${cityName}, ${state}`;
  return cityName || state;
}

/** Public CRD digits only — never SYN- fixtures or other prefixed values. */
export function publicCrdLabel(crd?: string | null): string | undefined {
  const digits = (crd || '').replace(/\D/g, '');
  if (!digits || /syn/i.test(crd || '')) return undefined;
  if (!/^\d+$/.test((crd || '').trim()) && (crd || '').includes('-')) return undefined;
  return digits ? `CRD ${digits}` : undefined;
}

export function investorOfficialFirmShareModel(input: {
  name: string;
  city?: string | null;
  region?: string | null;
  crd?: string | null;
}): InvestorShareCardModel {
  const location = locationLine(input.city, input.region);
  const crd = publicCrdLabel(input.crd);
  return {
    kind: 'entity',
    eyebrow: 'INVESTMENT FIRM RESEARCH',
    title: truncateShareText(input.name || '', 48) || 'Firm profile',
    subtitle: location ? truncateShareText(location, 52) : undefined,
    fact: truncateShareText(
      [crd, 'Registration · disclosures · public research'].filter(Boolean).join(' · '),
      72,
    ),
  };
}

export function investorSyntheticFirmShareModel(input: {
  name: string;
  city?: string | null;
  region?: string | null;
  kindLabel?: string | null;
}): InvestorShareCardModel {
  const location = locationLine(input.city, input.region);
  return {
    kind: 'entity',
    eyebrow: 'SYNTHETIC FIRM RESEARCH',
    title: truncateShareText(input.name || '', 48) || 'Firm fixture',
    subtitle: location ? truncateShareText(location, 52) : undefined,
    fact: truncateShareText(
      [input.kindLabel, 'Development fixture · not a real firm'].filter(Boolean).join(' · '),
      72,
    ),
  };
}

export function investorResearchShareModel(): InvestorShareCardModel {
  return {
    kind: 'content',
    eyebrow: 'CONSUMER RESEARCH',
    title: 'Research questions',
    fact: 'Identity · registration · disclosures · public records',
  };
}
