import { describe, expect, it } from 'vitest';
import {
  TX_PUBLIC_FINGERPRINT,
  TX_PUBLIC_ROUTE,
  TX_PUBLIC_SNAPSHOT,
  assertTexasPublicIntel,
  txPrincipalOfficeCountFromNationalRoster,
  mayAttachTxEvidenceToProfile,
} from '../src/tx-public-intel';
import { V1_SEC_ROSTER } from '../src/investor-home-intel';

describe('TX public snapshot', () => {
  it('reconciles the federal Texas principal-office overlay without a state-RIA denominator', () => {
    const snap = assertTexasPublicIntel();
    expect(snap.fingerprint).toBe(TX_PUBLIC_FINGERPRINT);
    expect(TX_PUBLIC_ROUTE).toBe('/texas');
    expect(txPrincipalOfficeCountFromNationalRoster()).toBe(1302);
    expect(snap.nationalOverlay.txPrincipalOfficeSecIardFirms).toBe(1302);
    expect(snap.nationalOverlay.caveat.toLowerCase()).toContain('not the texas state-registered');
    expect(snap.stateRia.completeStateRiaCount).toBe('UNKNOWN');
    expect(snap.stateRia.STATE_RIA_BULK_ROSTER).toBe('SOURCE_NOT_ACQUIRED');
  });

  it('keeps national RIA and ERA separate and does not split TX geography by class', () => {
    expect(TX_PUBLIC_SNAPSHOT.riaEra.nationalRiaFacts).toBe(V1_SEC_ROSTER.riaFacts);
    expect(TX_PUBLIC_SNAPSHOT.riaEra.nationalEraFacts).toBe(V1_SEC_ROSTER.eraFacts);
    expect(TX_PUBLIC_SNAPSHOT.riaEra.txPrincipalOfficeSplit).toBe('SOURCE_NOT_SPLIT');
    expect(TX_PUBLIC_SNAPSHOT.riaEra.caveat).toMatch(/ERA is not an RIA/);
  });

  it('withholds unsafe enforcement attachment and Form D quality claims', () => {
    expect(TX_PUBLIC_SNAPSHOT.profileAttachments).toEqual([]);
    expect(mayAttachTxEvidenceToProfile('UNSAFE')).toBe(false);
    expect(mayAttachTxEvidenceToProfile('REVIEW_REQUIRED')).toBe(false);
    expect(mayAttachTxEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
    expect(TX_PUBLIC_SNAPSHOT.formD.caveat).toMatch(/!= TEXAS STATE APPROVAL/);
    expect(TX_PUBLIC_SNAPSHOT.enforcement.doNotCalculateEnforcementRate).toBe(true);
    expect(TX_PUBLIC_SNAPSHOT.exam.passFailMetric).toBe(false);
  });
});
