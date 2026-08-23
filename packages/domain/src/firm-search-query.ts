import { z } from 'zod';
import {
  normalizeAskCity,
  normalizeAskZip,
  parseInvestorAskSearchContext,
  type InvestorAskEntity,
  type InvestorAskSearchContext,
} from './ask-handoff';
import { isUsStateCode } from './firm-classification';
import { isValidIdentifierValue, normalizeIdentifierValue } from './identifiers';
import { normalizeSearchText } from './search';

export const SEARCH_STATE_NONE = '_none';

export const firmSearchParamsSchema = z.object({
  q: z.string().max(200).optional().default(''),
  state: z.string().max(16).optional().default(''),
  page: z.coerce.number().int().min(1).max(200).optional().default(1),
});

export interface ParsedFirmSearch {
  q: string;
  state: string | null;
  stateNone: boolean;
  page: number;
  exactCrd: string | null;
  exactSecFile: string | null;
  looksLikeIdentifier: boolean;
  /** Physical principal-office city slug (Ask / structured). */
  city: string | null;
  /** Physical principal-office ZIP (5-digit). */
  zip: string | null;
  /** RIA / ERA filter — null means broad adviser search. */
  entityType: InvestorAskEntity | null;
  /** Ask receiving path: ignore free-text q; restrict to Wave-1 indexable. */
  fromAsk: boolean;
  indexableOnly: boolean;
}

const SEC_FILE_LOOSE = /^(801|802|803|8)-?\d{1,8}$/i;

function firstString(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseFirmSearchInput(input: {
  q?: string | string[];
  state?: string | string[];
  page?: string | string[];
  city?: string | string[];
  zip?: string | string[];
  entity?: string | string[];
  src?: string | string[];
  category?: string | string[];
  journey?: string | string[];
  intent?: string | string[];
  sid?: string | string[];
  county?: string | string[];
}): ParsedFirmSearch {
  const askCtx = parseInvestorAskSearchContext(input);
  const fromAsk = Boolean(askCtx && !askCtx.unsupported);

  const rawQ = fromAsk ? '' : firstString(input.q).slice(0, 200);
  const rawState = firstString(input.state).slice(0, 16);
  const parsed = firmSearchParamsSchema.safeParse({
    q: rawQ,
    state: rawState,
    page: firstString(input.page) || '1',
  });
  const values = parsed.success ? parsed.data : { q: rawQ, state: rawState, page: 1 };
  const q = normalizeSearchText(values.q);
  const compact = q.replace(/\s+/g, '');
  let exactCrd: string | null = null;
  let exactSecFile: string | null = null;
  if (isValidIdentifierValue('crd', compact)) {
    exactCrd = normalizeIdentifierValue('crd', compact);
  }
  if (
    SEC_FILE_LOOSE.test(compact) &&
    isValidIdentifierValue('sec_file_number', compact.toUpperCase())
  ) {
    exactSecFile = normalizeIdentifierValue('sec_file_number', compact);
  }
  const stateRaw = values.state.trim().toUpperCase();
  const stateNone =
    stateRaw === SEARCH_STATE_NONE.toUpperCase() || stateRaw === SEARCH_STATE_NONE;
  const stateFromInput = !stateNone && isUsStateCode(stateRaw) ? stateRaw : null;

  const city =
    (fromAsk && askCtx?.city) ||
    normalizeAskCity(firstString(input.city)) ||
    null;
  const zip =
    (fromAsk && askCtx?.zip) || normalizeAskZip(firstString(input.zip)) || null;
  const entityType: InvestorAskEntity | null =
    fromAsk && askCtx?.entityType
      ? askCtx.entityType
      : firstString(input.entity).toLowerCase() === 'ria'
        ? 'ria'
        : firstString(input.entity).toLowerCase() === 'era'
          ? 'era'
          : null;

  return {
    q: fromAsk ? '' : q,
    state: fromAsk && askCtx?.state ? askCtx.state : stateFromInput,
    stateNone: fromAsk ? false : stateNone,
    page: values.page,
    exactCrd: fromAsk ? null : exactCrd,
    exactSecFile: fromAsk ? null : exactSecFile,
    looksLikeIdentifier: fromAsk ? false : Boolean(exactCrd || exactSecFile),
    city,
    zip,
    entityType,
    fromAsk,
    indexableOnly: fromAsk,
  };
}

/** Map a validated Ask context → firm search (no free-text q). */
export function firmSearchFromAskContext(
  ctx: InvestorAskSearchContext,
  page = 1
): ParsedFirmSearch {
  return {
    q: '',
    state: ctx.state ?? null,
    stateNone: false,
    page,
    exactCrd: null,
    exactSecFile: null,
    looksLikeIdentifier: false,
    city: ctx.city ?? null,
    zip: ctx.zip ?? null,
    entityType: ctx.entityType ?? null,
    fromAsk: true,
    indexableOnly: true,
  };
}

export function firmSearchHref(input: {
  q?: string;
  state?: string;
  page?: number;
  city?: string;
  zip?: string;
  entity?: string;
  src?: string;
  category?: string;
  journey?: string;
  intent?: string;
  sid?: string;
}): string {
  const params = new URLSearchParams();
  if (input.src === 'ask') {
    params.set('src', 'ask');
    if (input.state) params.set('state', input.state);
    if (input.city) params.set('city', input.city);
    if (input.zip) params.set('zip', input.zip);
    if (input.entity) params.set('entity', input.entity);
    if (input.category) params.set('category', input.category);
    if (input.journey) params.set('journey', input.journey);
    if (input.intent) params.set('intent', input.intent);
    if (input.sid) params.set('sid', input.sid);
    if (input.page && input.page > 1) params.set('page', String(input.page));
    const query = params.toString();
    return query ? `/firms?${query}` : '/firms';
  }
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.state) params.set('state', input.state);
  if (input.city) params.set('city', input.city);
  if (input.zip) params.set('zip', input.zip);
  if (input.entity) params.set('entity', input.entity);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  const query = params.toString();
  return query ? `/firms?${query}` : '/firms';
}

export const OFFICIAL_IAPD_HOME = 'https://adviserinfo.sec.gov/';
export const OFFICIAL_SEC_ADV_CATALOG =
  'https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers';

export function officialFirmRecordHref(): string {
  return OFFICIAL_IAPD_HOME;
}
