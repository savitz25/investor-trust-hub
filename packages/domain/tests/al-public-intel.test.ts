import { describe, expect, it } from 'vitest';
import { AL_REGISTRATION_LENSES, AL_SECURITIES_ORDERS, assertAlabamaPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('AL-INV-001 Alabama securities evidence', () => {
  it('keeps state IA, notice, ERA, principal office and orders as separate grains', () => {
    expect(assertAlabamaPublicIntel()).toBe(true);
    expect(AL_REGISTRATION_LENSES.stateFeed.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(AL_REGISTRATION_LENSES.secFeed.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(AL_REGISTRATION_LENSES.stateIa.count).toBe(165);
    expect(AL_REGISTRATION_LENSES.era.count).toBe(21);
    expect(AL_REGISTRATION_LENSES.federalNotice.count).toBe(1639);
    expect(AL_REGISTRATION_LENSES.principalOffice.count).toBe(98);
    expect(AL_REGISTRATION_LENSES.principalOffice.sourceAsOf).toBe('2026-08-27');
    expect(AL_REGISTRATION_LENSES.dedupedAlabamaAdvisers).toBeNull();
    expect(AL_REGISTRATION_LENSES.canonicalReconciliation.existingCanonicalMatches).toBeNull();
    expect(AL_REGISTRATION_LENSES.canonicalReconciliation.netNewCanonicalFirms).toBe(0);
    expect(AL_REGISTRATION_LENSES.canonicalReconciliation.unresolvedIdentities).toBe(165);
    expect(AL_SECURITIES_ORDERS.status).toBe('BOUNDED_INDEX');
    expect(AL_SECURITIES_ORDERS.rowCount).toBe(33);
    expect(AL_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(AL_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
    expect(AL_SECURITIES_ORDERS.ceaseAndDesistIsFinalAdjudication).toBe(false);
  });

  it('routes Alabama state questions and refuses a bare mobile trigger', () => {
    for (const q of ['investment adviser Alabama', 'RIA Alabama', 'state registered adviser Alabama']) expect(ask(q).query.failReason, q).toMatch(/165 Alabama state-registered IA firm CRDs/);
    expect(ask('federal covered adviser Alabama').query.failReason).toMatch(/1,639 firms with a FILED Alabama notice/);
    expect(ask('ERA Alabama').query.failReason).toMatch(/21 active Alabama exempt reporting/);
    expect(ask('principal office adviser Alabama').query.failReason).toMatch(/98 Alabama principal-office/);
    expect(ask('principal office adviser Alabama').query.failReason).toMatch(/not Alabama registration/);
    expect(ask('broker dealer Alabama').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('securities agent Alabama').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('investment adviser representative Alabama').query.failReason).toMatch(/persons, not firms/);
    expect(ask('how many advisers in Alabama').query.failReason).toMatch(/cannot be combined/);
    expect(ask('total Alabama advisers').query.failReason).toMatch(/cannot be combined/);
    expect(ask('Alabama securities enforcement').query.failReason).toMatch(/not a final adjudication/);
    expect(ask('Alabama securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('Alabama securities examination').query.failReason).toMatch(/provider-level outcomes were not acquired/);
    for (const city of ['Birmingham', 'Montgomery', 'Huntsville', 'Tuscaloosa']) expect(ask(`investment adviser ${city}`).query.failReason, city).toMatch(/no city securities route/);
    expect(ask('investment adviser Mobile, Alabama').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser mobile alabama').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser mobile').query.failReason ?? '').not.toMatch(/Alabama/);
    expect(ask('mobile financial advisers').query.failReason ?? '').not.toMatch(/165 Alabama/);
  });

  it('preserves exact identifiers, Alabama SEC handoff, bare-digit and ranking safety', () => {
    expect(ask('CRD 309666 Alabama insurance').query.identifier).toEqual({ type: 'crd', value: '309666' });
    const sec = ask('SEC 801-12345 Alabama contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /alabama'))).toBe(true);
    expect(ask('309666').query.mode).toBe('fail_closed');
    expect(ask('IAR CRD 309666 Alabama').query.failReason).toMatch(/cannot be resolved as a firm/);
    for (const q of ['best adviser Alabama', 'safest adviser Alabama', 'recommended adviser Alabama', 'most trustworthy adviser Alabama', 'top-rated adviser Alabama', 'highest-rated adviser Alabama', '#1 adviser Alabama', 'Trust Score Alabama adviser', 'AggregateRating Alabama adviser', 'ratingValue Alabama adviser', 'paid ranking Alabama adviser', 'sponsored ranking Alabama adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
    expect(ask('investment adviser Louisiana').query.failReason).toMatch(/Louisiana/);
  });
});
