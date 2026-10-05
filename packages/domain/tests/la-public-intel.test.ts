import { describe, expect, it } from 'vitest';
import { LA_REGISTRATION_LENSES, LA_SECURITIES_ORDERS, assertLouisianaPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('LA-INV-001 Louisiana securities evidence', () => {
  it('keeps state IA, notice, ERA, principal office and orders as separate grains', () => {
    expect(assertLouisianaPublicIntel()).toBe(true);
    expect(LA_REGISTRATION_LENSES.stateFeed.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(LA_REGISTRATION_LENSES.secFeed.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(LA_REGISTRATION_LENSES.stateIa.count).toBe(617);
    expect(LA_REGISTRATION_LENSES.era.count).toBe(14);
    expect(LA_REGISTRATION_LENSES.federalNotice.count).toBe(3348);
    expect(LA_REGISTRATION_LENSES.principalOffice.count).toBe(84);
    expect(LA_REGISTRATION_LENSES.principalOffice.sourceAsOf).toBe('2026-08-27');
    expect(LA_REGISTRATION_LENSES.dedupedLouisianaAdvisers).toBeNull();
    expect(LA_SECURITIES_ORDERS.status).toBe('NOT_ACQUIRED');
    expect(LA_SECURITIES_ORDERS.rowCount).toBeNull();
    expect(LA_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(LA_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
  });

  it('routes Louisiana state and city questions without city pages', () => {
    for (const q of ['investment adviser Louisiana', 'RIA Louisiana', 'state registered adviser Louisiana']) expect(ask(q).query.failReason, q).toMatch(/617 Louisiana state-registered IA firm CRDs/);
    expect(ask('federal covered adviser Louisiana').query.failReason).toMatch(/3,?348 firms with a FILED Louisiana notice/);
    expect(ask('ERA Louisiana').query.failReason).toMatch(/14 active Louisiana exempt reporting/);
    expect(ask('principal office adviser Louisiana').query.failReason).toMatch(/84 Louisiana principal-office/);
    expect(ask('principal office adviser Louisiana').query.failReason).toMatch(/not Louisiana registration/);
    expect(ask('broker dealer Louisiana').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('securities agent Louisiana').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('investment adviser representative Louisiana').query.failReason).toMatch(/persons, not firms/);
    expect(ask('how many advisers in Louisiana').query.failReason).toMatch(/cannot be combined/);
    expect(ask('total Louisiana advisers').query.failReason).toMatch(/cannot be combined/);
    expect(ask('Louisiana securities enforcement').query.failReason).toMatch(/not acquired/);
    expect(ask('Louisiana securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('Louisiana securities examination').query.failReason).toMatch(/provider-level outcomes were not acquired/);
    for (const city of ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette']) expect(ask(`investment adviser ${city}`).query.failReason, city).toMatch(/no city securities route/);
  });

  it('preserves exact identifiers, Louisiana SEC handoff, bare-digit and ranking safety', () => {
    expect(ask('CRD 309666 Louisiana insurance').query.identifier).toEqual({ type: 'crd', value: '309666' });
    const sec = ask('SEC 801-12345 Louisiana contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /louisiana'))).toBe(true);
    expect(ask('309666').query.mode).toBe('fail_closed');
    expect(ask('IAR CRD 309666 Louisiana').query.failReason).toMatch(/cannot be resolved as a firm/);
    for (const q of ['best adviser Louisiana', 'safest adviser Louisiana', 'recommended adviser Louisiana', 'most trustworthy adviser Louisiana', 'top-rated adviser Louisiana', 'highest-rated adviser Louisiana', '#1 adviser Louisiana', 'Trust Score Louisiana adviser', 'AggregateRating Louisiana adviser', 'ratingValue Louisiana adviser', 'paid ranking Louisiana adviser', 'sponsored ranking Louisiana adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
    expect(ask('investment adviser Wisconsin').query.failReason).toMatch(/Wisconsin/);
  });
});
