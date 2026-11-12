import type { NextConfig } from 'next';
import { SECURITY_HEADERS, parseCanonicalHost, parseIndexableHosts } from '@ith/config';

function hostRedirects() {
  const canonical = parseCanonicalHost();
  if (!canonical) {
    return [];
  }
  return parseIndexableHosts()
    .filter((host) => host !== canonical)
    .map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host }],
      destination: `https://${canonical}/:path*`,
      permanent: true,
    }));
}

const nextConfig: NextConfig = {
  // VERCEL_ENV is a system variable. Copy it so the browser can set the
  // analytics `environment` super property without a dashboard env change.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || '',
  },
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  transpilePackages: ['@ith/domain', '@ith/config', '@ith/ui'],
  // Block HTML until generateMetadata resolves so crawlers and QA see one
  // document title instead of streamed layout fallbacks.
  htmlLimitedBots: /./,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return hostRedirects();
  },
};

export default nextConfig;
