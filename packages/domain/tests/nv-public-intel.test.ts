import { describe, expect, it } from 'vitest';
import {
  NV_PUBLIC_FINGERPRINT,
  NV_PUBLIC_ROUTE,
  assertNevadaPublicIntel,
  mayLinkNvOrderToFirm,
  nvPersonCrdMayBecomeFirmCrd,
  nvPrincipalOfficeCountFromNationalRoster,
} from '../src/nv-public-intel';

describe('NV-INV-001 public intel', () => {
  it('partitions the IAPD compilations without a second identity spine', () => {
    const snap = assertNevadaPublicIntel();
    expect(NV_PUBLIC_ROUTE).toBe('/nevada');
    expect(snap.fingerprint).toBe(NV_PUBLIC_FINGERPRINT);
    expect(nvPrincipalOfficeCountFromNationalRoster()).toBe(99);
    expect(snap.stateRia.approvedDistinctCrd).toBe(271);
    expect(snap.stateRia.termrequestDistinctCrd).toBe(10);
    expect(snap.stateEra.activeDistinctCrd).toBe(83);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(1982);
    expect(snap.stateRia.sourceAsOf).toBe('2026-09-17');
    expect(snap.federalNotice.sourceAsOf).toBe('2026-09-18');
    expect(snap.asOf).toBeNull();
    expect(snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    const text = JSON.stringify(snap);
    for (const sum of [271 + 83, 271 + 1982, 271 + 83 + 1982, 271 + 83 + 1982 + 99]) {
      expect(text).not.toMatch(new RegExp(`\b${sum}\b|\b${sum.toLocaleString('en-US')}\b`));
    }
  });

  it('claims no Securities Division order and attaches nothing', () => {
    const e = assertNevadaPublicIntel().enforcement;
    expect(e.NV_SECURITIES_ORDER_INDEX_STATUS).toBe('NOT_ACQUIRED_BOT_DEFENSE');
    expect(e.capability).toBe('KNOWN');
    expect(e.listings).toBeNull();
    expect(e.exactCrdLinks).toEqual([]);
    expect(e.profileAttachments).toEqual([]);
    expect(e.otherRegulatorsSubstituted).toBe(false);
    expect(mayLinkNvOrderToFirm('EXACT_FIRM_CRD_PRINTED_IN_ORDER')).toBe(false);
    expect(nvPersonCrdMayBecomeFirmCrd()).toBe(false);
  });
});
