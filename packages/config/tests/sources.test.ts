import { describe, expect, it } from 'vitest';
import {
  BROKERCHECK_SEPARATION_RULE,
  SOURCE_SYSTEMS,
  getSourceSystem,
  isProspectingProhibited,
} from '../src/sources';

describe('regulatory source registry', () => {
  it('registers the planned official systems as configuration, not ingest', () => {
    const ids = SOURCE_SYSTEMS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'iapd',
        'form_adv',
        'brokercheck',
        'edgar',
        'sec_investment_company',
        'nfa_basic',
        'cftc',
      ]),
    );
  });

  it('keeps BrokerCheck logically non-prospecting', () => {
    expect(isProspectingProhibited('brokercheck')).toBe(true);
    expect(getSourceSystem('brokercheck')?.marketingRestricted).toBe(true);
    expect(BROKERCHECK_SEPARATION_RULE.toLowerCase()).toContain('prospecting');
  });

  it('does not hard-code a single regulator as the application core', () => {
    const authorities = new Set(SOURCE_SYSTEMS.map((s) => s.authorityId));
    expect(authorities.has('sec')).toBe(true);
    expect(authorities.has('finra')).toBe(true);
    expect(authorities.has('nfa')).toBe(true);
    expect(authorities.size).toBeGreaterThan(3);
  });
});
