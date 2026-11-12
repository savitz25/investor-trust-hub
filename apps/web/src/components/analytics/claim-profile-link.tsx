'use client';

import type { ReactNode } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

/** Starts the existing claim handoff. The claim form itself lives on Ask. */
export function ClaimProfileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={() => {
        captureTrustEvent(
          TRUSTHUB_EVENTS.CLAIM_STARTED,
          { surface: 'firm_profile', success: true },
          { sendBeforeUnload: true },
        );
      }}
    >
      {children}
    </a>
  );
}
