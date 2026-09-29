import { describe, expect, it } from 'vitest';
import { IN_IAPD_LENSES, IN_SECURITIES_ORDERS, assertIndianaPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('IN-INV-001 Indiana securities evidence', () => {
  it('keeps the four IAPD lenses and the action index as separate grains', () => {
    expect(assertIndianaPublicIntel()).toBe(true);
    expect(IN_IAPD_LENSES.stateFeed.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(IN_IAPD_LENSES.secFeed.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(IN_IAPD_LENSES.stateIa.approvedDistinctFirmCrd).toBe(369);
    expect(IN_IAPD_LENSES.era.activeDistinctFirmCrd).toBe(22);
    expect(IN_IAPD_LENSES.federalNotice.filedDistinctFirmCrd).toBe(2008);
    expect(IN_IAPD_LENSES.principalOffice.distinctFirmCrd).toBe(160);
    expect(IN_IAPD_LENSES.dedupedIndianaAdvisers).toBeNull();
    expect(IN_SECURITIES_ORDERS.rowCount).toBe(65);
    expect(IN_SECURITIES_ORDERS.exactFirmCrdLinks).toBe(5);
    expect(IN_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(IN_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
  });

  it('routes Indiana state and city questions without city pages', () => {
    for (const q of ['investment adviser Indiana', 'RIA Indiana', 'state registered adviser Indiana']) expect(ask(q).query.failReason, q).toMatch(/369 Indiana state-registered IA firm CRDs/);
    expect(ask('federal covered adviser Indiana').query.failReason).toMatch(/2,?008 firms with a FILED Indiana notice|2008 firms/);
    expect(ask('ERA Indiana').query.failReason).toMatch(/22 active Indiana exempt reporting/);
    expect(ask('principal office adviser Indiana').query.failReason).toMatch(/160 Indiana principal-office/);
    expect(ask('broker dealer Indiana').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('securities agent Indiana').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('Indiana securities enforcement').query.failReason).toMatch(/65 securities administrative actions/);
    expect(ask('Indiana securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('Indiana securities examination').query.failReason).toMatch(/provider-level outcomes were not acquired/);
    for (const city of ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend']) expect(ask(`adviser ${city}`).query.failReason, city).toMatch(/no city securities route/);
  });

  it('preserves exact identifiers, Indiana SEC handoff, bare-digit and ranking safety', () => {
    expect(ask('CRD 6413 Indiana insurance').query.identifier).toEqual({ type: 'crd', value: '6413' });
    const sec = ask('SEC 801-12345 Indiana contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub Indiana'))).toBe(true);
    expect(ask('6413').query.mode).toBe('fail_closed');
    for (const q of ['best adviser Indiana', 'safest adviser Indiana', 'recommended adviser Indiana', 'most trustworthy adviser Indiana', 'top-rated adviser Indiana', 'highest-rated adviser Indiana', '#1 adviser Indiana', 'Trust Score Indiana adviser', 'AggregateRating Indiana adviser', 'ratingValue Indiana adviser', 'paid ranking Indiana adviser', 'sponsored ranking Indiana adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
    expect(ask('investment adviser Wisconsin').query.failReason).toMatch(/Wisconsin/);
    expect(ask('investment adviser Maryland').query.failReason).toMatch(/Maryland/);
  });
});
