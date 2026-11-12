export const TRUSTHUB_HUB = 'investor' as const;

export const TRUSTHUB_EVENTS = {
  SEARCH_SUBMITTED: 'search_submitted',
  SEARCH_RESULTS_RETURNED: 'search_results_returned',
  SEARCH_RESULT_OPENED: 'search_result_opened',
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_SAVED: 'profile_saved',
  PROFILE_SAVE_FAILED: 'profile_save_failed',
  PROFILE_UNSAVED: 'profile_unsaved',
  CLAIM_STARTED: 'claim_started',
  PAGEVIEW: '$pageview',
} as const;

export type TrustHubEventName = (typeof TRUSTHUB_EVENTS)[keyof typeof TRUSTHUB_EVENTS];

export const TRUSTHUB_SURFACES = [
  'app_router',
  'specialist_search',
  'firm_directory',
  'firm_profile',
  'professional_profile',
] as const;

export type TrustHubSurface = (typeof TRUSTHUB_SURFACES)[number];

export const PROFILE_CLASSES = [
  'official_firm',
  'state_adviser_firm',
  'synthetic_firm',
  'synthetic_professional',
] as const;

export type ProfileClass = (typeof PROFILE_CLASSES)[number];
