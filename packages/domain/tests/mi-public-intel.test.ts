import { describe, expect, it } from 'vitest';
import { assertMichiganPublicIntel, interpretInvestorAskQuery, MI_IAPD_LENSES, MI_SECURITIES_ORDERS } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value).query;

describe('MI-INV-001 Michigan evidence', () => {
  it('keeps exact firm CRD lenses separate and adverse attachments absent', () => {
    expect(assertMichiganPublicIntel().orders.rows).toHaveLength(107);
    expect(MI_IAPD_LENSES.stateIa.approvedDistinctFirmCrd).toBe(574);
    expect(MI_IAPD_LENSES.era.activeDistinctFirmCrd).toBe(75);
    expect(MI_IAPD_LENSES.federalNotice.filedDistinctFirmCrd).toBe(2453);
    expect(MI_IAPD_LENSES.principalOffice.distinctFirmCrd).toBe(332);
    expect(MI_IAPD_LENSES.exactCrdIntersections.stateIaApprovedAndNoticeFiled).toHaveLength(5);
    expect(MI_SECURITIES_ORDERS.exactFirmCrdCrosswalks).toBe(2);
    expect(MI_SECURITIES_ORDERS.exactFirmEvidenceAttachments).toBe(0);
    expect(MI_SECURITIES_ORDERS.nameOnlyAttachments).toBe(0);
  });

  it('routes Michigan classes and city context without a city page or false total', () => {
    for (const q of ['investment adviser Michigan', 'RIA Michigan', 'state registered adviser Michigan']) {
      const result = ask(q);
      expect(result.mode, q).toBe('fail_closed');
      expect(result.failReason, q).toMatch(/574 Michigan state IA/);
      expect(result.failReason, q).toMatch(/must not be summed/);
    }
    expect(ask('ERA Michigan').failReason).toMatch(/75 Michigan ACTIVE ERA/);
    expect(ask('federal covered adviser Michigan').failReason).toMatch(/2,453 Michigan FILED federal notice/);
    expect(ask('principal office adviser Michigan').failReason).toMatch(/332 firm CRDs/);
    expect(ask('broker dealer Michigan').failReason).toMatch(/Michigan-only bulk rosters were not acquired/);
    expect(ask('securities agent Michigan').failReason).toMatch(/person grains/);
    expect(ask('Michigan securities enforcement').failReason).toMatch(/107 MUSA-tagged documents/);
    expect(ask('Michigan securities complaints').failReason).toMatch(/Provider-level complaint cases and outcomes were not acquired/);
    for (const city of ['Detroit', 'Grand Rapids', 'Lansing', 'Ann Arbor']) {
      expect(ask(`${city} investment adviser`).failReason, city).toMatch(/no city securities route/);
    }
  });

  it('puts labeled firm identifiers first and refuses rankings', () => {
    expect(ask('CRD 309666 Michigan').identifier).toEqual({ type: 'crd', value: '309666' });
    expect(ask('SEC 801-12345 Michigan').identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(ask('309666').mode).toBe('fail_closed');
    for (const q of ['best adviser Michigan', 'safest adviser Michigan', 'recommended adviser Michigan', 'most trustworthy adviser Michigan', 'highest rated adviser Michigan', 'top-rated adviser Michigan', '#1 adviser Michigan', 'Trust Score Michigan adviser', 'AggregateRating Michigan adviser', 'paid ranking Michigan adviser', 'sponsored ranking Michigan adviser']) {
      expect(ask(q).failReason, q).toMatch(/does not rank advisers/);
    }
    expect(ask('best adviser CRD 309666 Michigan').failReason).toMatch(/does not rank advisers/);
    expect(ask('best adviser reporting performance-based fees Michigan').failReason).toMatch(/does not rank advisers/);
    expect(ask('firms reporting performance-based fees').failReason ?? '').not.toMatch(/does not rank advisers/);
  });
});
