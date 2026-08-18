import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from '@ith/config';

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
};

export default nextConfig;
