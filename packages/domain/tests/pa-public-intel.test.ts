import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  PA_PUBLIC_FINGERPRINT,
  PA_PUBLIC_ROUTE,
  PA_PUBLIC_SNAPSHOT,
  assertPennsylvaniaPublicIntel,
  mayAttachPaEvidenceToProfile,
  paPersonCrdMayBecomeFirmCrd,
  paPrincipalOfficeCountFromNationalRoster,
} from '../src/pa-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('PA public snapshot', () => {
  it('keeps state IA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertPennsylvaniaPublicIntel();
    expect(snap.fingerprint).toBe(PA_PUBLIC_FINGERPRINT);
    expect(PA_PUBLIC_ROUTE).toBe('/pennsylvania');
    expect(paPrincipalOfficeCountFromNationalRoster()).toBe(623);
    expect(snap.nationalOverlay.paPrincipalOfficeSecIardFirms).toBe(623);
    expect(snap.nationalOverlay.rawCompilationMainAddrPa).not.toBe(623);
    expect(snap.stateRia.completeStateRiaCount).toBe(864);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3411);
    expect(snap.stateEra.activeDistinctCrd).toBe(99);
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=PA');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=PA');
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.nationalOverlay.paPrincipalOfficeSecIardFirms);
  });

  it('keeps national RIA and ERA separate and does not mix the DoBS 200k class total', () => {
    expect(PA_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(PA_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.sosFramework.mixedDoBsSecuritiesClassTotalIsNotIa).toBe(true);
    expect(PA_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIa).toBe(5);
  });

  it('does not treat overlay or state identities as entity growth', () => {
    expect(PA_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.expansionLedger.GRAPH_WRITES).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_STATE_RESEARCH_IDENTITIES).toBe(963);
    expect(PA_PUBLIC_SNAPSHOT.expansionLedger.EXACT_PROFILE_ATTACHMENTS).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.localWorkNeededNow).toBe('NO');
  });

  it('acquires mixed DoBS orders without inventing an IA disciplinary census', () => {
    expect(PA_PUBLIC_SNAPSHOT.enforcement.observationRows).toBe(1525);
    expect(PA_PUBLIC_SNAPSHOT.enforcement.PA_DOBS_SECURITIES_ORDER_DOCUMENTS).toBeNull();
    expect(PA_PUBLIC_SNAPSHOT.enforcement.distinctCaseNumbers).toBeNull();
    expect(PA_PUBLIC_SNAPSHOT.enforcement.exactCrdCrosswalks).toBe(0);
    expect(PA_PUBLIC_SNAPSHOT.enforcement.notInvestmentAdviserEnforcementCensus).toBe(true);
    expect(PA_PUBLIC_SNAPSHOT.enforcement.pdfsDownloaded).toBe(0);
  });

  it('rejects name-only adverse joins', () => {
    expect(mayAttachPaEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachPaEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(paPersonCrdMayBecomeFirmCrd()).toBe(false);
  });

  it('preserves a deterministic fingerprint and nested mutations change it', () => {
    const asRecord = (value: unknown) => value as Record<string, unknown>;
    expect(fingerprintSemanticSnapshot(asRecord(PA_PUBLIC_SNAPSHOT))).toBe(PA_PUBLIC_FINGERPRINT);
    const mutatedIa = structuredClone(PA_PUBLIC_SNAPSHOT);
    mutatedIa.stateRia.approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(asRecord(mutatedIa))).not.toBe(PA_PUBLIC_FINGERPRINT);
  });

  it('has no copied Oregon or Illinois public semantics', () => {
    const blob = JSON.stringify(PA_PUBLIC_SNAPSHOT);
    expect(blob).not.toMatch(/Oregon|DFR|Illinois|IDFPR|IDPH/);
    expect(blob).not.toMatch(/MainAddr\/@State=OR|Rgltr\/@Cd=OR|RgltrCd=IL/);
  });
});
