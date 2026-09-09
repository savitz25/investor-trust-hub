import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.nationalOverlay.coPrincipalOfficeSecIardFirms);
    expect(snap.stateRia.completeStateRiaCount).not.toBe(snap.federalNotice.noticeFiledDistinctCrd);
    expect(snap.federalNotice.noticeFiledDistinctCrd).not.toBe(snap.nationalOverlay.coPrincipalOfficeSecIardFirms);
    expect(snap.stateRia.filter).toMatch(/jurisdiction/i);
    expect(snap.stateRia.filter).toMatch(/Not MainAddr/i);
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
    expect(CO_PUBLIC_SNAPSHOT.stateRia.approvedDistinctCrd).not.toBe(
      CO_PUBLIC_SNAPSHOT.stateEra.activeDistinctCrd,
    );
  });

  it('does not treat the 589 overlay or state identities as entity growth', () => {
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.PRE_INGEST_COLORADO_PRINCIPAL_OFFICE_FIRMS).toBe(589);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED).toBe(0);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_STATE_IDENTITIES).toBe(950);
    expect(CO_PUBLIC_SNAPSHOT.expansionLedger.NEW_STATE_REGISTRATION_ROWS).toBe(950);
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
    const { fingerprint: _fp, ...rest } = CO_PUBLIC_SNAPSHOT;
    const hashed = createHash('sha256')
      .update(JSON.stringify(rest, Object.keys(rest).sort()))
      .digest('hex');
    expect(hashed).toBe(CO_PUBLIC_FINGERPRINT);
    expect(JSON.stringify(CO_PUBLIC_SNAPSHOT)).not.toMatch(/2026-09-09T/);
  });

  it('does not invent a combined Colorado adviser denominator', () => {
    expect(CO_PUBLIC_SNAPSHOT.rejectedTotals.some((row) => /589 \+ 740/.test(row.total))).toBe(true);
    expect(CO_PUBLIC_SNAPSHOT.semanticGuardrails).toContain('NO FAKE COMBINED COLORADO ADVISER DENOMINATOR');
    expect(CO_PUBLIC_SNAPSHOT.iar.coloradoPersonDirectory).toBe('NOT_PUBLISHED');
    expect(CO_PUBLIC_SNAPSHOT.brokerDealer.CO_BD_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
    expect(CO_PUBLIC_SNAPSHOT.complaints.completeComplaintCount).toBe('UNKNOWN');
  });
});
