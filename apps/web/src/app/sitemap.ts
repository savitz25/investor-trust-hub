import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, isHostLaunchIndexable } from '@ith/config';
import { listIndexableFirmSlugs } from '@/lib/firms/repository';
import { hasDatabaseUrl } from '@/lib/db';
import { getSiteEnv } from '@/lib/site';
import { readRequestHost } from '@/lib/request-host';

function staticEntries(base: string): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}

/** Single /sitemap.xml urlset. Wave 1 (~1,000 firms + shell) fits one file. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await readRequestHost();
  if (!isHostLaunchIndexable(host)) {
    return [];
  }
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  const entries = staticEntries(NEXT_PUBLIC_SITE_URL);
  if (!hasDatabaseUrl()) {
    return entries;
  }
  try {
    const slugs = await listIndexableFirmSlugs(5_000, 0);
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
