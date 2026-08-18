import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, isSiteIndexingEnabled } from '@ith/config';
import { countIndexableFirms, listIndexableFirmSlugs } from '@/lib/firms/repository';
import { hasDatabaseUrl } from '@/lib/db';
import { getSiteEnv } from '@/lib/site';

const FIRM_SITEMAP_PAGE_SIZE = 5000;

function staticEntries(base: string): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}

export async function generateSitemaps() {
  if (!isSiteIndexingEnabled() || !hasDatabaseUrl()) {
    return [{ id: 0 }];
  }
  try {
    const count = await countIndexableFirms();
    const pages = Math.max(1, Math.ceil(count / FIRM_SITEMAP_PAGE_SIZE));
    return Array.from({ length: pages }, (_, index) => ({ id: index }));
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  if (!isSiteIndexingEnabled()) {
    return [];
  }
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  const entries = id === 0 ? staticEntries(NEXT_PUBLIC_SITE_URL) : [];
  if (!hasDatabaseUrl()) {
    return entries;
  }
  try {
    const slugs = await listIndexableFirmSlugs(FIRM_SITEMAP_PAGE_SIZE, id * FIRM_SITEMAP_PAGE_SIZE);
    return [
      ...entries,
      ...slugs.map((slug) => ({
        url: new URL(`/firm/${slug}`, NEXT_PUBLIC_SITE_URL).toString(),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return entries;
  }
}
