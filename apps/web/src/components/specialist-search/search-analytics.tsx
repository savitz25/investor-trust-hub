'use client';
import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';
import { resultCountBucket, type InvestorSearchAnalytics } from '@/lib/specialist-search/analytics';

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
    track('specialist_search_interpreted', dimensions);
    track(resultCount ? 'specialist_search_results' : 'specialist_search_zero_results', { ...dimensions, resultCountBucket: resultCountBucket(resultCount) });
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
      if (action === 'refine' || action === 'profile_open') track(`specialist_search_${action}`, dimensions);
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
    const toggle = (event: Event) => {
      const details = event.target instanceof HTMLDetailsElement ? event.target : null;
      if (details?.open && details.dataset.specialistEvent === 'trace_open') track('specialist_search_trace_open', dimensions);
    };
    root?.addEventListener('click', click);
    root?.addEventListener('toggle', toggle, true);
    return () => { root?.removeEventListener('click', click); root?.removeEventListener('toggle', toggle, true); };
  }, [dimensions, resultCount, outcome]);
  return null;
}
