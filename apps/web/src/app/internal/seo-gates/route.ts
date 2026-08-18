import { NextResponse } from 'next/server';
import {
  isApprovedIndexableHost,
  isSiteIndexingEnabled,
  isVercelPreview,
  parseIndexableHosts,
} from '@ith/config';
import { readRequestHost } from '@/lib/request-host';

/** Secret-free launch-gate probe. Does not print env values or host lists. */
export async function GET() {
  const host = await readRequestHost();
  return NextResponse.json({
    siteIndexingEnabled: isSiteIndexingEnabled(),
    preview: isVercelPreview(),
    approvedHostCount: parseIndexableHosts().length,
    requestHostApproved: isApprovedIndexableHost(host),
    requestHostKind: host.endsWith('.vercel.app')
      ? 'vercel'
      : host.endsWith('investortrusthub.com')
        ? 'permanent'
        : 'other',
  });
}
