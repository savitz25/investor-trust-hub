import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS, isHostLaunchIndexable } from '@ith/config';
import { listIndexableFirmsForSitemap } from '@/lib/firms/repository';
import { sourceDateForSitemap } from '@/lib/sitemap-last-modified';
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

/** Single /sitemap.xml urlset, including bounded published state-firm profiles. */
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
    const firms = await listIndexableFirmsForSitemap(10_000, 0);
    return [
      ...entries,
      ...firms.map(({ slug, sourceLastModified }) => {
        const lastModified = sourceDateForSitemap(sourceLastModified);
        return {
          url: new URL(`/firm/${slug}`, NEXT_PUBLIC_SITE_URL).toString(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
          ...(lastModified ? { lastModified } : {}),
        };
      }),
    ];
  } catch {
    return entries;
  }
}
