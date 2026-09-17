import { PA_PUBLIC_SNAPSHOT, type PaPublicSnapshot } from './pa-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { PA_PUBLIC_SNAPSHOT, type PaPublicSnapshot };

export const PA_PUBLIC_ROUTE = '/pennsylvania' as const;
export const PA_PUBLIC_FINGERPRINT =
  '80420690c44566280ed43dd31e5a7976c182dbf473594d721d07ee3cfde5aad0';

export function paPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'PA');
  return row?.count ?? 0;
}

export function mayAttachPaEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_DOBS_MATTER_ID'
  );
}

export function paPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertPennsylvaniaPublicIntel(
  value: PaPublicSnapshot = PA_PUBLIC_SNAPSHOT,
): PaPublicSnapshot {
  if (value.version !== 'investor-pa-state-intel-v1') {
    throw new Error(`Unexpected Pennsylvania contract ${value.version}`);
  }
  if (value.fingerprint !== PA_PUBLIC_FINGERPRINT) {
    throw new Error('Pennsylvania public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.paPrincipalOfficeSecIardFirms !== paPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Pennsylvania principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.paPrincipalOfficeSecIardFirms !== 623) {
    throw new Error('Pennsylvania principal-office overlay must remain 623');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('Pennsylvania state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 864) {
    throw new Error('Pennsylvania approved state-IA count drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=PA')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=PA');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=PA')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=PA');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=PA')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=PA');
  }
  if (value.stateEra.activeDistinctCrd !== 99) {
    throw new Error('Pennsylvania state ERA count drifted');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 3411) {
    throw new Error('Pennsylvania notice-filed count drifted');
  }
  if (value.federalNotice.overlapApprovedStateIa !== 5) {
    throw new Error('Approved state IA / notice overlap drifted');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download DoBS enforcement PDFs in PA-INV-001');
  }
  if (value.enforcement.observationRows !== 1525) {
    throw new Error('DoBS enforcement document count drifted');
  }
  if (value.enforcement.PA_DOBS_SECURITIES_ORDER_DOCUMENTS !== null) {
    throw new Error('Do not invent a securities-only census without a source-native facet');
  }
  if (value.enforcement.exactCrdCrosswalks !== 0) {
    throw new Error('No exact CRD adverse crosswalks were accepted');
  }
  if (value.sosFramework.mixedDoBsSecuritiesClassTotalIsNotIa !== true) {
    throw new Error('Do not publish the mixed DoBS 200k+ class total as advisers');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in PA-INV-001');
  }
  if (value.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) {
    throw new Error('PA principal-office overlay was pre-existing; EXISTING_ORGANIZATIONS_ENRICHED must be 0');
  }
  if (value.expansionLedger.CLAIM_ELIGIBILITY_BROADENED !== false) {
    throw new Error('Claim eligibility must stay unchanged');
  }
  if (value.expansionLedger.GRAPH_WRITES !== 0) {
    throw new Error('PA-INV-001 must not write graph enrichment');
  }
  if (value.iar.pennsylvaniaPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish a Pennsylvania IAR person directory');
  }
  if (value.localWorkNeededNow !== 'NO') {
    throw new Error('Do not start local Pennsylvania work');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('PA-INV-001 publication gate is off');
  }
  if (value.route !== '/pennsylvania') {
    throw new Error('Pennsylvania route must be /pennsylvania');
  }
  return value;
}
