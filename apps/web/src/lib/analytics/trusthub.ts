'use client';

import { analyticsEnvironment, shouldEnablePosthog } from './environment';
import { getPosthogBrowser } from './posthog-browser';
import {
  boundedCapabilityState,
  boundedResultCount,
  boundedStateToken,
  sanitizeAnalyticsUrl,
  sanitizePathname,
  stripForbiddenProperties,
} from './privacy';
import {
  PROFILE_CLASSES,
  TRUSTHUB_HUB,
  TRUSTHUB_SURFACES,
  type TrustHubEventName,
  type TrustHubSurface,
} from './trusthub-events';

export type TrustHubCaptureOptions = {
  /** Use before a GET navigation. Does not sleep. */
  sendBeforeUnload?: boolean;
};

const SURFACES = new Set<string>(TRUSTHUB_SURFACES);
const CLASSES = new Set<string>(PROFILE_CLASSES);

export function prepareTrustProperties(
  extra?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const draft: Record<string, unknown> = {
    hub: TRUSTHUB_HUB,
    environment: analyticsEnvironment(),
  };
  if (extra) {
    if (typeof extra.surface === 'string' && SURFACES.has(extra.surface)) draft.surface = extra.surface;
    if (typeof extra.success === 'boolean') draft.success = extra.success;
    const state = boundedStateToken(extra.state);
    if (state) draft.state = state;
    const capability = boundedCapabilityState(extra.capability_state);
    if (capability) draft.capability_state = capability;
    const count = boundedResultCount(extra.result_count);
    if (count !== undefined) draft.result_count = count;
    if (typeof extra.profile_class === 'string' && CLASSES.has(extra.profile_class)) {
      draft.profile_class = extra.profile_class;
    }
    if (typeof extra.$pathname === 'string') draft.$pathname = sanitizePathname(extra.$pathname);
    if (typeof extra.$current_url === 'string') {
      const url = sanitizeAnalyticsUrl(extra.$current_url);
      if (url) draft.$current_url = url;
    }
  }
  return stripForbiddenProperties(draft);
}

export function captureTrustEvent(
  event: TrustHubEventName | string,
  properties?: Record<string, unknown>,
  options?: TrustHubCaptureOptions,
): void {
  try {
    if (!shouldEnablePosthog()) return;
    const payload = prepareTrustProperties(properties);
    void getPosthogBrowser()
      .then((posthog) => {
        if (!posthog) return;
        if (options?.sendBeforeUnload) {
          posthog.capture(event, payload, { send_instantly: true, transport: 'sendBeacon' });
          return;
        }
        posthog.capture(event, payload);
      })
      .catch(() => undefined);
  } catch {
    // Observability must never break a research flow.
  }
}

let lastPageviewPath = '';

export function captureSanitizedPageview(pathname: string, href?: string): void {
  try {
    const path = sanitizePathname(pathname);
    if (lastPageviewPath === path) return;
    lastPageviewPath = path;
    captureTrustEvent('$pageview', {
      surface: 'app_router' satisfies TrustHubSurface,
      $pathname: path,
      $current_url: href || pathname,
    });
  } catch {
    // ignore
  }
}

export function resetPageviewDedupeForTests(): void {
  lastPageviewPath = '';
}
