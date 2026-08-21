import type { Metadata } from 'next';
import { isHostLaunchIndexable, shouldNoIndex } from '@ith/config';
import { SITE_DESCRIPTION, SITE_NAME } from './site';
import { SHARE_HUB, resolveShareOrigin, shareOgImageAbsoluteUrl } from './share-hub';

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
  imageUrl,
  imageAlt,
}: {
  title: string;
  description?: string;
  path: string;
  indexable?: boolean;
  host?: string | null;
  imageUrl?: string;
  imageAlt?: string;
}): Metadata {
  const url = new URL(path, resolveShareOrigin()).toString();
  const noindex = !pageMayBeIndexed(path, indexable, host);

  const documentTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
  const ogImage = imageUrl || shareOgImageAbsoluteUrl();
  const ogAlt = imageAlt || SHARE_HUB.ogAlt;

  return {
    title: { absolute: documentTitle },
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: documentTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: SHARE_HUB.ogWidth,
          height: SHARE_HUB.ogHeight,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: SHARE_HUB.twitterCard,
      title: documentTitle,
      description,
      images: [{ url: ogImage, alt: ogAlt }],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const origin = resolveShareOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, origin).toString(),
    })),
  };
}
