import { TN_PUBLIC_SNAPSHOT, type TnPublicSnapshot } from './tn-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { TN_PUBLIC_SNAPSHOT, type TnPublicSnapshot };

export const TN_PUBLIC_ROUTE = '/tennessee' as const;
export const TN_PUBLIC_FINGERPRINT =
  'a2332c25eb07803d5e126c0a1935c3e8e0d9268d2fd9f3790e90fce65545f54e';

export function tnPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'TN');
  return row?.count ?? 0;
}

/** An order may be linked to a firm only through an exact firm CRD printed in the order itself. */
export function mayLinkTnOrderToFirm(matchStatus: string): boolean {
  return matchStatus === 'EXACT_FIRM_CRD_PRINTED_IN_ORDER';
}

export function tnCeaseAndDesistIsFinding(): false {
  return false;
}

export function tnPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertTennesseePublicIntel(value: TnPublicSnapshot = TN_PUBLIC_SNAPSHOT): TnPublicSnapshot {
  if (value.version !== 'investor-tn-state-intel-v1') throw new Error(`Unexpected Tennessee contract ${value.version}`);
  if (value.fingerprint !== TN_PUBLIC_FINGERPRINT) throw new Error('Tennessee public snapshot fingerprint drifted');
  if (value.route !== TN_PUBLIC_ROUTE) throw new Error('route');
  if (value.nationalOverlay.tnPrincipalOfficeSecIardFirms !== tnPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Tennessee principal-office overlay drifted from national roster');
  }
  const ia = value.stateRia;
  if (ia.registrationRows !== 328 || ia.distinctFirmCrd !== 328) throw new Error('TN state IA rows drifted');
  if (ia.approvedDistinctCrd !== 327 || ia.termrequestDistinctCrd !== 1 || ia.condrestDistinctCrd !== 0) {
    throw new Error('TN state IA status partition drifted');
  }
  if (ia.approvedDistinctCrd + ia.condrestDistinctCrd + ia.termrequestDistinctCrd !== ia.distinctFirmCrd) {
    throw new Error('TN state IA status remainder');
  }
  if (!ia.filter.includes('StateRgstn/Rgltr/@Cd=TN')) throw new Error('State RIA filter must use registration jurisdiction TN');
  if (value.stateEra.activeDistinctCrd !== 38 || value.stateEra.overlapWithStateIa !== 0) throw new Error('TN ERA lens drifted');
  if (value.federalNotice.noticeFiledDistinctCrd !== 2685) throw new Error('TN notice-filed count drifted');
  if (value.federalNotice.overlapApprovedStateIaCrds.length !== value.federalNotice.overlapApprovedStateIa) {
    throw new Error('exact CRD bridge list');
  }
  if (value.reconciliation.do_not_sum !== true) throw new Error('lenses are never summed');
  const e = value.enforcement;
  if (e.consentOrders.listings !== 273 || e.ceaseAndDesistOrders.listings !== 52) throw new Error('TN order archives drifted');
  if (e.finalAdministrativeOrders.listings !== 79 || e.initialOrders.listings !== 1) throw new Error('TN other order archives drifted');
  if (
    e.observationRows !==
    e.consentOrders.listings + e.ceaseAndDesistOrders.listings + e.finalAdministrativeOrders.listings + e.initialOrders.listings
  ) {
    throw new Error('listing partition');
  }
  if (!e.archivesKeptSeparate || !e.orderTypeKeptAsListed || !e.listingCountIsNotMatterCount) throw new Error('enforcement semantics');
  if (e.uniqueMatters !== null || e.distinctCaseNumbers !== null) throw new Error('matters are not claimed');
  if (e.nameOnly !== 'UNSAFE' || e.profileAttachments.length !== 0) throw new Error('no name-only or profile attachments');
  if (e.TN_ENFORCEMENT_EXACT_CRD_LINKS !== e.exactCrdLinks.length) throw new Error('exact CRD link list');
  if (!e.exactCrdLinks.every((l) => /^\d+$/.test(l.crd) && l.iapdFeeds.length > 0)) throw new Error('links need an exact IAPD firm CRD');
  if (e.identifierPass.personCrdsPublished !== false) throw new Error('person CRDs are not published');
  if (value.iar.TN_IAR_ROWS !== null || value.iar.TN_IAR_PERSON_DIRECTORY !== 'NOT_PUBLISHED') throw new Error('no IAR person population');
  if (value.brokerDealer.TN_DEALER_ROWS !== null || value.brokerDealer.TN_AGENT_ROWS !== null) throw new Error('no BD/agent bulk');
  if (value.complaints.TN_SECURITIES_COMPLAINT_ROWS !== null) throw new Error('no complaint census');
  if (value.capabilities.combined_investment_professional_count !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_attachment !== 'UNSUPPORTED') throw new Error('no name-only joins');
  if (value.expansionLedger.GRAPH_WRITES !== 0 || value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('no graph writes, no new canonical firms');
  }
  if (value.claimEligibilityBroadened !== false) throw new Error('claim eligibility unchanged');
  if (value.no_nashville_page !== true || value.no_memphis_page !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_ranking || !value.no_investment_advice) throw new Error('no ranking or advice');
  return value;
}
