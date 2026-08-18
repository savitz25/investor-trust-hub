import type { MetadataRoute } from 'next';
import { INDEXABLE_PATHS } from '@ith/config';
import { getSiteEnv } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  return INDEXABLE_PATHS.map((path) => ({
    url: new URL(path, NEXT_PUBLIC_SITE_URL).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
