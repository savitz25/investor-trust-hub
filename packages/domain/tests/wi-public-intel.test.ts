import { describe, expect, it } from 'vitest';
import { WI_REGISTRATION_LENSES, WI_SECURITIES_ORDERS, interpretInvestorAskQuery } from '../src';

const ask = (value: string) => interpretInvestorAskQuery(value);

describe('WI-INV-001 Wisconsin securities evidence', () => {
  it('separates registration, office geography and enforcement', () => {
    for (const lens of [WI_REGISTRATION_LENSES.stateIa, WI_REGISTRATION_LENSES.federalNotice, WI_REGISTRATION_LENSES.era]) {
      expect(lens.status).toBe('NOT_ACQUIRED');
      expect(lens.count).toBeNull();
    }
    expect(WI_REGISTRATION_LENSES.principalOffice.count).toBe(211);
    expect(WI_SECURITIES_ORDERS.rowCount).toBe(95);
    expect(WI_SECURITIES_ORDERS.rowsWithCrdColumn).toBe(26);
    expect(WI_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(WI_SECURITIES_ORDERS.nameOnlyAdverseJoins).toBe(0);
  });

  it('routes Wisconsin state and city questions without creating city pages', () => {
    for (const q of ['investment adviser Wisconsin', 'RIA Wisconsin', 'state registered adviser Wisconsin', 'federal covered adviser Wisconsin', 'ERA Wisconsin']) expect(ask(q).query.failReason, q).toMatch(/counts and exact CRD overlaps were not acquired/);
    expect(ask('principal office adviser Wisconsin').query.failReason).toMatch(/211 Wisconsin principal-office firm records/);
    expect(ask('broker dealer Wisconsin').query.failReason).toMatch(/separate firm and person grains/);
    expect(ask('Wisconsin securities enforcement').query.failReason).toMatch(/95 dated administrative orders/);
    expect(ask('Wisconsin securities complaints').query.failReason).toMatch(/complaint is not a finding/);
    expect(ask('Wisconsin securities examination').query.failReason).toMatch(/provider-level outcomes were not acquired/);
    for (const city of ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha']) expect(ask(`investment adviser ${city}`).query.failReason, city).toMatch(/no city securities route/);
  });

  it('preserves exact identifiers, Wisconsin SEC handoff, bare-digit and ranking safety', () => {
    expect(ask('CRD 309666 Wisconsin insurance').query.identifier).toEqual({ type: 'crd', value: '309666' });
    const sec = ask('SEC 801-12345 Wisconsin contractor');
    expect(sec.query.identifier).toEqual({ type: 'sec_file_number', value: '801-12345' });
    expect(sec.interpretation.some(row => row.value.includes('InvestorTrustHub /wisconsin'))).toBe(true);
    expect(ask('309666').query.mode).toBe('fail_closed');
    for (const q of ['best adviser Wisconsin', 'safest adviser Wisconsin', 'recommended adviser Wisconsin', 'most trustworthy adviser Wisconsin', 'top-rated adviser Wisconsin', 'highest-rated adviser Wisconsin', '#1 adviser Wisconsin', 'Trust Score Wisconsin adviser', 'AggregateRating Wisconsin adviser', 'ratingValue Wisconsin adviser', 'paid ranking Wisconsin adviser', 'sponsored ranking Wisconsin adviser']) expect(ask(q).query.failReason, q).toMatch(/does not rank advisers/);
  });
});
