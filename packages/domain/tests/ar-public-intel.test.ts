import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { interpretInvestorAskQuery } from '../src';

const census = JSON.parse(readFileSync(new URL('../../../data/arkansas/ar-inv-001/iapd-ar-census.json', import.meta.url), 'utf8'));
const ask = (value: string) => interpretInvestorAskQuery(value);

describe('AR-INV-001 Arkansas securities evidence', () => {
  it('keeps state IA, notice, ERA and principal office separate', () => {
    expect(census.state.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(census.sec.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(census.state.ar_state_ia_approved_distinct_crd).toBe(118);
    expect(census.state.ar_state_ia_registration_rows).toBe(118);
    expect(census.state.ar_state_era_active_distinct_crd).toBe(8);
    expect(census.sec.ar_notice_filed_distinct_crd).toBe(1324);
    expect(census.sec.ar_principal_office_distinct_crd).toBe(60);
    expect(census.overlaps.state_ia_and_state_era).toBe(0);
    expect(census.overlaps.state_ia_approved_and_notice_filed).toBe(1);
    expect(census.sec.principal_not_notice_filed).toBe(1);
    expect(census.state.ar_state_ia_approved_distinct_crd + census.sec.ar_notice_filed_distinct_crd + census.state.ar_state_era_active_distinct_crd + census.sec.ar_principal_office_distinct_crd).not.toBe(census.state.ar_state_ia_approved_distinct_crd);
  });

  it('routes Arkansas questions without capturing Arizona or Missouri', () => {
    expect(ask('investment adviser Arkansas').query.failReason).toMatch(/118 Arkansas state-registered IA firm CRDs/);
    expect(ask('federal covered adviser Arkansas').query.failReason).toMatch(/1,324 firms with a FILED Arkansas notice/);
    expect(ask('ERA Arkansas').query.failReason).toMatch(/8 active Arkansas exempt reporting/);
    expect(ask('principal office adviser Arkansas').query.failReason).toMatch(/60 Arkansas principal-office/);
    expect(ask('principal office adviser Arkansas').query.failReason).toMatch(/not Arkansas registration/);
    expect(ask('how many advisers in Arkansas').query.failReason).toMatch(/cannot be combined/);
    expect(ask('investment adviser representative Arkansas').query.failReason).toMatch(/persons, not firms/);
    expect(ask('Arkansas securities enforcement').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('investment adviser Little Rock Arkansas').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser in arizona').query.failReason ?? '').not.toMatch(/Arkansas state-registered/);
    expect(ask('investment adviser in Missouri').query.failReason ?? '').not.toMatch(/118 Arkansas/);
    expect(ask('investment adviser Fayetteville').query.failReason ?? '').not.toMatch(/118 Arkansas/);
  });
});
