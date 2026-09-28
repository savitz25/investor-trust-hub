import { describe, expect, it } from 'vitest';
import { assertConnecticutPublicIntel, CT_REGISTRATION_LENSES, CT_SECURITIES_ORDERS, interpretInvestorAskQuery } from '../src';

const ask = (q: string) => interpretInvestorAskQuery(q).query;

describe('CT-INV-001 Connecticut securities evidence', () => {
  it('preserves distinct official-list and IAPD grains, exact links, and zero graph writes', () => {
    expect(assertConnecticutPublicIntel().orders.rows).toHaveLength(138);
    const dob = CT_REGISTRATION_LENSES.regulatorLists;
    expect([dob.stateIa.rows, dob.federalNotice.rows, dob.era.rows]).toEqual([442, 2709, 236]);
    expect(dob.stateIa.statusRows.Approved).toBe(412);
    const iapd = CT_REGISTRATION_LENSES.iapd;
    expect([iapd.stateIa.approvedFirmCrds, iapd.federalNotice.filedFirmCrds, iapd.era.activeFirmCrds, iapd.principalOffice.firmCrds]).toEqual([398, 2745, 255, 591]);
    expect(CT_SECURITIES_ORDERS.exactFirmCrdCrosswalks).toBe(16);
    expect(CT_SECURITIES_ORDERS.exactEnforcementAttachments).toBe(0);
    expect(CT_SECURITIES_ORDERS.nameOnlyAttachments).toBe(0);
    expect(CT_REGISTRATION_LENSES.dedupedConnecticutAdvisers).toBeNull();
    expect(CT_REGISTRATION_LENSES.graphWrites).toBe(0);
  });

  it('routes Connecticut classes and cities safely', () => {
    for (const q of ['investment adviser Connecticut', 'RIA Connecticut', 'state registered adviser Connecticut']) {
      expect(ask(q).failReason, q).toMatch(/398 Connecticut state IA firm CRDs/);
    }
    expect(ask('federal covered adviser Connecticut').failReason).toMatch(/2,745 Connecticut FILED federal notice/);
    expect(ask('ERA Connecticut').failReason).toMatch(/255 Connecticut ACTIVE ERA/);
    expect(ask('principal office adviser Connecticut').failReason).toMatch(/591 firm CRDs/);
    expect(ask('broker dealer Connecticut').failReason).toMatch(/bulk rosters were not acquired/);
    expect(ask('Connecticut securities enforcement').failReason).toMatch(/138 securities-order PDF links/);
    expect(ask('Connecticut securities complaints').failReason).toMatch(/complaint records and outcomes were not acquired/);
    for (const city of ['Hartford', 'New Haven', 'Stamford', 'Bridgeport']) {
      expect(ask(`investment adviser ${city}`).failReason, city).toMatch(/no city securities route/);
    }
  });

  it('keeps labeled CRD/SEC ahead of incidental words, bare digits closed, and rankings refused', () => {
    expect(ask('CRD 166089 Connecticut mover').identifier).toEqual({ type: 'crd', value: '166089' });
    expect(ask('SEC 801-11953 Connecticut insurance').identifier).toEqual({ type: 'sec_file_number', value: '801-11953' });
    expect(ask('166089').mode).toBe('fail_closed');
    for (const q of ['best adviser Connecticut', 'safest adviser Connecticut', 'recommended adviser Connecticut', 'most trustworthy adviser Connecticut', 'top-rated adviser Connecticut', 'highest-rated adviser Connecticut', '#1 adviser Connecticut', 'number one adviser Connecticut', 'Trust Score Connecticut adviser', 'AggregateRating Connecticut adviser', 'ratingValue Connecticut adviser', 'paid ranking Connecticut adviser', 'sponsored ranking Connecticut adviser']) {
      expect(ask(q).failReason, q).toMatch(/does not rank advisers/);
    }
  });
});
