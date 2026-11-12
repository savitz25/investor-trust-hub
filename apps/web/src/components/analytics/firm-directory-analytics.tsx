'use client';

import { useEffect } from 'react';
import { boundedStateToken } from '@/lib/analytics/privacy';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

export function FirmDirectoryAnalytics({
  searched,
  resultCount,
  success,
  state,
  capabilityState,
}: {
  searched: boolean;
  resultCount?: number;
  success: boolean;
  state?: string;
  capabilityState?: string;
}) {
  useEffect(() => {
    if (!searched) return;
    captureTrustEvent(TRUSTHUB_EVENTS.SEARCH_RESULTS_RETURNED, {
      surface: 'firm_directory',
      result_count: resultCount,
      success,
      state,
      capability_state: capabilityState,
    });
  }, [searched, resultCount, success, state, capabilityState]);

  useEffect(() => {
    const forms = document.querySelectorAll<HTMLFormElement>('form[action="/firms"]');
    const onSubmit = (event: Event) => {
      const form = event.currentTarget;
      if (!(form instanceof HTMLFormElement)) return;
      captureTrustEvent(
        TRUSTHUB_EVENTS.SEARCH_SUBMITTED,
        {
          surface: 'firm_directory',
          success: true,
          state: boundedStateToken(String(new FormData(form).get('state') ?? '')),
        },
        { sendBeforeUnload: true },
      );
    };
    const root = document.querySelector('[data-firm-results]');
    const onClick = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest('a[data-search-result]') : null;
      if (!target) return;
      captureTrustEvent(
        TRUSTHUB_EVENTS.SEARCH_RESULT_OPENED,
        {
          surface: 'firm_directory',
          success: true,
          state,
          capability_state: capabilityState,
        },
        { sendBeforeUnload: true },
      );
    };
    forms.forEach((form) => form.addEventListener('submit', onSubmit));
    root?.addEventListener('click', onClick);
    return () => {
      forms.forEach((form) => form.removeEventListener('submit', onSubmit));
      root?.removeEventListener('click', onClick);
    };
  }, [state, capabilityState]);

  return null;
}
