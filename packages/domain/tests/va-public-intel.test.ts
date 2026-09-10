import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  VA_PUBLIC_FINGERPRINT,
  VA_PUBLIC_ROUTE,
  VA_PUBLIC_SNAPSHOT,
  assertVirginiaPublicIntel,
  mayAttachVaEvidenceToProfile,
  vaPersonCrdMayBecomeFirmCrd,
  vaPrincipalOfficeCountFromNationalRoster,
} from '../src/va-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('VA public snapshot', () => {
  it('keeps state IA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertVirginiaPublicIntel();
    expect(snap.fingerprint).toBe(VA_PUBLIC_FINGERPRINT);
    expect(VA_PUBLIC_ROUTE).toBe('/virginia');
    expect(vaPrincipalOfficeCountFromNationalRoster()).toBe(339);
    expect(snap.nationalOverlay.vaPrincipalOfficeSecIardFirms).toBe(339);
    expect(snap.stateRia.completeStateRiaCount).toBe(697);
    expect(snap.stateRia.registrationRows).toBe(700);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3289);
    expect(snap.stateEra.activeDistinctCrd).toBe(107);
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=VA');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=VA');
    expect(snap.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(snap.sccAnnualReport.headline.investment_advisor_registrations_renewals_and_amendments_approved).toBe(4481);
    expect(snap.stateRia.completeStateRiaCount).not.toBe(4481);
  });

  it('keeps national RIA and ERA separate', () => {
    expect(VA_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(VA_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(VA_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(VA_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(VA_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(VA_PUBLIC_SNAPSHOT.expansionLedger.VA_PRINCIPAL_OFFICE_FIRMS).toBe(339);
    expect(VA_PUBLIC_SNAPSHOT.expansionLedger.EXACT_PROFILE_ATTACHMENTS).toBe(0);
    expect(VA_PUBLIC_SNAPSHOT.expansionLedger.EXACT_CRD_ADVERSE_CROSSWALKS).toBe(0);
  });

  it('rejects name-only adverse joins', () => {
    expect(mayAttachVaEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachVaEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachVaEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(vaPersonCrdMayBecomeFirmCrd()).toBe(false);
    expect(VA_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(VA_PUBLIC_SNAPSHOT.complaints.caveat).toMatch(/not a violation/i);
    expect(VA_PUBLIC_SNAPSHOT.firmMarket.note).toMatch(/performance/i);
  });

  it('preserves a deterministic fingerprint and nested mutations change it', () => {
    const asRecord = (value: unknown) => value as Record<string, unknown>;
    expect(fingerprintSemanticSnapshot(asRecord(VA_PUBLIC_SNAPSHOT))).toBe(VA_PUBLIC_FINGERPRINT);
    const mutatedIa = structuredClone(VA_PUBLIC_SNAPSHOT);
    mutatedIa.stateRia.approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedIa))).not.toBe(VA_PUBLIC_FINGERPRINT);
    const mutatedNotice = structuredClone(VA_PUBLIC_SNAPSHOT);
    mutatedNotice.federalNotice.noticeFiledDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedNotice))).not.toBe(VA_PUBLIC_FINGERPRINT);
    const mutatedAct = structuredClone(VA_PUBLIC_SNAPSHOT);
    mutatedAct.enforcement.observationRows += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedAct))).not.toBe(VA_PUBLIC_FINGERPRINT);
    const mutatedId = structuredClone(VA_PUBLIC_SNAPSHOT);
    mutatedId.identityRules.UNSAFE = 'name-only is fine';
    expect(fingerprintSemanticSnapshot(asRecord(mutatedId))).not.toBe(VA_PUBLIC_FINGERPRINT);
    const mutatedCov = structuredClone(VA_PUBLIC_SNAPSHOT);
    mutatedCov.stateRia.STATE_RIA_BULK_ROSTER = 'SOURCE_NOT_ACQUIRED';
    expect(fingerprintSemanticSnapshot(asRecord(mutatedCov))).not.toBe(VA_PUBLIC_FINGERPRINT);
  });
});
