import { SOURCE_SYSTEMS } from '@ith/config';
import type { InvestorResearchQuery } from '@ith/domain';
export const INVESTOR_OFFICIAL_RESEARCH = {
  agency: 'SEC / IAPD',
  jurisdiction: 'US',
  purpose: 'Official adviser firm identity, Form ADV and available public disclosures',
  url: SOURCE_SYSTEMS.find((s) => s.id === 'iapd')!.officialUrl,
  checkedAt: '2026-09-12',
  deepLink: false,
  limitation:
    'This link does not mean InvestorTrustHub checked current status live. Choose Firm and search the sourced CRD or firm name.',
};
export function researchRecovery(q: InvestorResearchQuery) {
  const routes: Record<string, string> = {
    NY: '/new-york',
    VA: '/virginia',
    CO: '/colorado',
    TX: '/texas',
    FL: '/florida',
    NJ: '/new-jersey',
    CA: '/california',
    WA: '/washington',
    AZ: '/arizona',
  };
  const state = q.registrationJurisdictions?.length === 1 ? q.registrationJurisdictions[0] : undefined;
  return state && routes[state]
    ? {
        href: routes[state],
        label: `Open ${state} state-registration research`,
        limitation:
          'State intelligence is separate from this requested office-filtered firm cohort; additional office criteria are not applied by this navigation.',
      }
    : undefined;
}
