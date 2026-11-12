'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureSanitizedPageview } from '@/lib/analytics/trusthub';
import { getPosthogBrowser } from '@/lib/analytics/posthog-browser';
import { shouldEnablePosthog } from '@/lib/analytics/environment';

function PosthogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef('');

  useEffect(() => {
    if (!shouldEnablePosthog()) return;
    const path = pathname || '/';
    void getPosthogBrowser()
      .then((posthog) => {
        if (!posthog) return;
        if (lastPath.current === path) return;
        lastPath.current = path;
        captureSanitizedPageview(path, window.location.href);
      })
      .catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}

/** Anonymous product analytics. No identify() call and no email. */
export function PosthogRoot() {
  useEffect(() => {
    void getPosthogBrowser().catch(() => undefined);
  }, []);
  return (
    <Suspense fallback={null}>
      <PosthogPageviews />
    </Suspense>
  );
}
