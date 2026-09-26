import { MN_PUBLIC_SNAPSHOT, type MnPublicSnapshot } from './mn-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { MN_PUBLIC_SNAPSHOT, type MnPublicSnapshot };

export const MN_PUBLIC_ROUTE = '/minnesota' as const;
export const MN_PUBLIC_FINGERPRINT =
  '5e60cddd13ec5a9c2efc786f722ff8df4e5aa0bae5f83cf1adedf6f22f2ed3c3';

export function mnPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'MN');
  return row?.count ?? 0;
}

/** A Commerce order links to a firm only through an exact firm CRD printed by Commerce; never by name. */
export function mayLinkMnOrderToFirm(matchStatus: string): boolean {
  return matchStatus === 'exact_firm_crd';
}

export function mnPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertMinnesotaPublicIntel(value: MnPublicSnapshot = MN_PUBLIC_SNAPSHOT): MnPublicSnapshot {
  if (value.version !== 'investor-mn-state-intel-v1') throw new Error(`Unexpected Minnesota contract ${value.version}`);
  if (value.fingerprint !== MN_PUBLIC_FINGERPRINT) throw new Error('Minnesota public snapshot fingerprint drifted');
  if (value.route !== MN_PUBLIC_ROUTE) throw new Error('route');
  if (value.nationalOverlay.mnPrincipalOfficeSecIardFirms !== mnPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Minnesota principal-office overlay drifted from national roster');
  }
  const ia = value.stateRia;
  if (ia.registrationRows !== 335 || ia.distinctFirmCrd !== 335) throw new Error('MN state IA rows drifted');
  if (ia.approvedDistinctCrd !== 333 || ia.termrequestDistinctCrd !== 2 || ia.condrestDistinctCrd !== 0) {
    throw new Error('MN state IA status partition drifted');
  }
  if (!ia.filter.includes('StateRgstn/Rgltr/@Cd=MN')) throw new Error('State RIA filter must use registration jurisdiction MN');
  if (value.stateEra.activeDistinctCrd !== 53 || value.stateEra.overlapWithStateIa !== 0) throw new Error('MN ERA lens drifted');
  if (value.federalNotice.noticeFiledDistinctCrd !== 2075) throw new Error('MN notice-filed count drifted');
  if (value.stateRia.sourceAsOf !== '2026-09-17' || value.federalNotice.sourceAsOf !== '2026-09-18') {
    throw new Error('IAPD STATE and SEC clocks stay separate');
  }
  if (value.asOf !== null || value.clocks.no_universal_minnesota_investor_clock !== true) throw new Error('no unified Minnesota clock');
  if (value.reconciliation.do_not_sum !== true) throw new Error('lenses are never summed');
  const e = value.enforcement;
  if (e.MN_SECURITIES_ORDER_INDEX_STATUS !== 'ACQUIRED_CARDS_INDEX' || e.rows !== 43 || e.securitiesScopeRows !== 40) {
    throw new Error('CARDS securities index drifted');
  }
  if (e.actions.length !== e.rows) throw new Error('every CARDS row is published');
  if (e.nameOnly !== 'UNSAFE' || e.profileAttachments.length !== 0) throw new Error('no name-only or profile attachments');
  for (const a of e.actions) {
    for (const crd of a.exactFirmCrdLinks) if (!(a.crdPrintedInIndex as readonly string[]).includes(crd)) throw new Error('exact links come from printed CRDs');
  }
  if (e.otherRegulatorsSubstituted !== false) throw new Error('no substitute regulator');
  if (value.iar.MN_IAR_ROWS !== null || value.iar.MN_IAR_PERSON_DIRECTORY !== 'NOT_PUBLISHED') throw new Error('no IAR person population');
  if (value.brokerDealer.MN_BD_ROWS !== null || value.brokerDealer.MN_AGENT_ROWS !== null) throw new Error('no BD/agent bulk');
  if (value.complaints.MN_SECURITIES_COMPLAINT_ROWS !== null) throw new Error('no complaint census');
  if (value.capabilities.combined_investment_professional_count !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_attachment !== 'UNSUPPORTED') throw new Error('no name-only joins');
  if (value.expansionLedger.GRAPH_WRITES !== 0 || value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('no graph writes, no new canonical firms');
  }
  if (value.claimEligibilityBroadened !== false) throw new Error('claim eligibility unchanged');
  if (!value.no_minneapolis_page || !value.no_st_paul_page || !value.no_rochester_page || !value.no_duluth_page) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_ranking || !value.no_investment_advice) throw new Error('no ranking or advice');
  return value;
}
