import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
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
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  icons: {
    icon: '/brand/mark.svg',
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
        className={`${sans.variable} ${serif.variable} font-sans antialiased text-[var(--ith-ink)]`}
        data-hub="investor"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="min-h-[calc(100vh-8rem)]">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
