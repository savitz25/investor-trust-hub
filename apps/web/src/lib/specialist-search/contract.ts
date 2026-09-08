export const SPECIALIST_SEARCH_VERSION = 'trusthub-specialist-search-v1' as const;

export type SearchCapabilityState = 'KNOWN' | 'UNKNOWN' | 'PARTIAL' | 'NOT_ACQUIRED' | 'REQUEST_ONLY' | 'UNSUPPORTED';
export type SpecialistSearchIntent = 'IDENTITY' | 'DISCOVERY' | 'EVIDENCE' | 'EXPLAIN' | 'COUNT' | 'COMPARE' | 'UNKNOWN';

export type SpecialistSearchRequest = {
  version: typeof SPECIALIST_SEARCH_VERSION;
  rawQuery: string;
  intent: SpecialistSearchIntent;
  entityType: 'firm' | null;
  identifiers: Array<{ type: 'firm_crd' | 'sec_file_number'; value: string }>;
  geography: { state: string | null; city: string | null; zip: string | null; meaning: string | null };
  classifications: Array<'RIA' | 'ERA'>;
  statusFilters: string[];
  evidenceFilters: string[];
  advancedFilters: Record<string, string | boolean>;
  page: number;
  pageSize: number;
};

export const SPECIALIST_SEARCH_ANALYTICS_EVENTS = [
  'specialist_search_submit', 'specialist_search_interpreted', 'specialist_search_results',
  'specialist_search_zero_results', 'specialist_search_refine', 'specialist_search_trace_open',
  'specialist_search_profile_open',
] as const;
