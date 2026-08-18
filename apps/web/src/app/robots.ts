import type { MetadataRoute } from 'next';
import { isSiteIndexingEnabled } from '@ith/config';
import { getSiteEnv } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/professional/',
          '/fund/',
          '/company/',
          '/compare',
          '/my-investor-trust-hub',
          '/internal/',
        ],
      },
    ],
    // Staging must not advertise a sitemap. Pages stay crawlable so noindex is visible.
    ...(isSiteIndexingEnabled() ? { sitemap: `${NEXT_PUBLIC_SITE_URL}/sitemap.xml` } : {}),
  };
}
