import { describe, expect, it } from 'vitest';
import { KY_DFI_2025_SECURITIES, KY_REGISTRATION_LENSES, KY_SECURITIES_ORDERS, assertKentuckyPublicIntel, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('KY-INV-001 Kentucky securities evidence', () => {
  it('keeps IAPD lenses, DFI year-end counts, persons, exams and orders separate', () => {
    expect(assertKentuckyPublicIntel()).toBe(true);
    expect(KY_REGISTRATION_LENSES.stateIa.count).toBe(150);
    expect(KY_REGISTRATION_LENSES.era.count).toBe(9);
    expect(KY_REGISTRATION_LENSES.federalNotice.count).toBe(1528);
    expect(KY_REGISTRATION_LENSES.principalOffice.count).toBe(89);
    expect(KY_REGISTRATION_LENSES.principalOffice.sourceAsOf).toBe('2026-08-27');
    expect(KY_REGISTRATION_LENSES.exactCrdIntersections.stateIaApprovedAndNoticeFiled).toEqual(['316840']);
    expect(KY_REGISTRATION_LENSES.exactCrdIntersections.principalOfficeOverlay).toBeNull();
    expect(KY_REGISTRATION_LENSES.dedupedKentuckyAdvisers).toBeNull();
    expect(KY_DFI_2025_SECURITIES.yearEnd.stateRegisteredInvestmentAdvisers.totalRegistered).toBe(159);
    expect(KY_DFI_2025_SECURITIES.federalCoveredNoticeFilings.totalEffectiveYearEnd).toBe(1430);
    expect(KY_DFI_2025_SECURITIES.investmentAdviserRepresentatives.totalStateAndFederalYearEnd).toBe(7359);
    expect(KY_DFI_2025_SECURITIES.glance.securitiesProfessionals).toBe(182894);
    expect(KY_DFI_2025_SECURITIES.enforcement.civilOrders).toBe(0);
    expect(KY_DFI_2025_SECURITIES.enforcement.kentuckyVanguardAllocationUsd).toBeNull();
    expect(KY_SECURITIES_ORDERS.status).toBe('NOT_ACQUIRED');
    expect(KY_SECURITIES_ORDERS.rowCount).toBeNull();
    expect(KY_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
  });

  it('routes Kentucky state and city questions without city pages or a combined total', () => {
    for (const q of ['investment adviser Kentucky', 'RIA Kentucky', 'state registered adviser Kentucky']) expect(ask(q).query.failReason, q).toMatch(/150 Kentucky state-registered IA firm CRDs/);
    expect(ask('investment adviser Kentucky').query.failReason).toMatch(/159/);
    expect(ask('federal covered adviser Kentucky').query.failReason).toMatch(/1,528/);
    expect(ask('federal covered adviser Kentucky').query.failReason).toMatch(/1,430/);
    expect(ask('ERA Kentucky').query.failReason).toMatch(/9 active Kentucky exempt reporting/);
    expect(ask('principal office adviser Kentucky').query.failReason).toMatch(/89 Kentucky principal-office/);
    expect(ask('principal office adviser Kentucky').query.failReason).toMatch(/not Kentucky registration/);
    expect(ask('broker dealer Kentucky').query.failReason).toMatch(/1,382 broker-dealer firms/);
    expect(ask('broker dealer Kentucky').query.failReason).toMatch(/182,894/);
    expect(ask('investment adviser representative Kentucky').query.failReason).toMatch(/7,359/);
    expect(ask('investment adviser representative Kentucky').query.failReason).toMatch(/not the 182,894/);
    expect(ask('how many advisers in Kentucky').query.failReason).toMatch(/cannot be combined/);
    expect(ask('total Kentucky advisers').query.failReason).toMatch(/cannot be combined/);
    expect(ask('Kentucky securities enforcement').query.failReason).toMatch(/11 securities administrative orders/);
    expect(ask('Kentucky securities enforcement').query.failReason).toMatch(/Exact CRD attachments: 0/);
    expect(ask('Kentucky securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('Kentucky securities examination').query.failReason).toMatch(/48 total/);
    expect(ask('Kentucky securities examination').query.failReason).toMatch(/not the 11 administrative orders/);
    for (const city of ['Louisville', 'Lexington']) expect(ask(`investment adviser ${city}`).query.failReason, city).toMatch(/no Louisville or Lexington securities route/);
    expect(ask('investment adviser Louisiana').query.failReason).toMatch(/Louisiana/);
  });

  it('preserves exact identifiers, Kentucky SEC handoff, bare-digit and ranking safety', () => {
    expect(ask('CRD 316840 Kentucky insurance').query.identifier).toEqual({ type: 'crd', value: '316840' });
    const sec = ask('SEC 801-12345 Kentucky contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /kentucky'))).toBe(true);
    expect(ask('316840').query.mode).toBe('fail_closed');
    expect(ask('IAR CRD 316840 Kentucky').query.failReason).toMatch(/cannot be resolved as a firm/);
    for (const q of ['best adviser Kentucky', 'safest adviser Kentucky', 'recommended adviser Kentucky', 'Trust Score Kentucky adviser', 'AggregateRating Kentucky adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
  });
});
