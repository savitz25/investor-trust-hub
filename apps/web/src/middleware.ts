import { NextResponse, type NextRequest } from 'next/server';
import { isHostLaunchIndexable } from '@ith/config';

/**
 * Gate B enforcement. HTML meta is not enough: the same deployment can be
 * reached via .vercel.app after SITE_INDEXING_ENABLED=true. Preview hosts
 * never receive an indexable robots header.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const response = NextResponse.next();
  if (!isHostLaunchIndexable(host)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|brand/|favicon.ico|icon.svg).*)'],
};
