import type { MetadataRoute } from 'next';
import { isHostLaunchIndexable } from '@ith/config';
import { getSiteEnv } from '@/lib/site';
import { readRequestHost } from '@/lib/request-host';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await readRequestHost();
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  const launch = isHostLaunchIndexable(host);
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/professionals',
          '/professional/',
          '/fund/',
          '/company/',
          '/compare',
          '/my-investor-trust-hub',
          '/internal/',
        ],
      },
    ],
    ...(launch ? { sitemap: `${NEXT_PUBLIC_SITE_URL}/sitemap.xml` } : {}),
  };
}
