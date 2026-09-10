import type { SearchCapabilityState } from './contract';

export type InvestorSearchCapability = { key: string; label: string; supportState: SearchCapabilityState; coverage: string; sources: string[]; limitations: string[] };

export const INVESTOR_SEARCH_CAPABILITIES: InvestorSearchCapability[] = [
  { key: 'sec_iard_roster', label: 'SEC/IARD current roster', supportState: 'KNOWN', coverage: 'Accepted current RIA and ERA firm roster', sources: ['SEC/IARD Form ADV'], limitations: ['Public profile publication is separately gated.'] },
  { key: 'principal_office', label: 'Principal-office geography', supportState: 'KNOWN', coverage: 'State, city and ZIP where reported', sources: ['SEC/IARD Form ADV'], limitations: ['Not client geography or service territory.'] },
  { key: 'nj_state_ria', label: 'New Jersey state-RIA roster', supportState: 'REQUEST_ONLY', coverage: 'Complete roster not acquired', sources: ['NJ Bureau of Securities'], limitations: ['Principal-office results are not a state-registration roster.'] },
  { key: 'ca_state_ria', label: 'California state-RIA roster', supportState: 'NOT_ACQUIRED', coverage: 'Complete current roster not acquired', sources: ['California DFPI'], limitations: ['Missing coverage is not zero.'] },
  { key: 'co_state_ria', label: 'Colorado state-RIA roster', supportState: 'PARTIAL', coverage: 'IAPD state compilation published on /colorado; not a Search V1 firm filter', sources: ['IAPD IA_FIRM_STATE_Feed_08_27_2026'], limitations: ['Search V1 does not execute the 740 approved state-IA firms as a roster query. The 589 principal-office overlay is a different grain.'] },
  { key: 'va_state_ria', label: 'Virginia state-RIA roster', supportState: 'PARTIAL', coverage: 'IAPD state compilation published on /virginia; not a Search V1 firm filter', sources: ['IAPD IA_FIRM_STATE_Feed_08_27_2026'], limitations: ['Search V1 does not execute the 697 approved state-IA firms as a roster query. The 339 principal-office overlay is a different grain. 4,481 2025 SCC activity approvals are not this universe.'] },
  { key: 'client_service_area', label: 'Client/service geography', supportState: 'UNSUPPORTED', coverage: 'Not established by current roster', sources: [], limitations: ['Principal office does not establish clients served.'] },
  { key: 'historical_adv_diff', label: 'Historical Form ADV field differences', supportState: 'UNSUPPORTED', coverage: 'Current filing fields only', sources: ['SEC/IARD Form ADV'], limitations: ['Filing dates are not field-level change histories.'] },
  { key: 'ownership_control', label: 'Ownership/control observations', supportState: 'PARTIAL', coverage: 'Firm-specific source observations where published', sources: ['Form ADV Schedule A/B'], limitations: ['Not a complete beneficial-ownership conclusion.'] },
  { key: 'disclosures', label: 'Disclosure/regulatory evidence', supportState: 'PARTIAL', coverage: 'Only identity-linked published evidence', sources: ['Form ADV', 'state sources'], limitations: ['Missing evidence is not a clean history.'] },
];
