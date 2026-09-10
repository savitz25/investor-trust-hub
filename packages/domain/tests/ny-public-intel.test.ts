import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  NY_PUBLIC_FINGERPRINT,
  NY_PUBLIC_ROUTE,
  NY_PUBLIC_SNAPSHOT,
  assertNewYorkPublicIntel,
  mayAttachNyEvidenceToProfile,
  nyPersonCrdMayBecomeFirmCrd,
  nyPrincipalOfficeCountFromNationalRoster,
} from '../src/ny-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('NY public snapshot', () => {
  it('keeps state IA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertNewYorkPublicIntel();
    expect(snap.fingerprint).toBe(NY_PUBLIC_FINGERPRINT);
    expect(NY_PUBLIC_ROUTE).toBe('/new-york');
    expect(nyPrincipalOfficeCountFromNationalRoster()).toBe(3152);
    expect(snap.nationalOverlay.nyPrincipalOfficeSecIardFirms).toBe(3152);
    expect(snap.nationalOverlay.rawCompilationMainAddrNy).not.toBe(3152);
    expect(snap.stateRia.completeStateRiaCount).toBe(1297);
    expect(snap.stateRia.registrationRows).toBe(1297);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(5856);
    expect(snap.stateEra.activeDistinctCrd).toBe(327);
    expect(snap.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=NY');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=NY');
    expect(snap.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.nationalOverlay.nyPrincipalOfficeSecIardFirms);
    expect(snap.oagFramework.notDfs).toBe(true);
  });

  it('keeps national RIA and ERA separate', () => {
    expect(NY_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(NY_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(NY_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.NY_PRINCIPAL_OFFICE_FIRMS).toBe(3152);
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.NEW_NY_STATE_IDENTITIES).toBe(1624);
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.EXACT_PROFILE_ATTACHMENTS).toBe(0);
    expect(NY_PUBLIC_SNAPSHOT.expansionLedger.EXACT_CRD_ADVERSE_CROSSWALKS).toBe(0);
  });

  it('rejects name-only adverse joins', () => {
    expect(mayAttachNyEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachNyEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachNyEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(nyPersonCrdMayBecomeFirmCrd()).toBe(false);
    expect(NY_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(NY_PUBLIC_SNAPSHOT.enforcement.notInvestmentAdviserEnforcementCensus).toBe(true);
    expect(NY_PUBLIC_SNAPSHOT.complaints.caveat).toMatch(/not a violation/i);
    expect(NY_PUBLIC_SNAPSHOT.firmMarket.note).toMatch(/performance/i);
  });

  it('preserves a deterministic fingerprint and nested mutations change it', () => {
    const asRecord = (value: unknown) => value as Record<string, unknown>;
    expect(fingerprintSemanticSnapshot(asRecord(NY_PUBLIC_SNAPSHOT))).toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedIa = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedIa.stateRia.approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedIa))).not.toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedNotice = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedNotice.federalNotice.noticeFiledDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedNotice))).not.toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedEra = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedEra.stateEra.activeDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedEra))).not.toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedOffice = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedOffice.nationalOverlay.nyPrincipalOfficeSecIardFirms += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedOffice))).not.toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedId = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedId.identityRules.UNSAFE = 'name-only is fine';
    expect(fingerprintSemanticSnapshot(asRecord(mutatedId))).not.toBe(NY_PUBLIC_FINGERPRINT);
    const mutatedCov = structuredClone(NY_PUBLIC_SNAPSHOT);
    mutatedCov.stateRia.STATE_RIA_BULK_ROSTER = 'SOURCE_NOT_ACQUIRED';
    expect(fingerprintSemanticSnapshot(asRecord(mutatedCov))).not.toBe(NY_PUBLIC_FINGERPRINT);
  });
});
