import { describe, expect, it } from 'vitest';
import {
  MA_PUBLIC_FINGERPRINT,
  MA_PUBLIC_ROUTE,
  assertMassachusettsPublicIntel,
  maComplaintIsFinalFinding,
  maPrincipalOfficeCountFromNationalRoster,
  mayAttachMaEvidenceToProfile,
} from '../src/ma-public-intel';

describe('MA-INV-001 public intel', () => {
  it('partitions the accepted IAPD compilation without a second identity spine', () => {
    const snap = assertMassachusettsPublicIntel();
    expect(MA_PUBLIC_ROUTE).toBe('/massachusetts');
    expect(snap.fingerprint).toBe(MA_PUBLIC_FINGERPRINT);
    expect(maPrincipalOfficeCountFromNationalRoster()).toBe(803);
    expect(snap.stateRia.approvedDistinctCrd).toBe(773);
    expect(snap.stateRia.condrestDistinctCrd + snap.stateRia.termrequestDistinctCrd).toBe(21);
    expect(snap.stateEra.activeDistinctCrd).toBe(351);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(3272);
    expect(snap.federalNotice.overlapApprovedStateIaCrds).toHaveLength(6);
    expect(snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
  });

  it('keeps allegations, orders and attachments honest', () => {
    const e = assertMassachusettsPublicIntel().enforcement;
    expect(e.archiveYears).toEqual([2012, 2026]);
    expect(e.announcements).toBe(144);
    expect(e.observationRows).toBe(181);
    expect(e.documentTypes.COMPLAINT).toBe(81);
    expect(e.documentTypes.CONSENT_ORDER).toBe(75);
    expect(e.uniqueMatters).toBeNull();
    expect(e.pre2012).toBe('REQUEST_ONLY');
    expect(e.profileAttachments).toEqual([]);
    expect(maComplaintIsFinalFinding()).toBe(false);
    expect(mayAttachMaEvidenceToProfile('NAME_ONLY')).toBe(false);
    expect(mayAttachMaEvidenceToProfile('EXACT_CRD')).toBe(true);
  });
});
