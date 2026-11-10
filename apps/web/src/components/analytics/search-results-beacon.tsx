'use client';

import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

/** Fired when specialist search returns without a result set (invalid input or unavailable data). */
export function SearchResultsBeacon({
  success,
  capabilityState,
  resultCount,
  state,
}: {
  success: boolean;
  capabilityState: string;
  resultCount?: number;
  state?: string;
}) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface: 'specialist_search',
      success,
      capability_state: capabilityState,
      result_count: resultCount,
      state,
    });
  }, [success, capabilityState, resultCount, state]);
  return null;
}
