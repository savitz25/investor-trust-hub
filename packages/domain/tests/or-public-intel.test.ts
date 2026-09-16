import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  OR_PUBLIC_FINGERPRINT,
  OR_PUBLIC_ROUTE,
  OR_PUBLIC_SNAPSHOT,
  assertOregonPublicIntel,
  mayAttachOrEvidenceToProfile,
  orPersonCrdMayBecomeFirmCrd,
  orPrincipalOfficeCountFromNationalRoster,
} from '../src/or-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('OR public snapshot', () => {
  it('keeps state IA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertOregonPublicIntel();
    expect(snap.fingerprint).toBe(OR_PUBLIC_FINGERPRINT);
    expect(OR_PUBLIC_ROUTE).toBe('/oregon');
    expect(orPrincipalOfficeCountFromNationalRoster()).toBe(167);
    expect(snap.nationalOverlay.orPrincipalOfficeSecIardFirms).toBe(167);
    expect(snap.nationalOverlay.rawCompilationMainAddrOr).not.toBe(167);
    expect(snap.stateRia.completeStateRiaCount).toBe(335);
    expect(snap.stateRia.registrationRows).toBe(340);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(2262);
    expect(snap.stateEra.activeDistinctCrd).toBe(26);
    expect(snap.uiGrains.stateEra).toBe('VISIBLE_PUBLIC_METRIC');
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=OR');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=OR');
    expect(snap.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.nationalOverlay.orPrincipalOfficeSecIardFirms);
    expect(snap.sosFramework.notDfi).toBe(true);
  });

  it('keeps national RIA and ERA separate', () => {
    expect(OR_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(OR_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(OR_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.GRAPH_WRITES).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.OR_PRINCIPAL_OFFICE_FIRMS).toBe(167);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.PRE_EXISTING_OR_PRINCIPAL_OFFICE_OVERLAY).toBe(167);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_STATE_RESEARCH_IDENTITIES).toBe(366);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.EXACT_PROFILE_ATTACHMENTS).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.EXACT_ENFORCEMENT_FIRM_ASSOCIATIONS).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.notes.overlay).toMatch(/already existed/i);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.notes.overlay).toMatch(/did not write new principal-office enrichment/i);
  });

  it('acquires DFR S- documents without treating them as an IA disciplinary census or zero', () => {
    expect(OR_PUBLIC_SNAPSHOT.enforcement.result).toBe('ACQUIRED_CURRENT_SNAPSHOT');
    expect(OR_PUBLIC_SNAPSHOT.enforcement.REGULATORY_ACTIVITY_COVERAGE).toBe('ACQUIRED_CURRENT_SNAPSHOT');
    expect(OR_PUBLIC_SNAPSHOT.enforcement.COMPLETE_REGULATORY_ACTIVITY_COUNT).toBe('UNKNOWN');
    expect(OR_PUBLIC_SNAPSHOT.enforcement.observationRows).toBe(431);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.distinctCaseNumbers).toBe(394);
    expect(OR_PUBLIC_SNAPSHOT.expansionLedger.OR_DFR_ENFORCEMENT_ROWS).toBe(431);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.pdfsDownloaded).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.exactCrdCrosswalks).toBe(0);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.caveat).toMatch(/UNKNOWN/);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.notInvestmentAdviserEnforcementCensus).toBe(true);
    expect(OR_PUBLIC_SNAPSHOT.rejectedTotals.some((row) => /DFR regulatory activity rows = 0/.test(row.total))).toBe(
      true,
    );
  });

  it('rejects name-only adverse joins', () => {
    expect(mayAttachOrEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachOrEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachOrEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(orPersonCrdMayBecomeFirmCrd()).toBe(false);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(OR_PUBLIC_SNAPSHOT.enforcement.notInvestmentAdviserEnforcementCensus).toBe(true);
    expect(OR_PUBLIC_SNAPSHOT.complaints.caveat).toMatch(/not a violation/i);
    expect(OR_PUBLIC_SNAPSHOT.firmMarket.note).toMatch(/performance/i);
  });

  it('preserves a deterministic fingerprint and nested mutations change it', () => {
    const asRecord = (value: unknown) => value as Record<string, unknown>;
    expect(fingerprintSemanticSnapshot(asRecord(OR_PUBLIC_SNAPSHOT))).toBe(OR_PUBLIC_FINGERPRINT);
    const mutatedIa = structuredClone(OR_PUBLIC_SNAPSHOT);
    mutatedIa.stateRia.approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedIa))).not.toBe(OR_PUBLIC_FINGERPRINT);
    const mutatedNotice = structuredClone(OR_PUBLIC_SNAPSHOT);
    mutatedNotice.federalNotice.noticeFiledDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedNotice))).not.toBe(OR_PUBLIC_FINGERPRINT);
    const mutatedEra = structuredClone(OR_PUBLIC_SNAPSHOT);
    mutatedEra.stateEra.activeDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedEra))).not.toBe(OR_PUBLIC_FINGERPRINT);
    const mutatedOffice = structuredClone(OR_PUBLIC_SNAPSHOT);
    mutatedOffice.nationalOverlay.orPrincipalOfficeSecIardFirms += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedOffice))).not.toBe(OR_PUBLIC_FINGERPRINT);
  });
});
