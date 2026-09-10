import { NY_PUBLIC_SNAPSHOT, type NyPublicSnapshot } from './ny-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { NY_PUBLIC_SNAPSHOT, type NyPublicSnapshot };

export const NY_PUBLIC_ROUTE = '/new-york' as const;
export const NY_PUBLIC_FINGERPRINT =
  '75ebcafb799270b54c3e84b9edfa1b05e145f74d6efdcdeae69cf3ebe10bc88b';

export function nyPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'NY');
  return row?.count ?? 0;
}

export function mayAttachNyEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_OAG_MATTER_ID'
  );
}

export function nyPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertNewYorkPublicIntel(
  value: NyPublicSnapshot = NY_PUBLIC_SNAPSHOT,
): NyPublicSnapshot {
  if (value.version !== 'investor-ny-state-intel-v1') {
    throw new Error(`Unexpected New York contract ${value.version}`);
  }
  if (value.fingerprint !== NY_PUBLIC_FINGERPRINT) {
    throw new Error('New York public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.nyPrincipalOfficeSecIardFirms !== nyPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('New York principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.nyPrincipalOfficeSecIardFirms !== 3152) {
    throw new Error('New York principal-office overlay must remain 3152');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('New York state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 1297) {
    throw new Error('New York approved state-IA count drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=NY')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=NY');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=NY')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=NY');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=NY')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=NY');
  }
  if (value.stateEra.activeDistinctCrd !== 327) {
    throw new Error('New York state ERA count drifted');
  }
  if (value.uiGrains.stateEra !== 'VISIBLE_PUBLIC_METRIC') {
    throw new Error('Acquired New York state ERA grain must be a visible public metric');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 5856) {
    throw new Error('New York notice-filed count drifted');
  }
  if (value.federalNotice.overlapApprovedStateIa !== 27) {
    throw new Error('Approved state IA / notice overlap drifted');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download OAG enforcement PDFs in NY-INV-001');
  }
  if (value.enforcement.exactCrdCrosswalks !== 0) {
    throw new Error('No exact CRD adverse crosswalks were accepted');
  }
  if (value.oagFramework.notDfs !== true) {
    throw new Error('New York DFS is not the state investment-adviser regulator');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in NY-INV-001');
  }
  if (value.iar.newYorkPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish a New York IAR person directory');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('NY-INV-001 publication gate is off');
  }
  if (value.route !== '/new-york') {
    throw new Error('New York route drifted');
  }
  return value;
}
