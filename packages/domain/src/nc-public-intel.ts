import { NC_PUBLIC_SNAPSHOT, type NcPublicSnapshot } from './nc-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { NC_PUBLIC_SNAPSHOT, type NcPublicSnapshot };

export const NC_PUBLIC_ROUTE = '/north-carolina' as const;
export const NC_PUBLIC_FINGERPRINT =
  '697edd7ef765dcc52930e2953ddeb55d111a3cd361afba79504d76588a696325';

export function ncPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'NC');
  return row?.count ?? 0;
}

export function mayAttachNcEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD' || matchStatus === 'EXACT_FIRM_CRD';
}

export function ncPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function ncSummaryOrderIsFinalFinding(): false {
  return false;
}

export function assertNorthCarolinaPublicIntel(
  value: NcPublicSnapshot = NC_PUBLIC_SNAPSHOT,
): NcPublicSnapshot {
  if (value.version !== 'investor-nc-state-intel-v1') {
    throw new Error(`Unexpected North Carolina contract ${value.version}`);
  }
  if (value.fingerprint !== NC_PUBLIC_FINGERPRINT) {
    throw new Error('North Carolina public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.ncPrincipalOfficeSecIardFirms !== ncPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('North Carolina principal-office overlay drifted from national roster');
  }
  if (value.sosRegisters.NC_SOS_IA_DISTINCT_CRDS !== 687) {
    throw new Error('NC SOS IA distinct CRDs must stay 687');
  }
  if (value.stateRia.approvedDistinctCrd !== 701) {
    throw new Error('IAPD NC approved state-IA count drifted');
  }
  if (Number(value.sosRegisters.NC_SOS_IA_DISTINCT_CRDS) === Number(value.stateRia.approvedDistinctCrd)) {
    throw new Error('Do not collapse SOS register and IAPD state-IA clocks');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=NC')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=NC');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 3704) {
    throw new Error('NC notice-filed count drifted');
  }
  if (value.enforcement.summary_ne_final !== true) {
    throw new Error('Summary cease and desist is not a final finding');
  }
  if (value.enforcement.NC_ENFORCEMENT_EXACT_CRD_ATTACHMENTS !== 0) {
    throw new Error('No name-only or exact CRD enforcement attachments in this freeze');
  }
  if (value.expansionLedger.GRAPH_WRITES !== 0) {
    throw new Error('no graph writes');
  }
  if (value.claimEligibilityBroadened !== false) {
    throw new Error('claim eligibility unchanged');
  }
  if (value.no_charlotte_page !== true) {
    throw new Error('no Charlotte page');
  }
  return value;
}
