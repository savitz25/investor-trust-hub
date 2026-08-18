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
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  transpilePackages: ['@ith/domain', '@ith/config', '@ith/ui'],
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
