import { describe, expect, it } from 'vitest';
import {
  MN_PUBLIC_FINGERPRINT,
  MN_PUBLIC_ROUTE,
  assertMinnesotaPublicIntel,
  mayLinkMnOrderToFirm,
  mnPersonCrdMayBecomeFirmCrd,
  mnPrincipalOfficeCountFromNationalRoster,
} from '../src/mn-public-intel';

describe('MN-INV-001 public intel', () => {
  it('partitions the IAPD compilations without a second identity spine', () => {
    const snap = assertMinnesotaPublicIntel();
    expect(MN_PUBLIC_ROUTE).toBe('/minnesota');
    expect(snap.fingerprint).toBe(MN_PUBLIC_FINGERPRINT);
    expect(mnPrincipalOfficeCountFromNationalRoster()).toBe(293);
    expect(snap.stateRia.approvedDistinctCrd).toBe(333);
    expect(snap.stateRia.termrequestDistinctCrd).toBe(2);
    expect(snap.stateEra.activeDistinctCrd).toBe(53);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(2075);
    expect(snap.federalNotice.overlapApprovedStateIa).toBe(5);
    expect(snap.stateRia.sourceAsOf).toBe('2026-09-17');
    expect(snap.federalNotice.sourceAsOf).toBe('2026-09-18');
    expect(snap.asOf).toBeNull();
    expect(snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    expect(snap.expansionLedger.GRAPH_WRITES).toBe(0);
    const text = JSON.stringify({ ...snap, enforcement: null });
    for (const sum of [333 + 53, 333 + 2075, 333 + 53 + 2075, 333 + 53 + 2075 + 293]) {
      expect(text).not.toMatch(new RegExp(`\\b${sum}\\b|\\b${sum.toLocaleString('en-US')}\\b`));
    }
  });

  it('keeps CARDS actions as listed and attaches only by exact firm CRD', () => {
    const e = assertMinnesotaPublicIntel().enforcement;
    expect(e.MN_SECURITIES_ORDER_INDEX_STATUS).toBe('ACQUIRED_CARDS_INDEX');
    expect(e.rows).toBe(43);
    expect(e.securitiesScopeRows).toBe(40);
    expect(e.otherSecuritiesUnitProgramRows).toBe(3);
    expect(e.distinctCaseNumbers).toBeNull();
    expect(e.coverage).toBe('PARTIAL');
    expect(e.profileAttachments).toEqual([]);
    expect(e.otherRegulatorsSubstituted).toBe(false);
    expect(e.nameOnly).toBe('UNSAFE');
    for (const a of e.actions) {
      expect(a.signedDate >= '2022-01-01' && a.signedDate <= '2026-09-26', a.document).toBe(true);
      for (const crd of a.exactFirmCrdLinks) expect(a.crdPrintedInIndex).toContain(crd);
      if (a.crdPrintedInIndex.length === 0) expect(a.attribution).toBe('standalone_no_identifier');
    }
    const wesselt = e.actions.find((a) => a.document === '278593-A')!;
    expect(wesselt.crdPrintedInIndex).toEqual(['2195569']);
    expect(wesselt.exactFirmCrdLinks).toEqual([]);
    expect(wesselt.attribution).toBe('printed_crd_not_iapd_firm');
    const other = e.actions.filter((a) => a.scope !== 'securities').map((a) => a.document).sort();
    expect(other).toEqual(['260868-A', '273332-A', '491270-A']);
    // Same respondent name on several rows is never merged or linked by name.
    expect(e.actions.filter((a) => /EDWARD D\.? JONES/.test(a.respondentAsListed)).every((a) => a.exactFirmCrdLinks.length === 0)).toBe(true);
    expect(mayLinkMnOrderToFirm('exact_firm_crd')).toBe(true);
    expect(mayLinkMnOrderToFirm('name_match')).toBe(false);
    expect(mnPersonCrdMayBecomeFirmCrd()).toBe(false);
  });
});
