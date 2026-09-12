import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  IL_PUBLIC_FINGERPRINT,
  IL_PUBLIC_ROUTE,
  IL_PUBLIC_SNAPSHOT,
  assertIllinoisPublicIntel,
  mayAttachIlEvidenceToProfile,
  ilPersonCrdMayBecomeFirmCrd,
  ilPrincipalOfficeCountFromNationalRoster,
} from '../src/il-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('IL public snapshot', () => {
  it('keeps state IA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertIllinoisPublicIntel();
    expect(snap.fingerprint).toBe(IL_PUBLIC_FINGERPRINT);
    expect(IL_PUBLIC_ROUTE).toBe('/illinois');
    expect(ilPrincipalOfficeCountFromNationalRoster()).toBe(793);
    expect(snap.nationalOverlay.ilPrincipalOfficeSecIardFirms).toBe(793);
    expect(snap.nationalOverlay.rawCompilationMainAddrIl).not.toBe(793);
    expect(snap.stateRia.completeStateRiaCount).toBe(855);
    expect(snap.stateRia.registrationRows).toBe(855);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3560);
    expect(snap.stateEra.activeDistinctCrd).toBe(55);
    expect(snap.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=IL');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=IL');
    expect(snap.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.nationalOverlay.ilPrincipalOfficeSecIardFirms);
    expect(snap.sosFramework.notDfs).toBe(true);
  });

  it('keeps national RIA and ERA separate', () => {
    expect(IL_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(IL_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(IL_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.GRAPH_WRITES).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.IL_PRINCIPAL_OFFICE_FIRMS).toBe(793);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.PRE_EXISTING_IL_PRINCIPAL_OFFICE_OVERLAY).toBe(793);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.NEW_IL_STATE_IDENTITIES).toBe(910);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.EXACT_PROFILE_ATTACHMENTS).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.EXACT_ENFORCEMENT_FIRM_ASSOCIATIONS).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.notes.overlay).toMatch(/already existed/i);
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.notes.overlay).toMatch(/did not write new principal-office enrichment/i);
  });

  it('treats SOS enforcement census as UNKNOWN, not zero activity', () => {
    expect(IL_PUBLIC_SNAPSHOT.enforcement.result).toBe('PUBLIC_RESEARCH_PATH');
    expect(IL_PUBLIC_SNAPSHOT.enforcement.REGULATORY_ACTIVITY_COVERAGE).toBe('PUBLIC_RESEARCH_PATH');
    expect(IL_PUBLIC_SNAPSHOT.enforcement.COMPLETE_REGULATORY_ACTIVITY_COUNT).toBe('UNKNOWN');
    expect(IL_PUBLIC_SNAPSHOT.enforcement.observationRows).toBeNull();
    expect(IL_PUBLIC_SNAPSHOT.expansionLedger.IL_SECURITIES_ENFORCEMENT_OBSERVATIONS).toBeNull();
    expect(IL_PUBLIC_SNAPSHOT.enforcement.pdfsDownloaded).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.enforcement.exactCrdCrosswalks).toBe(0);
    expect(IL_PUBLIC_SNAPSHOT.enforcement.caveat).toMatch(/UNKNOWN, not zero/i);
    expect(IL_PUBLIC_SNAPSHOT.enforcement.caveat).toMatch(/execution counts/i);
    expect(IL_PUBLIC_SNAPSHOT.rejectedTotals.some((row) => /SOS regulatory activity rows = 0/.test(row.total))).toBe(
      true,
    );
  });

  it('rejects name-only adverse joins', () => {
    expect(mayAttachIlEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachIlEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachIlEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(ilPersonCrdMayBecomeFirmCrd()).toBe(false);
    expect(IL_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(IL_PUBLIC_SNAPSHOT.enforcement.notInvestmentAdviserEnforcementCensus).toBe(true);
    expect(IL_PUBLIC_SNAPSHOT.complaints.caveat).toMatch(/not a violation/i);
    expect(IL_PUBLIC_SNAPSHOT.firmMarket.note).toMatch(/performance/i);
  });

  it('preserves a deterministic fingerprint and nested mutations change it', () => {
    const asRecord = (value: unknown) => value as Record<string, unknown>;
    expect(fingerprintSemanticSnapshot(asRecord(IL_PUBLIC_SNAPSHOT))).toBe(IL_PUBLIC_FINGERPRINT);
    const mutatedIa = structuredClone(IL_PUBLIC_SNAPSHOT);
    mutatedIa.stateRia.approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedIa))).not.toBe(IL_PUBLIC_FINGERPRINT);
    const mutatedNotice = structuredClone(IL_PUBLIC_SNAPSHOT);
    mutatedNotice.federalNotice.noticeFiledDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedNotice))).not.toBe(IL_PUBLIC_FINGERPRINT);
    const mutatedEra = structuredClone(IL_PUBLIC_SNAPSHOT);
    mutatedEra.stateEra.activeDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedEra))).not.toBe(IL_PUBLIC_FINGERPRINT);
    const mutatedOffice = structuredClone(IL_PUBLIC_SNAPSHOT);
    mutatedOffice.nationalOverlay.ilPrincipalOfficeSecIardFirms += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedOffice))).not.toBe(IL_PUBLIC_FINGERPRINT);
  });
});
