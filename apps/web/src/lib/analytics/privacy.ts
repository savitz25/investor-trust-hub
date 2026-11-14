/**
 * InvestorTrustHub analytics privacy.
 * Raw search text is never an event property. URL copies are stripped in before_send.
 */

const ANALYTICS_URL_BASE = 'https://www.investortrusthub.com';

/** Query keys that carry free text, credentials, or identity. Always removed. */
export const FREE_TEXT_QUERY_KEYS = [
  'q',
  'query',
  'question',
  'search',
  'text',
  'prompt',
  'identity',
  'selected',
  'name',
  'email',
  'token',
  'code',
  'password',
  'access_token',
  'refresh_token',
  'session',
  'note',
  'notes',
  'body',
  'message',
  'otp',
  'auth_error',
  'error',
  'error_code',
  'error_description',
  'error_uri',
  'handoff',
  'utm_term',
] as const;

/** Structured filters and campaign ids. Kept even when the value contains spaces. */
const STRUCTURED_QUERY_KEYS = new Set([
  'page',
  'state',
  'firmtype',
  'raum',
  'compensation',
  'sort',
  'broaden',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
]);

const SENSITIVE_QUERY_KEY_PATTERN = /token|email|code|password|note|error|handoff|secret|otp|query|question|identity|prompt/i;

export function isFreeTextQueryKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (STRUCTURED_QUERY_KEYS.has(lower)) return false;
  if ((FREE_TEXT_QUERY_KEYS as readonly string[]).includes(lower)) return true;
  return SENSITIVE_QUERY_KEY_PATTERN.test(key);
}

function isFreeTextQueryValue(key: string, value: string): boolean {
  if (isFreeTextQueryKey(key)) return true;
  if (STRUCTURED_QUERY_KEYS.has(key.toLowerCase())) return false;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return /\s/.test(decoded) || decoded.length > 64;
}

export const FORBIDDEN_EVENT_KEYS = [
  'q',
  'query',
  'question',
  'search',
  'text',
  'prompt',
  'identity',
  'selected',
  'email',
  'name',
  'first_name',
  'last_name',
  'phone',
  'address',
  'ssn',
  'password',
  'token',
  'authorization',
  'cookie',
  'nmls',
  'usdot',
  'ccn',
  'crd',
  'npn',
  'note',
  'notes',
  'body',
  'message',
  'href',
  'url',
  'input_value',
  '$input_value',
] as const;

/** SDK ingest fields. Stripping `token` makes posthog-js drop the event. */
export const POSTHOG_RESERVED_KEYS = [
  'token',
  'distinct_id',
  'timestamp',
  'uuid',
  'event',
  'offset',
  'api_key',
] as const;

export function isPosthogReservedKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith('$') && lower !== '$input_value') return true;
  return (POSTHOG_RESERVED_KEYS as readonly string[]).includes(lower);
}

const URL_PROPERTY_KEYS = [
  '$current_url',
  '$session_entry_url',
  '$referrer',
  '$initial_current_url',
  '$entry_current_url',
  '$initial_referrer',
  '$session_entry_referrer',
  '$prev_pageview_url',
] as const;

const STATE_CODE = /^[A-Za-z]{2}$/;

export function boundedStateToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === '_none') return '_none';
  if (trimmed.toLowerCase() === 'none') return 'none';
  if (STATE_CODE.test(trimmed)) return trimmed.toUpperCase();
  return undefined;
}

const CAPABILITY_STATES = new Set([
  'COMPLETE',
  'NO_MATCH',
  'NEEDS_CLARIFICATION',
  'UNSUPPORTED',
  'INVALID_INPUT',
  'KNOWN',
  'UNKNOWN',
  'PARTIAL',
  'NOT_ACQUIRED',
  'REQUEST_ONLY',
  'unavailable',
]);

export function boundedCapabilityState(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return CAPABILITY_STATES.has(trimmed) ? trimmed : undefined;
}

export function boundedResultCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(1_000_000, Math.round(value));
}

