import type { Metadata } from 'next';
import { isHostLaunchIndexable, shouldNoIndex } from '@ith/config';
import { SITE_DESCRIPTION, SITE_NAME, getSiteEnv } from './site';

/**
 * Firm/page HTML may be indexed only when:
 * Gate A — SITE_INDEXING_ENABLED
 * Gate B — request host is an approved production hostname
 * Gate C — firm/page content gate (when provided)
 *
 * If host is omitted, Gate B uses env (INDEXABLE_HOSTS configured, not Preview).
 * Middleware still emits x-robots-tag so an unapproved host cannot be indexed.
 */
export function pageMayBeIndexed(path: string, firmOrPageIndexable?: boolean, host?: string | null): boolean {
  if (!isHostLaunchIndexable(host)) {
    return false;
  }
  if (firmOrPageIndexable === undefined) {
    return !shouldNoIndex(path);
  }
  return firmOrPageIndexable;
}

export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  indexable,
  host,
}: {
  title: string;
  description?: string;
  path: string;
  indexable?: boolean;
  host?: string | null;
}): Metadata {
  const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();
  const url = new URL(path, NEXT_PUBLIC_SITE_URL).toString();
  const noindex = !pageMayBeIndexed(path, indexable, host);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: true }
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
