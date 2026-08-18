import type { Metadata } from 'next';
import { shouldNoIndex } from '@ith/config';
import { SITE_DESCRIPTION, SITE_NAME, getSiteEnv } from './site';

export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  const url = new URL(path, NEXT_PUBLIC_SITE_URL).toString();
  const noindex = shouldNoIndex(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, NEXT_PUBLIC_SITE_URL).toString(),
    })),
  };
}
