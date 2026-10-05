import { describe, expect, it } from 'vitest';
import { MS_REGISTRATION_LENSES, MS_SECURITIES_ORDERS, assertMississippiPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('MS-INV-001 Mississippi securities evidence', () => {
  it('keeps state IA, notice, ERA, principal office and orders as separate grains', () => {
    expect(assertMississippiPublicIntel()).toBe(true);
    expect(MS_REGISTRATION_LENSES.stateFeed.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(MS_REGISTRATION_LENSES.secFeed.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(MS_REGISTRATION_LENSES.stateIa.count).toBe(67);
    expect(MS_REGISTRATION_LENSES.era.count).toBe(3);
    expect(MS_REGISTRATION_LENSES.federalNotice.count).toBe(1199);
    expect(MS_REGISTRATION_LENSES.principalOffice.count).toBe(35);
    expect(MS_REGISTRATION_LENSES.principalOffice.sourceAsOf).toBe('2026-08-27');
    expect(MS_REGISTRATION_LENSES.dedupedMississippiAdvisers).toBeNull();
    expect(MS_REGISTRATION_LENSES.canonicalReconciliation.existingCanonicalMatches).toBeNull();
    expect(MS_REGISTRATION_LENSES.canonicalReconciliation.netNewCanonicalFirms).toBe(0);
    expect(MS_REGISTRATION_LENSES.canonicalReconciliation.unresolvedIdentities).toBe(67);
    expect(MS_SECURITIES_ORDERS.status).toBe('NOT_ACQUIRED');
    expect(MS_SECURITIES_ORDERS.rowCount).toBeNull();
    expect(MS_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(MS_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
    expect(MS_SECURITIES_ORDERS.ceaseAndDesistIsFinalAdjudication).toBe(false);
  });

  it('routes Mississippi state questions and refuses a bare Jackson trigger', () => {
    for (const q of ['investment adviser Mississippi', 'RIA Mississippi', 'state registered adviser Mississippi']) expect(ask(q).query.failReason, q).toMatch(/67 Mississippi state-registered IA firm CRDs/);
    expect(ask('federal covered adviser Mississippi').query.failReason).toMatch(/1,199 firms with a FILED Mississippi notice/);
    expect(ask('ERA Mississippi').query.failReason).toMatch(/3 active Mississippi exempt reporting/);
    expect(ask('principal office adviser Mississippi').query.failReason).toMatch(/35 Mississippi principal-office/);
    expect(ask('principal office adviser Mississippi').query.failReason).toMatch(/not Mississippi registration/);
    expect(ask('broker dealer Mississippi').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('securities agent Mississippi').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('investment adviser representative Mississippi').query.failReason).toMatch(/persons, not firms/);
    expect(ask('how many advisers in Mississippi').query.failReason).toMatch(/cannot be combined/);
    expect(ask('total Mississippi advisers').query.failReason).toMatch(/cannot be combined/);
    expect(ask('investment adviser in ms').query.failReason).toMatch(/could not be resolved/);
    expect(ask('investment adviser in ms').query.failReason).not.toMatch(/Missouri|Massachusetts|Indiana|67 Mississippi/);
    expect(ask('Mississippi securities enforcement').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('Mississippi securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('investment adviser Jackson Mississippi').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser Gulfport Mississippi').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser Jackson').query.failReason ?? '').not.toMatch(/67 Mississippi/);
    expect(ask('investment adviser in missouri').query.failReason ?? '').not.toMatch(/67 Mississippi/);
    expect(ask('investment adviser in Massachusetts').query.failReason ?? '').not.toMatch(/67 Mississippi/);
  });

  it('preserves exact identifiers and ranking safety', () => {
    expect(ask('CRD 156386 Mississippi insurance').query.identifier).toEqual({ type: 'crd', value: '156386' });
    const sec = ask('SEC 801-12345 Mississippi contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /mississippi'))).toBe(true);
    expect(ask('156386').query.mode).toBe('fail_closed');
    expect(ask('IAR CRD 156386 Mississippi').query.failReason).toMatch(/cannot be resolved as a firm/);
    for (const q of ['best adviser Mississippi', 'safest adviser Mississippi', 'recommended adviser Mississippi', 'Trust Score Mississippi adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
    expect(ask('investment adviser Alabama').query.failReason).toMatch(/Alabama/);
    expect(ask('investment adviser South Carolina').query.failReason ?? '').not.toMatch(/67 Mississippi/);
  });
});
