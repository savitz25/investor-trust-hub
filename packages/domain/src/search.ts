import { z } from 'zod';

/**
 * Search foundation — interfaces for later production search.
 * Task 001 does not implement a 700k-row search engine.
 */

export const SEARCH_ENTITY_KINDS = ['person', 'firm', 'product', 'issuer'] as const;
export type SearchEntityKind = (typeof SEARCH_ENTITY_KINDS)[number];

export const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  entityKind: z.enum(SEARCH_ENTITY_KINDS).optional(),
  identifierType: z.string().optional(),
  identifierValue: z.string().max(64).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  registrationType: z.string().optional(),
  includeSynthetic: z.boolean().default(false),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface SearchHit {
  entityKind: SearchEntityKind;
  entityId: string;
  slug: string;
  displayName: string;
  subtitle?: string;
  identifiers: Array<{ type: string; value: string }>;
  region?: string;
  postalCode?: string;
  isSynthetic: boolean;
}

export interface SearchIndex {
  search(query: SearchQuery): Promise<SearchHit[]>;
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchesQuery(haystack: string, q: string | undefined): boolean {
  if (!q || q.trim() === '') return true;
  return normalizeSearchText(haystack).includes(normalizeSearchText(q));
}
