import { describe, expect, it } from 'vitest';
import { SC_REGISTRATION_LENSES, SC_SECURITIES_ORDERS, assertSouthCarolinaPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('SC-INV-001 South Carolina securities evidence', () => {
  it('keeps state IA, notice, ERA, principal office and orders as separate grains', () => {
    expect(assertSouthCarolinaPublicIntel()).toBe(true);
    expect(SC_REGISTRATION_LENSES.stateFeed.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(SC_REGISTRATION_LENSES.secFeed.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(SC_REGISTRATION_LENSES.stateIa.count).toBe(320);
    expect(SC_REGISTRATION_LENSES.stateIa.statusRows.CONDREST).toBe(1);
    expect(SC_REGISTRATION_LENSES.era.count).toBe(19);
    expect(SC_REGISTRATION_LENSES.federalNotice.count).toBe(2715);
    expect(SC_REGISTRATION_LENSES.principalOffice.count).toBe(122);
    expect(SC_REGISTRATION_LENSES.principalOffice.sourceAsOf).toBe('2026-08-27');
    expect(SC_REGISTRATION_LENSES.mainOfficeDiagnostic.publishMainAddrRecount).toBe(false);
    expect(SC_REGISTRATION_LENSES.exactCrdIntersections.stateIaApprovedAndNoticeFiled).toEqual(['318823']);
    expect(SC_REGISTRATION_LENSES.exactCrdIntersections.principalOfficeOverlay).toBeNull();
    expect(SC_REGISTRATION_LENSES.dedupedSouthCarolinaAdvisers).toBeNull();
    expect(SC_REGISTRATION_LENSES.canonicalReconciliation.existingCanonicalMatches).toBeNull();
    expect(SC_REGISTRATION_LENSES.canonicalReconciliation.netNewCanonicalFirms).toBe(0);
    expect(SC_REGISTRATION_LENSES.canonicalReconciliation.unresolvedIdentities).toBe(320);
    expect(SC_SECURITIES_ORDERS.status).toBe('BOUNDED_INDEX');
    expect(SC_SECURITIES_ORDERS.rowCount).toBe(25);
    expect(SC_SECURITIES_ORDERS.yearCounts['2025']).toBe(16);
    expect(SC_SECURITIES_ORDERS.yearCounts['2026']).toBe(9);
    expect(SC_SECURITIES_ORDERS.captionsPrintingCrd).toBe(6);
    expect(SC_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(SC_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
    expect(SC_SECURITIES_ORDERS.ceaseAndDesistIsFinalAdjudication).toBe(false);
    expect(SC_SECURITIES_ORDERS.respondentNamesStored).toBe(false);
  });

  it('routes South Carolina state questions and does not claim a bare sc or a city', () => {
    for (const q of ['investment adviser South Carolina', 'RIA South Carolina', 'state registered adviser South Carolina']) expect(ask(q).query.failReason, q).toMatch(/320 South Carolina state-registered IA firm CRDs/);
    const lowercaseSc = ask('investment adviser in sc').query.failReason ?? '';
    expect(lowercaseSc).toMatch(/could not be resolved/);
    expect(lowercaseSc).not.toMatch(/320/);
    expect(ask('federal covered adviser South Carolina').query.failReason).toMatch(/2,715 firms with a FILED South Carolina notice/);
    expect(ask('ERA South Carolina').query.failReason).toMatch(/19 active South Carolina exempt reporting/);
    expect(ask('principal office adviser South Carolina').query.failReason).toMatch(/122 South Carolina principal-office/);
    expect(ask('principal office adviser South Carolina').query.failReason).toMatch(/not South Carolina registration/);
    expect(ask('broker dealer South Carolina').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('securities agent South Carolina').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('investment adviser representative South Carolina').query.failReason).toMatch(/persons, not firms/);
    expect(ask('how many advisers in South Carolina').query.failReason).toMatch(/cannot be combined/);
    expect(ask('total South Carolina advisers').query.failReason).toMatch(/cannot be combined/);
    expect(ask('South Carolina securities enforcement').query.failReason).toMatch(/not a final adjudication/);
    expect(ask('South Carolina securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('South Carolina securities examination').query.failReason).toMatch(/not a violation/);
    for (const city of ['Charleston', 'Columbia', 'Greenville']) {
      expect(ask(`investment adviser ${city} South Carolina`).query.failReason, city).toMatch(/no city securities route/);
      expect(ask(`investment adviser ${city}`).query.failReason ?? '', city).not.toMatch(/South Carolina Attorney General/);
    }
    expect(ask('best sc advisers').query.failReason ?? '').not.toMatch(/320 South Carolina/);
    expect(ask('investment adviser Alabama').query.failReason).toMatch(/Alabama/);
  });

  it('preserves exact identifiers and refuses rankings', () => {
    expect(ask('CRD 318823 South Carolina').query.identifier).toEqual({ type: 'crd', value: '318823' });
    const sec = ask('SEC 801-12345 South Carolina');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /south-carolina'))).toBe(true);
    expect(ask('318823').query.mode).toBe('fail_closed');
    expect(ask('IAR CRD 318823 South Carolina').query.failReason).toMatch(/cannot be resolved as a firm/);
    for (const q of ['best adviser South Carolina', 'safest adviser South Carolina', 'Trust Score South Carolina adviser', 'AggregateRating South Carolina adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
  });
});
