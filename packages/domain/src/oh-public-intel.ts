import { OH_PUBLIC_SNAPSHOT, type OhPublicSnapshot } from './oh-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { OH_PUBLIC_SNAPSHOT, type OhPublicSnapshot };

export const OH_PUBLIC_ROUTE = '/ohio' as const;
export const OH_PUBLIC_FINGERPRINT =
  '5066d92b3b16cfc19c21edf722652dac764a13139e41335ebf46beb95eb6aa0b';

export function ohPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'OH');
  return row?.count ?? 0;
}

export function mayAttachOhEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD' || matchStatus === 'EXACT_FIRM_CRD';
}

export function ohPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function ohNohIsFinalFinding(): false {
  return false;
}

export function assertOhioPublicIntel(
  value: OhPublicSnapshot = OH_PUBLIC_SNAPSHOT,
): OhPublicSnapshot {
  if (value.version !== 'investor-oh-state-intel-v1') {
    throw new Error(`Unexpected Ohio contract ${value.version}`);
  }
  if (value.fingerprint !== OH_PUBLIC_FINGERPRINT) {
    throw new Error('Ohio public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.ohPrincipalOfficeSecIardFirms !== ohPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Ohio principal-office overlay drifted from national roster');
  }
  if (value.stateRia.approvedDistinctCrd !== 784) {
    throw new Error('IAPD OH approved state-IA count drifted');
  }
  if (value.stateRia.OH_STATE_IA_ROWS !== 785) {
    throw new Error('OH state IA rows drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=OH')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=OH');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 2733) {
    throw new Error('OH notice-filed count drifted');
  }
  if (value.enforcement.noh_ne_final !== true) {
    throw new Error('NOH is not a final finding');
  }
  if (value.enforcement.OH_ENFORCEMENT_EXACT_CRD_ATTACHMENTS !== 0) {
    throw new Error('No name-only or exact CRD enforcement attachments in this freeze');
  }
  if (value.star.OH_STAR_IA_ROSTER_STATUS !== 'OPEN_SEARCH_ONLY') {
    throw new Error('STAR IA roster must stay search-only');
  }
  if (value.expansionLedger.GRAPH_WRITES !== 0) {
    throw new Error('no graph writes');
  }
  if (value.claimEligibilityBroadened !== false) {
    throw new Error('claim eligibility unchanged');
  }
  if (value.no_columbus_page !== true || value.no_cleveland_page !== true) {
    throw new Error('no local Ohio pages');
  }
  return value;
}
