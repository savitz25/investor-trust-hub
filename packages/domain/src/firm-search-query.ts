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

export function parseFirmSearchInput(input: {
  q?: string | string[];
  state?: string | string[];
  page?: string | string[];
}): ParsedFirmSearch {
  const rawQ = Array.isArray(input.q) ? input.q[0] : input.q;
  const rawState = Array.isArray(input.state) ? input.state[0] : input.state;
  const rawPage = Array.isArray(input.page) ? input.page[0] : input.page;
  const parsed = firmSearchParamsSchema.parse({
    q: rawQ ?? '',
    state: rawState ?? '',
    page: rawPage ?? '1',
  });
  const q = normalizeSearchText(parsed.q);
  const compact = q.replace(/\s+/g, '');
  let exactCrd: string | null = null;
  let exactSecFile: string | null = null;
  if (isValidIdentifierValue('crd', compact)) {
    exactCrd = normalizeIdentifierValue('crd', compact);
  }
  if (SEC_FILE_LOOSE.test(compact) && isValidIdentifierValue('sec_file_number', compact.toUpperCase())) {
    exactSecFile = normalizeIdentifierValue('sec_file_number', compact);
  }
  const stateRaw = parsed.state.trim().toUpperCase();
  const stateNone = stateRaw === SEARCH_STATE_NONE.toUpperCase() || stateRaw === SEARCH_STATE_NONE;
  const state = !stateNone && isUsStateCode(stateRaw) ? stateRaw : null;
  return {
    q,
    state,
    stateNone,
    page: parsed.page,
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
