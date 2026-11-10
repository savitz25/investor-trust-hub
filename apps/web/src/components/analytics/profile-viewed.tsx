'use client';

import { useEffect } from 'react';
import { captureTrustEvent } from '@/lib/analytics/trusthub';
import { TRUSTHUB_EVENTS, type ProfileClass, type TrustHubSurface } from '@/lib/analytics/trusthub-events';

export function ProfileViewed({
  surface,
  profileClass,
  state,
}: {
  surface: Extract<TrustHubSurface, 'firm_profile' | 'professional_profile'>;
  profileClass: ProfileClass;
  state?: string;
}) {
  useEffect(() => {
    captureTrustEvent(TRUSTHUB_EVENTS.PROFILE_VIEWED, {
      surface,
      profile_class: profileClass,
      success: true,
      state,
    });
  }, [surface, profileClass, state]);
  return null;
}
