import { describe, expect, it } from 'vitest';
import {
  OH_PUBLIC_FINGERPRINT,
  OH_PUBLIC_ROUTE,
  OH_PUBLIC_SNAPSHOT,
  assertOhioPublicIntel,
  ohNohIsFinalFinding,
  ohPrincipalOfficeCountFromNationalRoster,
} from '../src/oh-public-intel';

describe('OH-INV-001 public intel', () => {
  it('keeps IAPD Ohio lenses separate and STAR search-only', () => {
    const snap = assertOhioPublicIntel();
    expect(OH_PUBLIC_ROUTE).toBe('/ohio');
    expect(snap.fingerprint).toBe(OH_PUBLIC_FINGERPRINT);
    expect(snap.stateRia.approvedDistinctCrd).toBe(784);
    expect(snap.stateEra.activeDistinctCrd).toBe(24);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(2733);
    expect(ohPrincipalOfficeCountFromNationalRoster()).toBe(426);
    expect(snap.stateRia.approvedDistinctCrd).not.toBe(snap.federalNotice.noticeFiledDistinctCrd);
    expect(snap.reconciliation.OH_STATE_IA_ERA_OVERLAP).toBe(0);
    expect(ohNohIsFinalFinding()).toBe(false);
    expect(snap.expansionLedger.GRAPH_WRITES).toBe(0);
  });
});
