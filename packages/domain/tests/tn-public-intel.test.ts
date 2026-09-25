import { describe, expect, it } from 'vitest';
import {
  TN_PUBLIC_FINGERPRINT,
  TN_PUBLIC_ROUTE,
  assertTennesseePublicIntel,
  mayLinkTnOrderToFirm,
  tnCeaseAndDesistIsFinding,
  tnPrincipalOfficeCountFromNationalRoster,
} from '../src/tn-public-intel';

describe('TN-INV-001 public intel', () => {
  it('partitions the accepted IAPD compilation without a second identity spine', () => {
    const snap = assertTennesseePublicIntel();
    expect(TN_PUBLIC_ROUTE).toBe('/tennessee');
    expect(snap.fingerprint).toBe(TN_PUBLIC_FINGERPRINT);
    expect(tnPrincipalOfficeCountFromNationalRoster()).toBe(264);
    expect(snap.stateRia.approvedDistinctCrd).toBe(327);
    expect(snap.stateRia.termrequestDistinctCrd).toBe(1);
    expect(snap.stateEra.activeDistinctCrd).toBe(38);
    expect(snap.federalNotice.noticeFiledDistinctCrd).toBe(2685);
    expect(snap.federalNotice.overlapApprovedStateIaCrds).toEqual(['149172', '332005', '334134']);
    expect(snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS).toBe(0);
    const text = JSON.stringify(snap);
    for (const sum of [327 + 38, 327 + 2685, 327 + 38 + 2685, 327 + 38 + 2685 + 264]) {
      expect(text).not.toMatch(new RegExp(`\\b${sum}\\b|\\b${sum.toLocaleString('en-US')}\\b`));
    }
  });

  it('keeps each order archive separate and links orders only by exact firm CRD', () => {
    const e = assertTennesseePublicIntel().enforcement;
    expect(e.consentOrders.listings).toBe(273);
    expect(e.ceaseAndDesistOrders.listings).toBe(52);
    expect(e.consentOrders.listingsSince2012).toBe(149);
    expect(e.ceaseAndDesistOrders.listingsSince2012).toBe(22);
    expect(e.distinctCaseNumbers).toBeNull();
    expect(e.profileAttachments).toEqual([]);
    expect(e.exactCrdLinks.map((l) => l.crd)).toEqual(['250', '141882', '705']);
    expect(e.identifierPass.iapdFirmCrdsPrintedNotRespondent).toBe(1);
    expect(e.identifierPass.personCrdsPublished).toBe(false);
    expect(tnCeaseAndDesistIsFinding()).toBe(false);
    expect(mayLinkTnOrderToFirm('NAME_ONLY')).toBe(false);
    expect(mayLinkTnOrderToFirm('EXACT_FIRM_CRD_PRINTED_IN_ORDER')).toBe(true);
  });
});
