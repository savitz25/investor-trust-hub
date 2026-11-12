'use client';
import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import { boundedStateToken } from '@/lib/analytics/privacy';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS } from '@/lib/analytics/trusthub-events';

export function SearchShellAnalytics() {
  useEffect(() => {
    const forms = new Set<HTMLFormElement>([
      ...document.querySelectorAll<HTMLFormElement>('form[data-specialist-search]'),
      ...document.querySelectorAll<HTMLFormElement>('form[action="/ask"]'),
    ]);
    const submit = (event: Event) => {
      const form = event.currentTarget;
      if (form instanceof HTMLFormElement && form.hasAttribute('data-specialist-search')) {
        track('specialist_search_submit', { hub: 'investor' });
      }
      captureTrustEvent(
        TRUSTHUB_EVENTS.SEARCH_SUBMITTED,
        {
          surface: 'specialist_search',
          success: true,
          state: form instanceof HTMLFormElement ? boundedStateToken(String(new FormData(form).get('state') ?? '')) : undefined,
        },
        { sendBeforeUnload: true },
      );
    };
    forms.forEach((form) => form.addEventListener('submit', submit));
    return () => forms.forEach((form) => form.removeEventListener('submit', submit));
  }, []);
  return null;
}
