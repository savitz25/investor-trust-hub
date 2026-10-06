import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { interpretInvestorAskQuery } from '../src';

const census = JSON.parse(readFileSync(new URL('../../../data/west-virginia/wv-inv-001/iapd-wv-census.json', import.meta.url), 'utf8'));
const page = readFileSync(new URL('../../../apps/web/src/app/west-virginia/page.tsx', import.meta.url), 'utf8');
const ask = (value: string) => interpretInvestorAskQuery(value);

describe('WV-INV-001 West Virginia securities evidence', () => {
  it('keeps jurisdiction classes apart from principal-office geography', () => {
    expect(census.state.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(census.sec.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(census.state.wv_state_ia_registration_rows).toBe(41);
    expect(census.state.wv_state_ia_distinct_crd).toBe(41);
    expect(census.state.wv_state_ia_approved_distinct_crd).toBe(40);
    expect(census.state.wv_state_ia_condrest_distinct_crd).toBe(1);
    expect(census.state.wv_state_ia_termrequest_distinct_crd).toBe(0);
    expect(census.state.wv_state_era_registration_rows).toBe(0);
    expect(census.state.wv_state_era_active_distinct_crd).toBe(0);
    expect(census.sec.wv_notice_filed_distinct_crd).toBe(1085);
    expect(census.sec.notice_status).toBe('FILED');
    expect(census.sec.wv_principal_office_distinct_crd).toBe(12);
    expect(census.state.principal_office_wv_among_state_ia).toBe(18);
    expect(census.state.principal_office_not_wv_among_state_ia).toBe(23);
    expect(census.overlaps.state_ia_approved_and_notice_filed).toBe(0);
    expect(census.overlaps.state_ia_and_notice_filed).toBe(0);
    expect(census.overlaps.state_ia_and_principal_office).toBe(0);
    expect(census.notAcquired.iarPersons).toBe('NOT_ACQUIRED');
    expect(census.notAcquired.auditorAnnualReportStock).toBe('NOT_ACQUIRED');
    expect(census.graphWrites).toBe(0);
    expect(census.nameOnlyAdverseJoins).toBe(0);
    expect(census.populationsAreAdded).toBe(false);
    expect(page).not.toMatch(/1,125|1125|1,137|1137/);
    expect(page).not.toMatch(/AggregateRating|Trust Score/);
    expect(page).toMatch(/not added/);
    expect(page).toMatch(/regulator code WV/);
  });

  it('routes West Virginia by name or in wv, and does not steal Virginia', () => {
    expect(ask('investment adviser West Virginia').query.failReason).toMatch(/41 West Virginia state IA firm CRDs/);
    expect(ask('investment adviser West Virginia').query.failReason).toMatch(/40 APPROVED/);
    expect(ask('investment adviser West Virginia').query.failReason).toMatch(/1 CONDREST/);
    expect(ask('investment adviser in WV').query.failReason).toMatch(/41 West Virginia state IA firm CRDs/);
    expect(ask('investment adviser in wv').query.failReason ?? '').not.toMatch(/41 West Virginia state IA/);
    expect(ask('federal covered adviser West Virginia').query.failReason).toMatch(/1,085 firms with a FILED West Virginia notice/);
    expect(ask('ERA West Virginia').query.failReason).toMatch(/0 West Virginia ERA/);
    expect(ask('principal office adviser West Virginia').query.failReason).toMatch(/12 West Virginia principal-office/);
    expect(ask('principal office adviser West Virginia').query.failReason).toMatch(/not West Virginia registration/);
    expect(ask('how many advisers in West Virginia').query.failReason).toMatch(/cannot be combined/);
    expect(ask('how many advisers in West Virginia').query.failReason).not.toMatch(/1,125|1125/);
    expect(ask('investment adviser representative West Virginia').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('West Virginia securities enforcement').query.failReason).toMatch(/NOT_ACQUIRED/);
    expect(ask('best adviser in West Virginia').query.failReason).toMatch(/does not rank/);
    expect(ask('investment adviser Charleston West Virginia').query.failReason).toMatch(/no city securities route/);
    expect(ask('investment adviser wv').query.failReason ?? '').not.toMatch(/West Virginia state IA/);
    expect(ask('investment adviser WV').query.failReason ?? '').not.toMatch(/West Virginia state IA/);
    expect(ask('investment adviser Virginia').query.failReason ?? '').not.toMatch(/West Virginia state IA/);
    expect(ask('investment adviser in va').query.failReason ?? '').not.toMatch(/West Virginia state IA/);
    expect(ask('investment adviser Charleston').query.failReason ?? '').not.toMatch(/West Virginia state IA/);
    expect(ask('investment adviser Idaho').query.failReason).not.toMatch(/West Virginia state IA/);
  });
});
