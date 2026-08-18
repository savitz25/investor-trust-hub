import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { isHostLaunchIndexable } from '@ith/config';
import { SITE_DESCRIPTION, SITE_NAME, getSiteEnv } from '@/lib/site';
import './globals.css';

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const { NEXT_PUBLIC_SITE_URL } = getSiteEnv();

export const metadata: Metadata = {
  metadataBase: new URL(NEXT_PUBLIC_SITE_URL),
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
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Investor Trust Hub — Research smarter. Invest better.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport: Viewport = {
  themeColor: '#001F52',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${serif.variable} font-sans antialiased text-[var(--ith-ink)]`}
        data-hub="investor"
        data-network-standard="2026.08.18-network-v2"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': `${NEXT_PUBLIC_SITE_URL}/#organization`,
              name: SITE_NAME,
              url: NEXT_PUBLIC_SITE_URL,
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
