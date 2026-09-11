import { describe, expect, it } from 'vitest';
import { INVESTOR_SEARCH_GOLDEN_QUESTIONS, interpretInvestorAskQuery } from '@ith/domain';
import { INVESTOR_SEARCH_CAPABILITIES } from '../src/lib/specialist-search/capabilities';
import { SPECIALIST_SEARCH_ANALYTICS_EVENTS, SPECIALIST_SEARCH_VERSION } from '../src/lib/specialist-search/contract';

describe('TH-SEARCH-001F', () => {
  it('implements the portable network contract and capability states', () => {
    expect(SPECIALIST_SEARCH_VERSION).toBe('trusthub-specialist-search-v1');
    expect(SPECIALIST_SEARCH_ANALYTICS_EVENTS).toHaveLength(7);
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'nj_state_ria')?.supportState).toBe('REQUEST_ONLY');
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'ca_state_ria')?.supportState).toBe('NOT_ACQUIRED');
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'co_state_ria')?.supportState).toBe('PARTIAL');
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'va_state_ria')?.supportState).toBe('PARTIAL');
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'ny_state_ria')?.supportState).toBe('PARTIAL');
    expect(interpretInvestorAskQuery('Colorado state RIAs').query.mode).toBe('fail_closed');
    expect(interpretInvestorAskQuery('Colorado state RIAs').query.failReason).toMatch(/does not treat the 589/i);
    expect(INVESTOR_SEARCH_CAPABILITIES.find((x) => x.key === 'client_service_area')?.supportState).toBe('UNSUPPORTED');
  });
  it('has a 90+ question corpus with no expected failures', () => {
    expect(INVESTOR_SEARCH_GOLDEN_QUESTIONS.length).toBeGreaterThanOrEqual(90);
    expect(INVESTOR_SEARCH_GOLDEN_QUESTIONS.filter((x) => x.expected === 'FAIL')).toHaveLength(0);
    for (const item of INVESTOR_SEARCH_GOLDEN_QUESTIONS) expect(interpretInvestorAskQuery(item.query).raw.length).toBeLessThanOrEqual(400);
  });
  it('preserves exact identity and epistemic boundaries', () => {
    expect(interpretInvestorAskQuery('SEC file 801-11953').query.identifier).toEqual({ type: 'sec_file_number', value: '801-11953' });
    expect(interpretInvestorAskQuery('IAR CRD 123456').query.mode).toBe('fail_closed');
    expect(interpretInvestorAskQuery('New Jersey state RIAs').query.failReason).toMatch(/request-only/i);
    expect(interpretInvestorAskQuery('California state RIAs').query.failReason).toMatch(/not acquired/i);
    expect(interpretInvestorAskQuery('Vanguard').query.nameQuery).toBe('Vanguard');
    expect(interpretInvestorAskQuery('best financial adviser').query.mode).toBe('fail_closed');
    expect(interpretInvestorAskQuery('adviser with no disclosures').query.failReason).toMatch(/cannot establish a clean history/i);
    expect(interpretInvestorAskQuery('I want to check the adviser who wants to manage my money').query.failReason).toMatch(/specific adviser/i);
    expect(interpretInvestorAskQuery('ownership evidence for an adviser').query.failReason).toMatch(/firm-specific/i);
    expect(interpretInvestorAskQuery('firms affiliated with broker-dealers').query.affiliationField).toBe('affiliation_broker_dealer');
  });
});
