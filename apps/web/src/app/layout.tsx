import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { BRAND, isHostLaunchIndexable } from '@ith/config';
import { TH_CHASSIS_VERSION } from '@/lib/design/trusthub-visual-standard';
import { ASK_NETWORK_CONTRACT_VERSION } from '@/lib/network/registry';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';
import { SHARE_HUB, resolveShareOrigin, shareOgImageAbsoluteUrl } from '@/lib/share-hub';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: true,
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(resolveShareOrigin()),
  alternates: { canonical: `${resolveShareOrigin()}/` },
  title: {
    default: `${SITE_NAME} — Research before you invest.`,
    template: `%s · ${SITE_NAME}`,
    absolute: `${SITE_NAME} — Research before you invest.`,
  },
  description: SITE_DESCRIPTION,
  robots: isHostLaunchIndexable()
    ? { index: true, follow: true }
    : { index: false, follow: true },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    url: resolveShareOrigin(),
    title: `${SITE_NAME} — Research before you invest.`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: shareOgImageAbsoluteUrl(),
        width: SHARE_HUB.ogWidth,
        height: SHARE_HUB.ogHeight,
        alt: SHARE_HUB.ogAlt,
      },
    ],
  },
  twitter: {
    card: SHARE_HUB.twitterCard,
    title: `${SITE_NAME} — Research before you invest.`,
    description: SITE_DESCRIPTION,
    images: [{ url: shareOgImageAbsoluteUrl(), alt: SHARE_HUB.ogAlt }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${serif.variable} antialiased text-[var(--ith-ink)]`}
        data-hub="investor"
        data-network-standard={ASK_NETWORK_CONTRACT_VERSION}
        data-th-chassis={TH_CHASSIS_VERSION}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': `${resolveShareOrigin()}/#organization`,
              name: SITE_NAME,
              url: resolveShareOrigin(),
              email: BRAND.publicContactEmail,
              parentOrganization: {
                '@type': 'Organization',
                '@id': 'https://www.asktrusthub.com/#organization',
                name: 'Ask Trust Hub',
                url: 'https://www.asktrusthub.com',
              },
            }).replace(/</g, '\\u003c'),
          }}
        />
        <SiteHeader />
        <main id="main" className="min-h-[calc(100vh-8rem)]">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
