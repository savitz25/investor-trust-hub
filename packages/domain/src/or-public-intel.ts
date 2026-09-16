import { OR_PUBLIC_SNAPSHOT, type OrPublicSnapshot } from './or-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { OR_PUBLIC_SNAPSHOT, type OrPublicSnapshot };

export const OR_PUBLIC_ROUTE = '/oregon' as const;
export const OR_PUBLIC_FINGERPRINT =
  'c14319b60b458f87c0243af59c6119f7c914eeb442da2ee62bac4ac279c56443';

export function orPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'OR');
  return row?.count ?? 0;
}

export function mayAttachOrEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_DFR_MATTER_ID'
  );
}

export function orPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertOregonPublicIntel(
  value: OrPublicSnapshot = OR_PUBLIC_SNAPSHOT,
): OrPublicSnapshot {
  if (value.version !== 'investor-or-state-intel-v1') {
    throw new Error(`Unexpected Oregon contract ${value.version}`);
  }
  if (value.fingerprint !== OR_PUBLIC_FINGERPRINT) {
    throw new Error('Oregon public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.orPrincipalOfficeSecIardFirms !== orPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Oregon principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.orPrincipalOfficeSecIardFirms !== 167) {
    throw new Error('Oregon principal-office overlay must remain 167');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('Oregon state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 335) {
    throw new Error('Oregon approved state-IA count drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=OR')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=OR');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=OR')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=OR');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=OR')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=OR');
  }
  if (value.stateEra.activeDistinctCrd !== 26) {
    throw new Error('Oregon state ERA count drifted');
  }
  if (value.uiGrains.stateEra !== 'VISIBLE_PUBLIC_METRIC') {
    throw new Error('Acquired Oregon state ERA grain must be a visible public metric');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 2262) {
    throw new Error('Oregon notice-filed count drifted');
  }
  if (value.federalNotice.overlapApprovedStateIa !== 3) {
    throw new Error('Approved state IA / notice overlap drifted');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download DFR enforcement PDFs in OR-INV-001');
  }
  if (value.enforcement.observationRows !== 431) {
    throw new Error('Oregon DFR S- document row count drifted');
  }
  if (value.enforcement.distinctCaseNumbers !== 394) {
    throw new Error('Oregon DFR unique S- matters drifted');
  }
  if (value.enforcement.exactCrdCrosswalks !== 0) {
    throw new Error('No exact CRD adverse crosswalks were accepted');
  }
  if (value.sosFramework.notDfi !== true) {
    throw new Error('Oregon DFS is not the state investment-adviser regulator');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in OR-INV-001');
  }
  if (value.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) {
    throw new Error('OR principal-office overlay was pre-existing; EXISTING_ORGANIZATIONS_ENRICHED must be 0');
  }
  if (value.expansionLedger.CLAIM_ELIGIBILITY_BROADENED !== false) {
    throw new Error('Claim eligibility must stay unchanged');
  }
  if (value.expansionLedger.PRE_EXISTING_OR_PRINCIPAL_OFFICE_OVERLAY !== 167) {
    throw new Error('Pre-existing OR principal-office overlay must remain 167');
  }
  if (value.expansionLedger.GRAPH_WRITES !== 0) {
    throw new Error('OR-INV-001 must not write graph enrichment');
  }
  if (value.enforcement.COMPLETE_REGULATORY_ACTIVITY_COUNT !== 'UNKNOWN') {
    throw new Error('Complete DFR regulatory-activity count must remain UNKNOWN');
  }
  if (value.enforcement.REGULATORY_ACTIVITY_COVERAGE !== 'ACQUIRED_CURRENT_SNAPSHOT') {
    throw new Error('DFR S- document coverage must remain ACQUIRED_CURRENT_SNAPSHOT');
  }
  if (value.iar.oregonPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish an Oregon IAR person directory');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('OR-INV-001 publication gate is off');
  }
  if (value.route !== '/oregon') {
    throw new Error('Oregon route drifted');
  }
  return value;
}