export function sanitizeAnalyticsUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw, ANALYTICS_URL_BASE);
    for (const key of [...url.searchParams.keys()]) {
      const value = url.searchParams.get(key) ?? '';
      if (isFreeTextQueryValue(key, value)) url.searchParams.delete(key);
    }
    url.hash = '';
    url.username = '';
    url.password = '';
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

/** `$pathname` is a path. A query string copied onto it is stripped, not kept as the path. */
export function sanitizePathname(raw: string | undefined | null): string {
  if (!raw) return '/';
  const withoutHash = raw.split('#')[0] || '/';
  if (withoutHash.includes('://') || withoutHash.includes('?')) {
    const cleaned = sanitizeAnalyticsUrl(withoutHash.startsWith('/') ? `${ANALYTICS_URL_BASE}${withoutHash}` : withoutHash);
    if (!cleaned) return withoutHash.split('?')[0] || '/';
    try {
      return new URL(cleaned).pathname || '/';
    } catch {
      return withoutHash.split('?')[0] || '/';
    }
  }
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
}

export function searchRouteTitle(path: string): string | undefined {
  const pathname = sanitizePathname(path);
  if (pathname === '/ask' || pathname.startsWith('/ask/')) return 'Ask InvestorTrustHub';
  if (pathname === '/firms' || pathname.startsWith('/firms/')) return 'Investment firms';
  if (pathname === '/search' || pathname.startsWith('/search/')) return 'InvestorTrustHub';
  return undefined;
}

function sanitizeUrlProperties(target: Record<string, unknown>): void {
  for (const key of URL_PROPERTY_KEYS) {
    if (typeof target[key] === 'string') target[key] = sanitizeAnalyticsUrl(target[key] as string);
  }
  if (typeof target.$pathname === 'string') target.$pathname = sanitizePathname(target.$pathname as string);
}

const AUTOCAPTURE_URL_KEYS = ['$external_click_url', '$el_href', 'attr__href', 'attr__action', 'attr__formaction', 'attr__src'] as const;

