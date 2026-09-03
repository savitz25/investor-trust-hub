import { describe, expect, it } from 'vitest';
import {
  CA_PUBLIC_FINGERPRINT,
  CA_PUBLIC_ROUTE,
  CA_PUBLIC_SNAPSHOT,
  assertCaliforniaPublicIntel,
  caPrincipalOfficeCountFromNationalRoster,
  mayAttachCaEvidenceToProfile,
} from '../src/ca-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('CA public snapshot', () => {
  it('reconciles the federal California principal-office overlay without a state-RIA denominator', () => {
    const snap = assertCaliforniaPublicIntel();
    expect(snap.fingerprint).toBe(CA_PUBLIC_FINGERPRINT);
    expect(CA_PUBLIC_ROUTE).toBe('/california');
    expect(caPrincipalOfficeCountFromNationalRoster()).toBe(2699);
    expect(snap.nationalOverlay.caPrincipalOfficeSecIardFirms).toBe(2699);
    expect(snap.nationalOverlay.caveat.toLowerCase()).toContain('not the california state-registered');
    expect(snap.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(snap.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
  });

  it('keeps national RIA and ERA separate and does not split CA geography by class', () => {
    expect(CA_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(CA_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(CA_PUBLIC_SNAPSHOT.riaEra.caPrincipalOfficeSplit).toBe('SOURCE_NOT_SPLIT');
    expect(CA_PUBLIC_SNAPSHOT.riaEra.caveat).toMatch(/ERA is not an RIA/);
  });

  it('withholds unsafe enforcement attachment and Form D quality claims', () => {
    expect(CA_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(mayAttachCaEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachCaEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachCaEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
    expect(CA_PUBLIC_SNAPSHOT.formD.caveat).toMatch(/!= CALIFORNIA STATE APPROVAL/);
    expect(CA_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(CA_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
  });
});
