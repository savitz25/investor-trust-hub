import { MA_PUBLIC_SNAPSHOT, type MaPublicSnapshot } from './ma-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { MA_PUBLIC_SNAPSHOT, type MaPublicSnapshot };

export const MA_PUBLIC_ROUTE = '/massachusetts' as const;
export const MA_PUBLIC_FINGERPRINT =
  '014fb959166d135153618b9781fd099322e0f1d4eec38d3bd3470dd282ee1930';

export function maPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'MA');
  return row?.count ?? 0;
}

/** Adverse evidence may attach to a profile only through an exact CRD printed in the official action. */
export function mayAttachMaEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD' || matchStatus === 'EXACT_FIRM_CRD';
}

export function maComplaintIsFinalFinding(): false {
  return false;
}

export function maPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertMassachusettsPublicIntel(value: MaPublicSnapshot = MA_PUBLIC_SNAPSHOT): MaPublicSnapshot {
  if (value.version !== 'investor-ma-state-intel-v1') throw new Error(`Unexpected Massachusetts contract ${value.version}`);
  if (value.fingerprint !== MA_PUBLIC_FINGERPRINT) throw new Error('Massachusetts public snapshot fingerprint drifted');
  if (value.route !== MA_PUBLIC_ROUTE) throw new Error('route');
  if (value.nationalOverlay.maPrincipalOfficeSecIardFirms !== maPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Massachusetts principal-office overlay drifted from national roster');
  }
  const ia = value.stateRia;
  if (ia.registrationRows !== 794 || ia.distinctFirmCrd !== 794) throw new Error('MA state IA rows drifted');
  if (ia.approvedDistinctCrd !== 773 || ia.condrestDistinctCrd !== 10 || ia.termrequestDistinctCrd !== 11) {
    throw new Error('MA state IA status partition drifted');
  }
  if (ia.approvedDistinctCrd + ia.condrestDistinctCrd + ia.termrequestDistinctCrd !== ia.distinctFirmCrd) {
    throw new Error('MA state IA status remainder');
  }
  if (!ia.filter.includes('StateRgstn/Rgltr/@Cd=MA')) throw new Error('State RIA filter must use registration jurisdiction MA');
  if (value.stateEra.activeDistinctCrd !== 351 || value.stateEra.overlapWithStateIa !== 0) throw new Error('MA ERA lens drifted');
  if (value.federalNotice.noticeFiledDistinctCrd !== 3272) throw new Error('MA notice-filed count drifted');
  if (value.federalNotice.overlapApprovedStateIaCrds.length !== value.federalNotice.overlapApprovedStateIa) {
    throw new Error('exact CRD bridge list');
  }
  if (value.reconciliation.do_not_sum !== true) throw new Error('lenses are never summed');
  const e = value.enforcement;
  if (e.announcements !== 144 || e.observationRows !== 181) throw new Error('MA enforcement archive drifted');
  if (e.archiveYears[0] !== 2012 || e.pre2012 !== 'REQUEST_ONLY') throw new Error('archive window');
  if (e.allegationDocuments + e.orderDocumentsAsListed + e.supportingDocuments !== e.observationRows) {
    throw new Error('document role partition');
  }
  if (e.uniqueMatters !== null) throw new Error('unique matters are not claimed');
  if (!e.complaintIsAllegationNotFinding || !e.documentCountIsNotMatterCount) throw new Error('enforcement semantics');
  if (e.nameOnly !== 'UNSAFE' || e.profileAttachments.length !== 0 || e.MA_ENFORCEMENT_EXACT_CRD_ATTACHMENTS !== 0) {
    throw new Error('no name-only or unverified adverse attachments');
  }
  if (value.iar.MA_IAR_ROWS !== null || value.iar.MA_IAR_PERSON_DIRECTORY !== 'NOT_PUBLISHED') throw new Error('no IAR person population');
  if (value.brokerDealer.MA_DEALER_ROWS !== null || value.brokerDealer.MA_AGENT_ROWS !== null) throw new Error('no BD/agent bulk');
  if (value.complaints.MA_SECURITIES_COMPLAINT_ROWS !== null) throw new Error('no complaint census');
  if (value.capabilities.combined_investment_professional_count !== 'UNSUPPORTED') throw new Error('no combined total');
  if (value.capabilities.name_only_adverse_attachment !== 'UNSUPPORTED') throw new Error('no name-only joins');
  if (value.expansionLedger.GRAPH_WRITES !== 0 || value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('no graph writes, no new canonical firms');
  }
  if (value.claimEligibilityBroadened !== false) throw new Error('claim eligibility unchanged');
  if (value.no_boston_page !== true || value.no_worcester_page !== true) throw new Error('no local pages');
  if (!value.no_trust_score || !value.no_ranking || !value.no_investment_advice) throw new Error('no ranking or advice');
  return value;
}