export function redactSensitiveParamsInText(text: string): string {
  return text.replace(/([?&]|&amp;)([^=&;"'\s]+)=([^&;"'\s]*)/g, (match, lead: string, key: string) => {
    let decoded = key;
    try {
      decoded = decodeURIComponent(key);
    } catch {
      decoded = key;
    }
    return isFreeTextQueryKey(decoded) ? `${lead}${key}=[redacted]` : match;
  });
}

function sanitizeAutocaptureUrls(properties: Record<string, unknown>): void {
  for (const key of AUTOCAPTURE_URL_KEYS) {
    if (typeof properties[key] === 'string') {
      properties[key] = sanitizeAnalyticsUrl(properties[key] as string) ?? '[redacted]';
    }
  }
  if (typeof properties.$elements_chain === 'string') {
    properties.$elements_chain = redactSensitiveParamsInText(properties.$elements_chain);
  }
  if (typeof properties.$input_value === 'string') delete properties.$input_value;
  if (Array.isArray(properties.$elements)) {
    for (const element of properties.$elements) {
      if (!element || typeof element !== 'object') continue;
      const record = element as Record<string, unknown>;
      for (const key of AUTOCAPTURE_URL_KEYS) {
        if (typeof record[key] === 'string') record[key] = sanitizeAnalyticsUrl(record[key] as string) ?? '[redacted]';
      }
      if (typeof record.href === 'string') record.href = sanitizeAnalyticsUrl(record.href) ?? '[redacted]';
      const tag = String(record.tag_name || record.tag || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        delete record.$el_text;
        delete record.text;
        delete record.value;
        delete record.attr__value;
        delete record.attr__placeholder;
      }
    }
  }
}

function sanitizeReplaySnapshot(node: unknown, depth = 0): void {
  if (depth > 8 || node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) sanitizeReplaySnapshot(item, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const href = obj.href;
  if (typeof href === 'string') {
    const cleaned = sanitizeAnalyticsUrl(href) ?? href.split('?')[0] ?? href;
    obj.href = cleaned;
    const title = searchRouteTitle(cleaned);
    if (title && typeof obj.title === 'string') obj.title = title;
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') sanitizeReplaySnapshot(value, depth + 1);
  }
}

/** Autocapture element fields that can echo user-entered text (labels, values, tooltips). */
const AUTOCAPTURE_TEXT_KEYS = [
  '$el_text',
  'text',
  'attr__aria-label',
  'attr__title',
  'attr__value',
  'attr__placeholder',
  'attr__alt',
] as const;

const ELEMENTS_CHAIN_TEXT_PATTERN = /(?<=[:"])(?:text|attr__aria-label|attr__title|attr__value|attr__placeholder|attr__alt)="(?:[^"\\]|\\.)*"/g;

/** Session replay / heatmap events. Replay is disabled for this hub; before_send drops these. */
export const REPLAY_EVENT_NAMES = ['$snapshot', '$snapshot_items', '$heatmap', '$$heatmap'] as const;

export function isReplayEvent(event: string | undefined | null): boolean {
  return typeof event === 'string' && (REPLAY_EVENT_NAMES as readonly string[]).includes(event);
}

export function stripElementsChainText(chain: string): string {
  return chain.replace(ELEMENTS_CHAIN_TEXT_PATTERN, '');
}

function stripAutocaptureText(properties: Record<string, unknown>): void {
  delete properties.$el_text;
  if (typeof properties.$elements_chain === 'string') {
    properties.$elements_chain = stripElementsChainText(properties.$elements_chain);
  }
  if (Array.isArray(properties.$elements)) {
    for (const element of properties.$elements) {
      if (!element || typeof element !== 'object') continue;
      const record = element as Record<string, unknown>;
      for (const key of AUTOCAPTURE_TEXT_KEYS) delete record[key];
    }
  }
}

export function sanitizePageviewProperties(properties: Record<string, unknown>): Record<string, unknown> {
  sanitizeUrlProperties(properties);
  for (const bag of ['$set', '$set_once']) {
    const nested = properties[bag];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) sanitizeUrlProperties(nested as Record<string, unknown>);
  }
  sanitizeReplaySnapshot(properties.$snapshot_data);
  stripAutocaptureText(properties);
  sanitizeAutocaptureUrls(properties);
  const path = String(properties.$pathname || properties.$current_url || '');
  const title = searchRouteTitle(path);
  if (title) {
    properties.$title = title;
    properties.title = title;
    properties.$document_title = title;
  }
  for (const key of Object.keys(properties)) {
    if (isPosthogReservedKey(key)) continue;
    if ((FORBIDDEN_EVENT_KEYS as readonly string[]).includes(key.toLowerCase())) delete properties[key];
  }
  return properties;
}

/** `$exception` autocapture is never sent. Any `$exception_list` is removed. */
export function suppressExceptionCapture<
  T extends { event?: string; properties?: Record<string, unknown> } | null,
>(event: T): T | null {
  if (!event) return event;
  if (event.properties && '$exception_list' in event.properties) {
    delete event.properties.$exception_list;
  }
  if (event.event === '$exception') return null;
  return event;
}

export function sanitizeCaptureResult<
  T extends {
    properties?: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  } | null,
>(event: T): T {
  if (!event) return event;
  if (event.properties) sanitizePageviewProperties(event.properties);
  if (event.$set) sanitizeUrlProperties(event.$set);
  if (event.$set_once) sanitizeUrlProperties(event.$set_once);
  return event;
}

export function sanitizeCapturedNetworkRequest<T extends { name?: string }>(request: T): T {
  if (typeof request.name === 'string') {
    request.name = sanitizeAnalyticsUrl(request.name) ?? request.name.split('?')[0] ?? request.name;
  }
  return request;
}

export function stripForbiddenProperties(
  props: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  if (!props) return cleaned;
  for (const [key, value] of Object.entries(props)) {
    const lower = key.toLowerCase();
    if (!isPosthogReservedKey(key) && (FORBIDDEN_EVENT_KEYS as readonly string[]).includes(lower)) continue;
    if (!key.startsWith('$') && /email|password|token|ssn|phone|nmls|usdot|ccn|crd/.test(lower)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      if (value.length > 300 && !key.startsWith('$')) continue;
      cleaned[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
