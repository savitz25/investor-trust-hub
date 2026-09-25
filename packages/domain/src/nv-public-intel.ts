import { NV_PUBLIC_SNAPSHOT, type NvPublicSnapshot } from './nv-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { NV_PUBLIC_SNAPSHOT, type NvPublicSnapshot };

export const NV_PUBLIC_ROUTE = '/nevada' as const;
export const NV_PUBLIC_FINGERPRINT =
  '951496e8f1ef02f7b2777455e965b0768c0a89c610dbe8d2a3b4ed192661f6f6';

export function nvPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'NV');
  return row?.count ?? 0;
}

/** No Nevada Securities Division listing was acquired, so no order can be linked to any firm or person. */
export function mayLinkNvOrderToFirm(_matchStatus: string): false {
  return false;
}

export function nvPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertNevadaPublicIntel(value: NvPublicSnapshot = NV_PUBLIC_SNAPSHOT): NvPublicSnapshot {
  if (value.version !== 'investor-nv-state-intel-v1') throw new Error(`Unexpected Nevada contract ${value.version}`);
  if (value.fingerprint !== NV_PUBLIC_FINGERPRINT) throw new Error('Nevada public snapshot fingerprint drifted');
  if (value.route !== NV_PUBLIC_ROUTE) throw new Error('route');
  if (value.nationalOverlay.nvPrincipalOfficeSecIardFirms !== nvPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Nevada principal-office overlay drifted from national roster');
  }
  const ia = value.stateRia;
  if (ia.registrationRows !== 281 || ia.distinctFirmCrd !== 281) throw new Error('NV state IA rows drifted');
  if (ia.approvedDistinctCrd !== 271 || ia.termrequestDistinctCrd !== 10 || ia.condrestDistinctCrd !== 0) {
    throw new Error('NV state IA status partition drifted');
  }
  if (ia.approvedDistinctCrd + ia.condrestDistinctCrd + ia.termrequestDistinctCrd !== ia.distinctFirmCrd) {
    throw new Error('NV state IA status remainder');
  }
  if (!ia.filter.includes('StateRgstn/Rgltr/@Cd=NV')) throw new Error('State RIA filter must use registration jurisdiction NV');
  if (value.stateEra.activeDistinctCrd !== 83 || value.stateEra.overlapWithStateIa !== 0) throw new Error('NV ERA lens drifted');
  if (value.federalNotice.noticeFiledDistinctCrd !== 1982) throw new Error('NV notice-filed count drifted');
  if (value.stateRia.sourceAsOf !== '2026-09-17' || value.federalNotice.sourceAsOf !== '2026-09-18') {
    throw new Error('IAPD STATE and SEC clocks stay separate');
  }
  if (value.asOf !== null || value.clocks.no_universal_nevada_investor_clock !== true) throw new Error('no unified Nevada clock');
  if (value.reconciliation.do_not_sum !== true) throw new Error('lenses are never summed');
  const e = value.enforcement;
  if (e.NV_SECURITIES_ORDER_INDEX_STATUS !== 'NOT_ACQUIRED_BOT_DEFENSE' || e.listings !== null || e.uniqueMatters !== null) {
    throw new Error('no enforcement listing is claimed');
  }
  if (e.otherRegulatorsSubstituted !== false) throw new Error('no substitute regulator');
  if (e.nameOnly !== 'UNSAFE' || e.profileAttachments.length !== 0 || e.exactCrdLinks.length !== 0) {
    throw new Error('no name-only, CRD or profile attachments');
  }
  if (value.iar.NV_IAR_ROWS !== null || value.iar.NV_IAR_PERSON_DIRECTORY !== 'NOT_PUBLISHED') throw new Error('no IAR person population');
  if (value.brokerDealer.NV_DEALER_ROWS !== null || value.brokerDealer.NV_SALES_REP_ROWS !== null) throw new Error('no BD/sales-rep bulk');
  if (value.complaints.NV_SECURITIES_COMPLAINT_ROWS !== null) throw new Error('no complaint census');
  if (value.capabilities.combined_investment_professional_count !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_attachment !== 'UNSUPPORTED') throw new Error('no name-only joins');
  if (value.expansionLedger.GRAPH_WRITES !== 0 || value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('no graph writes, no new canonical firms');
  }
  if (value.claimEligibilityBroadened !== false) throw new Error('claim eligibility unchanged');
  if (!value.no_las_vegas_page || !value.no_reno_page || !value.no_henderson_page) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_ranking || !value.no_investment_advice) throw new Error('no ranking or advice');
  return value;
}
