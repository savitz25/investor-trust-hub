import { describe, expect, it } from 'vitest';
import {
  AZ_PUBLIC_FINGERPRINT,
  AZ_PUBLIC_ROUTE,
  AZ_PUBLIC_SNAPSHOT,
  assertArizonaPublicIntel,
  azPrincipalOfficeCountFromNationalRoster,
  mayAttachAzEvidenceToProfile,
} from '../src/az-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('AZ public snapshot', () => {
  it('reconciles the federal Arizona principal-office overlay without a state-RIA denominator', () => {
    const snap = assertArizonaPublicIntel();
    expect(snap.fingerprint).toBe(AZ_PUBLIC_FINGERPRINT);
    expect(AZ_PUBLIC_ROUTE).toBe('/arizona');
    expect(azPrincipalOfficeCountFromNationalRoster()).toBe(213);
    expect(snap.nationalOverlay.azPrincipalOfficeSecIardFirms).toBe(213);
    expect(snap.nationalOverlay.universe).toBe(23622);
    expect(snap.nationalOverlay.resolvedPrincipalOfficeRegions).toBe(17997);
    expect(snap.nationalOverlay.unresolvedPrincipalOfficeRegions).toBe(5625);
    expect(snap.nationalOverlay.shareOfResolvedRegionsPct).toBe(1.18);
    expect(snap.nationalOverlay.caveat.toLowerCase()).toContain('not the arizona state-registered');
    expect(snap.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(snap.stateRia.AZ_STATE_IA_BUSINESS_ROSTER).toBe('SOURCE_AVAILABLE_BY_REQUEST');
    expect(snap.stateRia.requestFiled).toBe(false);
  });

  it('keeps national RIA and ERA separate and does not split AZ geography by class', () => {
    expect(AZ_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(AZ_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(AZ_PUBLIC_SNAPSHOT.riaEra.azPrincipalOfficeSplit).toBe('SOURCE_NOT_SPLIT');
    expect(AZ_PUBLIC_SNAPSHOT.riaEra.caveat).toMatch(/ERA is not an RIA/);
  });

  it('does not treat the 213 overlay as entity growth', () => {
    expect(AZ_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(AZ_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_STATE_IDENTITIES).toBe(0);
    expect(AZ_PUBLIC_SNAPSHOT.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED).toBe(0);
    expect(AZ_PUBLIC_SNAPSHOT.expansionLedger.NEW_EVIDENCE_ROWS).toBe(205);
    expect(AZ_PUBLIC_SNAPSHOT.growthClassification).toBe('INTELLIGENCE_GROWTH_HEAVY');
    expect(AZ_PUBLIC_SNAPSHOT.preIngestBaseline.arizonaPrincipalOfficeFirmsAlreadyInFederalGraph).toBe(213);
  });

  it('withholds unsafe enforcement attachment and Form D quality claims', () => {
    expect(AZ_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(mayAttachAzEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachAzEvidenceToProfile('UNSAFE_NAME_ONLY')).toBe(false);
    expect(mayAttachAzEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachAzEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(mayAttachAzEvidenceToProfile('EXACT_ACC_DOCKET')).toBe(true);
    expect(mayAttachAzEvidenceToProfile('EXACT_ACC_FILE_NUMBER')).toBe(true);
    expect(mayAttachAzEvidenceToProfile('EXACT_ORDER_IDENTITY')).toBe(true);
    expect(AZ_PUBLIC_SNAPSHOT.formD.caveat).toMatch(/!= ARIZONA STATE APPROVAL/);
    expect(AZ_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(AZ_PUBLIC_SNAPSHOT.enforcement.pdfsDownloaded).toBe(0);
    expect(AZ_PUBLIC_SNAPSHOT.enforcement.indexRows).toBe(205);
    expect(AZ_PUBLIC_SNAPSHOT.enforcement.rowsNameOnly).toBe(118);
    expect(AZ_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
  });
});
