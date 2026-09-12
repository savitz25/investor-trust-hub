import type { InvestorAskOverrides, InvestorResearchQuery } from '@ith/domain';
import { REGION_NAMES, COMPENSATION_FIELD_NAMES } from '@ith/domain';

export class InvalidInvestorRequest extends Error {}
export const RAUM_FILTERS: Record<string, InvestorResearchQuery['raum']> = {
  'Reported zero': { equalsZero: true },
  'Under $25M': { min: 0, maxExclusive: 25000000 },
  '$25M–under $100M': { min: 25000000, maxExclusive: 100000000 },
  '$100M–under $1B': { min: 100000000, maxExclusive: 1000000000 },
  '$1B–under $10B': { min: 1000000000, maxExclusive: 10000000000 },
  '$10B+': { min: 10000000000 },
};
export const COMP_FILTERS: Record<string, keyof typeof COMPENSATION_FIELD_NAMES> = {
  'Asset based': 'percentage_of_assets',
  Hourly: 'hourly_charges',
  Subscription: 'subscription_fees',
  Fixed: 'fixed_fees',
  Commission: 'commissions',
  'Performance based': 'performance_based_fees',
};
export function readInvestorRequest(params: URLSearchParams) {
  const allowed = [
    'q',
    'page',
    'sort',
    'firmType',
    'state',
    'raum',
    'compensation',
    'identity',
    'selected',
    'broaden',
  ];
  for (const key of params.keys())
    if (!allowed.includes(key) || params.getAll(key).length !== 1)
      throw new InvalidInvestorRequest('Use one value per supported research parameter.');
  const raw = params.get('q') ?? '';
  if (raw.length > 400 || /[\u0000-\u001f]/.test(raw))
    throw new InvalidInvestorRequest(
      'Enter a complete question of at most 400 characters. The request was not truncated.',
    );
  const page = params.get('page') || '1';
  if (!/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 200)
    throw new InvalidInvestorRequest('Page must be an integer from 1 to 200.');
  const o: InvestorAskOverrides = { page: Number(page) };
  const state = params.get('state');
  if (state) {
    if (!REGION_NAMES[state]) throw new InvalidInvestorRequest('Choose a valid principal-office state.');
    o.state = state;
  }
  const type = params.get('firmType')?.toLowerCase();
  if (type) {
    if (!['ria', 'era', 'all'].includes(type))
      throw new InvalidInvestorRequest('Choose RIA, ERA or both as separate classes.');
    o.firmType = type as InvestorAskOverrides['firmType'];
  }
  const sort = params.get('sort');
  if (sort) {
    if (!['name', 'raum_desc', 'raum_asc', 'filing_date', 'crd'].includes(sort))
      throw new InvalidInvestorRequest('Choose a supported ordering.');
    o.sort = sort as InvestorAskOverrides['sort'];
  }
  const raum = params.get('raum');
  if (raum) {
    if (!RAUM_FILTERS[raum]) throw new InvalidInvestorRequest('Choose a supported RAUM filter.');
    o.raum = RAUM_FILTERS[raum];
  }
  const comp = params.get('compensation');
  if (comp) {
    if (!COMP_FILTERS[comp]) throw new InvalidInvestorRequest('Choose a supported compensation method.');
    o.compensationMethods = [COMP_FILTERS[comp]];
  }
  for (const key of ['identity', 'selected', 'broaden'] as const) {
    const value = params.get(key);
    if (value) o[key] = value;
  }
  return { raw, overrides: o };
}
export function investorParams(params: Record<string, string | string[] | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) for (const x of v) u.append(k, x);
    else if (v !== undefined) u.append(k, v);
  }
  return u;
}
export function overrideEntries(o: InvestorAskOverrides = {}, identity = true): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const key of [
    'firmType',
    'state',
    'sort',
    ...(identity ? (['identity', 'selected', 'broaden'] as const) : []),
  ] as const) {
    const value = o[key as keyof InvestorAskOverrides];
    if (typeof value === 'string') out.push([key, value]);
  }
  if (o.raum) {
    const entry = Object.entries(RAUM_FILTERS).find(([, v]) => JSON.stringify(v) === JSON.stringify(o.raum));
    if (entry) out.push(['raum', entry[0]]);
  }
  if (o.compensationMethods?.length === 1) {
    const entry = Object.entries(COMP_FILTERS).find(([, v]) => v === o.compensationMethods![0]);
    if (entry) out.push(['compensation', entry[0]]);
  }
  return out;
}
