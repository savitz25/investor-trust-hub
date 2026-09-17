import { describe, expect, it } from 'vitest';
import {
  NC_PUBLIC_FINGERPRINT,
  NC_PUBLIC_ROUTE,
  NC_PUBLIC_SNAPSHOT,
  assertNorthCarolinaPublicIntel,
  ncPersonCrdMayBecomeFirmCrd,
  ncPrincipalOfficeCountFromNationalRoster,
  ncSummaryOrderIsFinalFinding,
} from '../src/nc-public-intel';

describe('NC public snapshot', () => {
  it('keeps SOS IA, IAPD state IA, ERA, notice, and principal office on separate grains', () => {
    const snap = assertNorthCarolinaPublicIntel();
    expect(snap.fingerprint).toBe(NC_PUBLIC_FINGERPRINT);
    expect(NC_PUBLIC_ROUTE).toBe('/north-carolina');
    expect(ncPrincipalOfficeCountFromNationalRoster()).toBe(325);
    expect(snap.sosRegisters.NC_SOS_IA_DISTINCT_CRDS).toBe(687);
    expect(snap.stateRia.approvedDistinctCrd).toBe(701);
    expect(snap.sosRegisters.NC_SOS_IA_DISTINCT_CRDS).not.toBe(snap.stateRia.approvedDistinctCrd);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3704);
    expect(snap.stateEra.activeDistinctCrd).toBe(33);
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=NC');
    expect(ncPersonCrdMayBecomeFirmCrd()).toBe(false);
    expect(ncSummaryOrderIsFinalFinding()).toBe(false);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(NC_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(NC_PUBLIC_SNAPSHOT.expansionLedger.GRAPH_WRITES).toBe(0);
    expect(NC_PUBLIC_SNAPSHOT.claimEligibilityBroadened).toBe(false);
  });
});
