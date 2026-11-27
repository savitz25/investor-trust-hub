'use client';
import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';
import { type InvestorSearchAnalytics } from '@/lib/specialist-search/analytics';

export function SearchAnalytics({
  dimensions,
  resultCount,
  outcome,
}: {
  dimensions: InvestorSearchAnalytics;
  resultCount: number;
  outcome?: { resultCount?: number; success: boolean; capabilityState?: string };
}) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface: 'specialist_search',
      result_count: outcome?.resultCount ?? resultCount,
      success: outcome?.success ?? dimensions.coverageState !== 'UNSUPPORTED',
      state: dimensions.state,
      capability_state: outcome?.capabilityState ?? dimensions.coverageState,
    });
    const root = document.querySelector('[data-specialist-results]');
    const click = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-specialist-event]') : null;
      const action = target?.dataset.specialistEvent;
      if (action === 'profile_open') {
        captureTrustEvent(
          TRUSTHUB_EVENTS.SEARCH_RESULT_OPENED,
          {
            surface: 'specialist_search',
            success: true,
            state: dimensions.state,
            capability_state: outcome?.capabilityState ?? dimensions.coverageState,
          },
          { sendBeforeUnload: true },
        );
      }
    };
    root?.addEventListener('click', click);
    return () => { root?.removeEventListener('click', click); };
  }, [dimensions, resultCount, outcome]);
  return null;
}
