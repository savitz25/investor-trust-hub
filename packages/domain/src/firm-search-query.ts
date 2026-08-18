import { z } from 'zod';
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
}

const SEC_FILE_LOOSE = /^(801|802|803|8)-?\d{1,8}$/i;

function firstString(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseFirmSearchInput(input: {
  q?: string | string[];
  state?: string | string[];
  page?: string | string[];
}): ParsedFirmSearch {
  const rawQ = firstString(input.q).slice(0, 200);
  const rawState = firstString(input.state).slice(0, 16);
  const parsed = firmSearchParamsSchema.safeParse({
    q: rawQ,
    state: rawState,
    page: firstString(input.page) || '1',
  });
  const values = parsed.success
    ? parsed.data
    : { q: rawQ, state: rawState, page: 1 };
  const q = normalizeSearchText(values.q);
  const compact = q.replace(/\s+/g, '');
  let exactCrd: string | null = null;
  let exactSecFile: string | null = null;
  if (isValidIdentifierValue('crd', compact)) {
    exactCrd = normalizeIdentifierValue('crd', compact);
  }
  if (SEC_FILE_LOOSE.test(compact) && isValidIdentifierValue('sec_file_number', compact.toUpperCase())) {
    exactSecFile = normalizeIdentifierValue('sec_file_number', compact);
  }
  const stateRaw = values.state.trim().toUpperCase();
  const stateNone = stateRaw === SEARCH_STATE_NONE.toUpperCase() || stateRaw === SEARCH_STATE_NONE;
  const state = !stateNone && isUsStateCode(stateRaw) ? stateRaw : null;
  return {
    q,
    state,
    stateNone,
    page: values.page,
    exactCrd,
    exactSecFile,
    looksLikeIdentifier: Boolean(exactCrd || exactSecFile),
  };
}

export function firmSearchHref(input: { q?: string; state?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.state) params.set('state', input.state);
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
