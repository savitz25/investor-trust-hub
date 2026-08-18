import { unstable_cache } from 'next/cache';
import type { ParsedFirmSearch } from '@ith/domain';
import { getFirmDirectoryMetrics, getOfficialFirmBySlug, searchOfficialFirms } from './repository';

const FIRM_REVALIDATE_SECONDS = 21_600;
const SEARCH_REVALIDATE_SECONDS = 120;
const METRICS_REVALIDATE_SECONDS = 300;

export const getCachedOfficialFirmBySlug = unstable_cache(
  async (slug: string) => getOfficialFirmBySlug(slug),
  ['official-firm-by-slug'],
  { revalidate: FIRM_REVALIDATE_SECONDS, tags: ['official-firms'] },
);

export const getCachedFirmDirectoryMetrics = unstable_cache(
  async () => getFirmDirectoryMetrics(),
  ['firm-directory-metrics'],
  { revalidate: METRICS_REVALIDATE_SECONDS, tags: ['official-firms'] },
);

export const getCachedOfficialFirmSearch = unstable_cache(
  async (serialized: string) => {
    const parsed = JSON.parse(serialized) as ParsedFirmSearch;
    return searchOfficialFirms(parsed);
  },
  ['official-firm-search'],
  { revalidate: SEARCH_REVALIDATE_SECONDS, tags: ['official-firms'] },
);
