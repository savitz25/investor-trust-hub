import { describe, expect, it } from 'vitest';
import { fingerprintSemanticSnapshot } from '../src/co-canonical-json';
import {
  CO_PUBLIC_FINGERPRINT,
  CO_PUBLIC_ROUTE,
  CO_PUBLIC_SNAPSHOT,
  assertColoradoPublicIntel,
  coPrincipalOfficeCountFromNationalRoster,
  mayAttachCoEvidenceToProfile,
  personCrdMayBecomeFirmCrd,
} from '../src/co-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('CO public snapshot', () => {
  it('keeps state RIA, SEC RIA, notice filing, ERA, and principal office on separate grains', () => {
    const snap = assertColoradoPublicIntel();
    expect(snap.fingerprint).toBe(CO_PUBLIC_FINGERPRINT);
    expect(CO_PUBLIC_ROUTE).toBe('/colorado');
    expect(coPrincipalOfficeCountFromNationalRoster()).toBe(589);
    expect(snap.nationalOverlay.coPrincipalOfficeSecIardFirms).toBe(589);
    expect(snap.stateRia.completeStateRiaCount).toBe(740);
    expect(snap.stateRia.registrationRows).toBe(741);
    expect(snap.stateRia.distinctFirmCrd).toBe(741);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3673);
    expect(snap.stateRia.filter).toContain('StateRgstn/Rgltr/@Cd=CO');
    expect(snap.federalNotice.filter).toContain('NoticeFiled/States/@RgltrCd=CO');
    expect(snap.stateEra.filter).toContain('ERA/Rgltr/@Cd=CO');
    expect(snap.nationalOverlay.grain).toMatch(/principal-office/i);
    expect(snap.semanticGrainRules.STATE_RIA_IS_DISTINCT_CREDENTIAL_FROM_NOTICE_FILING).toBe(true);
    expect(snap.nationalOverlay.caveat.toLowerCase()).toContain('not the colorado state-registered');
    expect(snap.stateRia.caveat.toLowerCase()).toContain('not an sec ria');
  });

  it('keeps national RIA and ERA separate and does not split CO geography by class', () => {
    expect(CO_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(CO_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(CO_PUBLIC_SNAPSHOT.riaEra.coPrincipalOfficeSplit).toBe('SOURCE_NOT_SPLIT');
    expect(CO_PUBLIC_SNAPSHOT.riaEra.caveat).toMatch(/ERA is not an RIA/);
    expect(CO_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd).toBe(209);
    expect(CO_PUBLIC_SNAPSHOT.stateEra.overlapWithStateIa).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.stateEra.filter).not.toBe(CO_PUBLIC_SNAPSHOT.stateRia.filter);
  });

  it('does not treat the 589 overlay or state identities as entity growth', () => {
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.PRE_INGEST_COLORADO_PRINCIPAL_OFFICE_FIRMS).toBe(589);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_STATE_IDENTITIES).toBe(950);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_STATE_REGISTRATION_ROWS).toBe(950);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_FEDERAL_NOTICE_FILING_ROWS).toBe(3673);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.TOTAL_NEW_COLORADO_REGULATORY_OBSERVATION_ROWS).toBe(4623);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_ENFORCEMENT_EVIDENCE_ROWS).toBe(10);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.EXACT_ADVERSE_PROFILE_ATTACHMENTS).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.REVIEW_REQUIRED_JOINS).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.REJECTED_UNSAFE_JOINS).toBe(10);
    expect(CO_PUBLIC_SNAPSHOT.growthClassification).toBe('INTELLIGENCE_GROWTH_HEAVY');
    expect(CO_PUBLIC_SNAPSHOT.preIngestBaseline.coloradoPrincipalOfficeFirmsAlreadyInFederalGraph).toBe(589);
  });

  it('rejects name-only adverse joins and person-as-firm CRD', () => {
    expect(CO_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(mayAttachCoEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachCoEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachCoEvidenceToProfile('EXACT_CRD')).toBe(true);
    expect(personCrdMayBecomeFirmCrd()).toBe(false);
    expect(CO_PUBLIC_SNAPSHOT.iar.grain).toMatch(/person CRD/);
    expect(CO_PUBLIC_SNAPSHOT.identityRules.UNSAFE).toMatch(/name alone/i);
    expect(CO_PUBLIC_SNAPSHOT.formD.caveat).toMatch(/!= COLORADO STATE APPROVAL/);
    expect(CO_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(CO_PUBLIC_SNAPSHOT.complaints.caveat).toMatch(/not a violation/i);
    expect(CO_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
    expect(CO_PUBLIC_SNAPSHOT.firmMarket.note).toMatch(/performance/i);
  });

  it('preserves distinct source clocks and a deterministic fingerprint', () => {
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf).toBe('2026-08-27');
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.retrievedAt).toBe('2026-08-28');
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.sourceAsOf).not.toBe(CO_PUBLIC_SNAPSHOT.asOf);
    expect(CO_PUBLIC_SNAPSHOT.stateRia.retrievedAt).toBe('2026-08-28');
    expect(CO_PUBLIC_SNAPSHOT.stateRia.sourceAsOf).toBe('2026-08-27');
    expect(CO_PUBLIC_SNAPSHOT.enforcement.retrievedAt).toBe('2026-09-09');
    expect(CO_PUBLIC_SNAPSHOT.enforcement.sourceAsOf).toBeNull();
    expect(JSON.stringify(CO_PUBLIC_SNAPSHOT)).not.toMatch(/2026-09-09T/);
  });

  it('computes the six-CRD state-IA / notice overlap by exact CRD intersection', () => {
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIa).toBe(6);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIaJoinMethod).toMatch(/exact firm CRD/);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIaCrds).toHaveLength(6);
    expect(new Set(CO_PUBLIC_SNAPSHOT.federalNotice.overlapApprovedStateIaCrds).size).toBe(6);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.caveat).toMatch(/not perfectly disjoint/i);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.filedFirmType.Registered).toBe(3673);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.filedFirmType.ERA).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.filedFirmType.other).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.federalNotice.filedFirmType.blank).toBe(0);
  });

  it('uses a recursive semantic fingerprint that reacts to nested mutations', () => {
    const clone = structuredClone(CO_PUBLIC_SNAPSHOT) as Record<string, unknown>;
    const once = fingerprintSemanticSnapshot(clone);
    const twice = fingerprintSemanticSnapshot(structuredClone(CO_PUBLIC_SNAPSHOT) as Record<string, unknown>);
    expect(once).toBe(CO_PUBLIC_FINGERPRINT);
    expect(twice).toBe(once);

    const withExtraFingerprint = structuredClone(CO_PUBLIC_SNAPSHOT) as Record<string, unknown>;
    withExtraFingerprint.fingerprint = '0'.repeat(64);
    expect(fingerprintSemanticSnapshot(withExtraFingerprint)).toBe(once);

    const stateMut = structuredClone(CO_PUBLIC_SNAPSHOT) as typeof CO_PUBLIC_SNAPSHOT;
    (stateMut.stateRia as { approvedDistinctCrd: number }).approvedDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(stateMut as unknown as Record<string, unknown>)).not.toBe(once);

    const noticeMut = structuredClone(CO_PUBLIC_SNAPSHOT) as typeof CO_PUBLIC_SNAPSHOT;
    (noticeMut.federalNotice as { noticeFiledDistinctCrd: number }).noticeFiledDistinctCrd += 1;
    expect(fingerprintSemanticSnapshot(noticeMut as unknown as Record<string, unknown>)).not.toBe(once);

    const enfMut = structuredClone(CO_PUBLIC_SNAPSHOT) as typeof CO_PUBLIC_SNAPSHOT;
    (enfMut.enforcement as { rowsNameOnly: number }).rowsNameOnly += 1;
    expect(fingerprintSemanticSnapshot(enfMut as unknown as Record<string, unknown>)).not.toBe(once);
  });

  it('does not invent a combined Colorado adviser denominator', () => {
    expect(CO_PUBLIC_SNAPSHOT.rejectedTotals.some((row) => /589 \+ 740/.test(row.total))).toBe(true);
    expect(CO_PUBLIC_SNAPSHOT.semanticGuardrails).toContain('NO FAKE COMBINED COLORADO ADVISER DENOMINATOR');
    expect(CO_PUBLIC_SNAPSHOT.iar.coloradoPersonDirectory).toBe('NOT_PUBLISHED');
    expect(CO_PUBLIC_SNAPSHOT.brokerDealer.CO_BD_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
    expect(CO_PUBLIC_SNAPSHOT.complaints.completeComplaintCount).toBe('UNKNOWN');
    expect(CO_PUBLIC_SNAPSHOT.nationalOverlay.universe).toBe(23622);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_FEDERAL_NOTICE_FILING_ROWS).toBe(3673);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
  });
});
