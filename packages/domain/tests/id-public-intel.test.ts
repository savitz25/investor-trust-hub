import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { interpretInvestorAskQuery } from '../src';

const census = JSON.parse(readFileSync(new URL('../../../data/idaho/id-inv-001/iapd-id-census.json', import.meta.url), 'utf8'));
const ask = (value: string) => interpretInvestorAskQuery(value);

describe('ID-INV-001 Idaho securities evidence', () => {
  it('keeps jurisdiction classes apart from principal-office geography', () => {
    expect(census.state.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(census.sec.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(census.state.id_state_ia_approved_distinct_crd).toBe(199);
    expect(census.state.id_state_ia_termrequest_distinct_crd).toBe(1);
    expect(census.state.id_state_ia_distinct_crd).toBe(200);
    expect(census.state.id_state_era_active_distinct_crd).toBe(23);
    expect(census.sec.id_notice_filed_distinct_crd).toBe(1595);
    expect(census.sec.id_principal_office_distinct_crd).toBe(57);
    expect(census.overlaps.state_ia_approved_and_notice_filed).toBe(0);
    expect(census.overlaps.state_ia_and_notice_filed).toBe(1);
    expect(census.overlaps.state_ia_and_principal_office).toBe(0);
    expect(census.notAcquired.iarPersons).toBe('NOT_ACQUIRED');
    expect(census.graphWrites).toBe(0);
    expect(census.state.id_state_ia_approved_distinct_crd + census.sec.id_notice_filed_distinct_crd).not.toBe(199);
  });

  it('routes Idaho by name or in id, and ignores a bare id token', () => {
    expect(ask('investment adviser Idaho').query.failReason).toMatch(/199 Idaho state-registered IA firm CRDs/);
    expect(ask('investment adviser in ID').query.failReason).toMatch(/199 Idaho state-registered IA firm CRDs/);
    expect(ask('investment adviser in id').query.failReason ?? '').not.toMatch(/199 Idaho state-registered/);
    expect(ask('federal covered adviser Idaho').query.failReason).toMatch(/1,595 firms with a FILED Idaho notice/);
    expect(ask('ERA Idaho').query.failReason).toMatch(/23 active Idaho exempt reporting/);
    expect(ask('principal office adviser Idaho').query.failReason).toMatch(/57 Idaho principal-office/);
    expect(ask('principal office adviser Idaho').query.failReason).toMatch(/not Idaho registration/);
    expect(ask('how many advisers in Idaho').query.failReason).toMatch(/cannot be combined/);
    expect(ask('investment adviser representative Idaho').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('Idaho securities enforcement').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('best adviser in Idaho').query.failReason).toMatch(/does not rank/);
    expect(ask('investment adviser Boise Idaho').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser id').query.failReason ?? '').not.toMatch(/Idaho state-registered/);
    expect(ask('investment adviser ID').query.failReason ?? '').not.toMatch(/Idaho state-registered/);
    expect(ask('investment adviser Nebraska').query.failReason).not.toMatch(/Idaho state-registered/);
    expect(ask('investment adviser Boise').query.failReason ?? '').not.toMatch(/Idaho state-registered/);
  });
});
