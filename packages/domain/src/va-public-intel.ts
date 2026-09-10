import { VA_PUBLIC_SNAPSHOT, type VaPublicSnapshot } from './va-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { VA_PUBLIC_SNAPSHOT, type VaPublicSnapshot };

export const VA_PUBLIC_ROUTE = '/virginia' as const;
export const VA_PUBLIC_FINGERPRINT =
  'b5f82ff25157a614a18ec134253996ab54fc5961b282bda68ff228e85a525a7b';

export function vaPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'VA');
  return row?.count ?? 0;
}

export function mayAttachVaEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_VIRGINIA_SCC_CASE_ORDER_ID'
  );
}

export function vaPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertVirginiaPublicIntel(
  value: VaPublicSnapshot = VA_PUBLIC_SNAPSHOT,
): VaPublicSnapshot {
  if (value.version !== 'investor-va-state-intel-v1') {
    throw new Error(`Unexpected Virginia contract ${value.version}`);
  }
  if (value.fingerprint !== VA_PUBLIC_FINGERPRINT) {
    throw new Error('Virginia public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.vaPrincipalOfficeSecIardFirms !== vaPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Virginia principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.vaPrincipalOfficeSecIardFirms !== 339) {
    throw new Error('Virginia principal-office overlay must remain 339');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('Virginia state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 697) {
    throw new Error('Virginia approved state-IA count drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=VA')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=VA');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=VA')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=VA');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=VA')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=VA');
  }
  if (!value.nationalOverlay.grain.includes('principal-office')) {
    throw new Error('National overlay grain must remain principal-office geography');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download Virginia SCC order PDFs in VA-INV-001');
  }
  if (value.enforcement.exactCrdCrosswalks !== 0) {
    throw new Error('No exact CRD adverse crosswalks were accepted');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in VA-INV-001');
  }
  if (value.expansionLedger.EXACT_PROFILE_ATTACHMENTS !== 0) {
    throw new Error('No exact profile attachments were accepted');
  }
  if (value.iar.virginiaPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish a Virginia IAR person directory');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('VA-INV-001 publication gate is off');
  }
  if (value.route !== '/virginia') {
    throw new Error('Virginia route drifted');
  }
  if (value.sccAnnualReport.notCurrentRegistrantUniverse !== true) {
    throw new Error('2025 SRF activity is not a current registrant universe');
  }
  return value;
}
