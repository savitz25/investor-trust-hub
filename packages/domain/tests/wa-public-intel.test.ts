import { describe, expect, it } from 'vitest';
import {
  WA_PUBLIC_FINGERPRINT,
  WA_PUBLIC_ROUTE,
  WA_PUBLIC_SNAPSHOT,
  assertWashingtonPublicIntel,
  waPrincipalOfficeCountFromNationalRoster,
  mayAttachWaEvidenceToProfile,
} from '../src/wa-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('WA public snapshot', () => {
  it('reconciles the federal Washington principal-office overlay without a state-RIA denominator', () => {
    const snap = assertWashingtonPublicIntel();
    expect(snap.fingerprint).toBe(WA_PUBLIC_FINGERPRINT);
    expect(WA_PUBLIC_ROUTE).toBe('/washington');
    expect(waPrincipalOfficeCountFromNationalRoster()).toBe(306);
    expect(snap.nationalOverlay.waPrincipalOfficeSecIardFirms).toBe(306);
    expect(snap.nationalOverlay.universe).toBe(23622);
    expect(snap.nationalOverlay.resolvedPrincipalOfficeRegions).toBe(17997);
    expect(snap.nationalOverlay.unresolvedPrincipalOfficeRegions).toBe(5625);
    expect(snap.nationalOverlay.shareOfResolvedRegionsPct).toBe(1.7);
    expect(snap.nationalOverlay.caveat.toLowerCase()).toContain('not the washington state-registered');
    expect(snap.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(snap.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
  });

  it('keeps national RIA and ERA separate and does not split WA geography by class', () => {
    expect(WA_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(WA_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(WA_PUBLIC_SNAPSHOT.riaEra.waPrincipalOfficeSplit).toBe('SOURCE_NOT_SPLIT');
    expect(WA_PUBLIC_SNAPSHOT.riaEra.caveat).toMatch(/ERA is not an RIA/);
  });

  it('labels DFI year-end aggregates as not a live roster and withholds people directories', () => {
    expect(WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.investmentAdvisers).toBe(645);
    expect(WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.notALiveRoster).toBe(true);
    expect(WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.peopleCountsAreNotPublicDirectories).toBe(true);
    expect(WA_PUBLIC_SNAPSHOT.dfiYearEndAggregates.caveat).toMatch(/LIVE ROSTER/);
  });

  it('withholds unsafe enforcement attachment and Form D quality claims', () => {
    expect(WA_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(mayAttachWaEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachWaEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachWaEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(mayAttachWaEvidenceToProfile('EXACT_DFI_FILE_NUMBER')).toBe(true);
    expect(mayAttachWaEvidenceToProfile('EXACT_DOCKET_OR_ORDER_IDENTITY')).toBe(true);
    expect(WA_PUBLIC_SNAPSHOT.formD.caveat).toMatch(/!= WASHINGTON STATE APPROVAL/);
    expect(WA_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(WA_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
  });
});
