'use client';

import type { CaptureResult, PostHog } from 'posthog-js';
import { analyticsEnvironment, posthogHost, posthogKey, shouldEnablePosthog } from './environment';
import { createPosthogClientGate } from './posthog-gate';
import { isReplayEvent, sanitizeCaptureResult, sanitizeCapturedNetworkRequest } from './privacy';
import { TRUSTHUB_HUB } from './trusthub-events';

const FREE_TEXT_URL_KEYS = [
  'q',
  'query',
  'question',
  'search',
  'text',
  'prompt',
  'identity',
  'selected',
  'email',
  'token',
  'code',
  'password',
  'note',
  'notes',
  'message',
  'handoff',
  'utm_term',
];

function sanitizeEvent(event: CaptureResult): CaptureResult | null {
  // Replay is disabled; drop any replay payload outright as defense in depth.
  if (event && isReplayEvent(event.event)) return null;
  try {
    sanitizeCaptureResult(event as CaptureResult & { properties?: Record<string, unknown> });
    return event;
  } catch {
    try {
      const properties = event.properties;
      for (const key of ['$current_url', '$session_entry_url', '$referrer', '$pathname']) {
        if (typeof properties[key] === 'string') properties[key] = String(properties[key]).split('?')[0];
      }
      return event;
    } catch {
      return null;
    }
  }
}

async function loadPosthog(): Promise<PostHog | null> {
  if (!shouldEnablePosthog()) return null;
  const posthog = (await import('posthog-js')).default;
  posthog.init(posthogKey(), {
    api_host: posthogHost(),
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    // Privacy: replay DOM snapshots can carry search text echoed into Ask results,
    // page titles and query-bearing links, so session replay is off for this hub
    // regardless of the shared project setting. Heatmaps and dead-click capture
    // are off for the same reason.
    disable_session_recording: true,
    enable_heatmaps: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    // Autocapture never collects element text (button/link labels can echo a query).
    mask_all_text: true,
    // Inputs are not autocapture targets, and value capture is disabled.
    // Visitors stay anonymous. Never call identify() with an email.
    autocapture: {
      capture_copied_text: false,
      capture_value_css_selector_allowlist: [],
      element_allowlist: ['a', 'button', 'form'],
      element_attribute_ignorelist: ['value', 'placeholder'],
    },
    mask_personal_data_properties: true,
    custom_personal_data_properties: FREE_TEXT_URL_KEYS,
    before_send: sanitizeEvent,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        text: true,
        search: true,
        tel: true,
        url: true,
        textarea: true,
        select: true,
        number: true,
      },
      // Only relevant if replay is ever re-enabled in code: mask every text node.
      maskTextSelector: '*',
      maskCapturedNetworkRequestFn: (request) => sanitizeCapturedNetworkRequest(request),
    },
    loaded: (instance) => {
      instance.register({
        hub: TRUSTHUB_HUB,
        environment: analyticsEnvironment(),
      });
    },
  });
  return posthog;
}

const gate = createPosthogClientGate(loadPosthog);

export async function getPosthogBrowser(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null;
  if (!shouldEnablePosthog()) return null;
  return gate.get();
}
