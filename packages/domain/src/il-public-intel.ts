import { IL_PUBLIC_SNAPSHOT, type IlPublicSnapshot } from './il-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { IL_PUBLIC_SNAPSHOT, type IlPublicSnapshot };

export const IL_PUBLIC_ROUTE = '/illinois' as const;
export const IL_PUBLIC_FINGERPRINT =
  '997728ec50c9a913a64283b7a10810440c1e0b88e7fae03a91df58df3997534d';

export function ilPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'IL');
  return row?.count ?? 0;
}

export function mayAttachIlEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_SOS_MATTER_ID'
  );
}

export function ilPersonCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertIllinoisPublicIntel(
  value: IlPublicSnapshot = IL_PUBLIC_SNAPSHOT,
): IlPublicSnapshot {
  if (value.version !== 'investor-il-state-intel-v1') {
    throw new Error(`Unexpected Illinois contract ${value.version}`);
  }
  if (value.fingerprint !== IL_PUBLIC_FINGERPRINT) {
    throw new Error('Illinois public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.ilPrincipalOfficeSecIardFirms !== ilPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Illinois principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.ilPrincipalOfficeSecIardFirms !== 793) {
    throw new Error('Illinois principal-office overlay must remain 793');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('Illinois state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 855) {
    throw new Error('Illinois approved state-IA count drifted');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=IL')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=IL');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=IL')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=IL');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=IL')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=IL');
  }
  if (value.stateEra.activeDistinctCrd !== 55) {
    throw new Error('Illinois state ERA count drifted');
  }
  if (value.uiGrains.stateEra !== 'VISIBLE_PUBLIC_METRIC') {
    throw new Error('Acquired Illinois state ERA grain must be a visible public metric');
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.federalNotice.noticeFiledDistinctCrd !== 3560) {
    throw new Error('Illinois notice-filed count drifted');
  }
  if (value.federalNotice.overlapApprovedStateIa !== 1) {
    throw new Error('Approved state IA / notice overlap drifted');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download SOS enforcement PDFs in IL-INV-001');
  }
  if (value.enforcement.exactCrdCrosswalks !== 0) {
    throw new Error('No exact CRD adverse crosswalks were accepted');
  }
  if (value.sosFramework.notDfs !== true) {
    throw new Error('Illinois DFS is not the state investment-adviser regulator');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in IL-INV-001');
  }
  if (value.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED !== 0) {
    throw new Error('IL principal-office overlay was pre-existing; EXISTING_ORGANIZATIONS_ENRICHED must be 0');
  }
  if (value.expansionLedger.PRE_EXISTING_IL_PRINCIPAL_OFFICE_OVERLAY !== 793) {
    throw new Error('Pre-existing IL principal-office overlay must remain 793');
  }
  if (value.expansionLedger.GRAPH_WRITES !== 0) {
    throw new Error('IL-INV-001 must not write graph enrichment');
  }
  if (value.enforcement.COMPLETE_REGULATORY_ACTIVITY_COUNT !== 'UNKNOWN') {
    throw new Error('Complete SOS regulatory-activity count must remain UNKNOWN');
  }
  if (value.enforcement.REGULATORY_ACTIVITY_COVERAGE !== 'PUBLIC_RESEARCH_PATH') {
    throw new Error('SOS coverage must remain PUBLIC_RESEARCH_PATH');
  }
  if (value.iar.illinoisPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish an Illinois IAR person directory');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('IL-INV-001 publication gate is off');
  }
  if (value.route !== '/illinois') {
    throw new Error('Illinois route drifted');
  }
  return value;
}
