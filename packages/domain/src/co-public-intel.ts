import { CO_PUBLIC_SNAPSHOT, type CoPublicSnapshot } from './co-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { CO_PUBLIC_SNAPSHOT, type CoPublicSnapshot };

export const CO_PUBLIC_ROUTE = '/colorado' as const;
export const CO_PUBLIC_FINGERPRINT =
  '0da0aa6fad8ee73fd141783b08a716c44e8bba42fd0ea43525ff66d53286132d';

export function coPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'CO');
  return row?.count ?? 0;
}

export type CoProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdCoProfileAttachments(crd: string | null | undefined): CoProfileAttachment[] {
  if (!crd) return [];
  const rows = CO_PUBLIC_SNAPSHOT.profileAttachments as readonly CoProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachCoEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_FIRM_CRD' ||
    matchStatus === 'EXACT_COLORADO_CASE_ORDER_FILE_ID'
  );
}

export function personCrdMayBecomeFirmCrd(): false {
  return false;
}

export function assertColoradoPublicIntel(
  value: CoPublicSnapshot = CO_PUBLIC_SNAPSHOT,
): CoPublicSnapshot {
  if (value.version !== 'investor-co-state-intel-v1') {
    throw new Error(`Unexpected Colorado contract ${value.version}`);
  }
  if (value.fingerprint !== CO_PUBLIC_FINGERPRINT) {
    throw new Error('Colorado public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.coPrincipalOfficeSecIardFirms !== coPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Colorado principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.coPrincipalOfficeSecIardFirms !== 589) {
    throw new Error('Colorado principal-office overlay must remain 589');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'ACQUIRED_IAPD_STATE_COMPILATION') {
    throw new Error('Colorado state-IA bulk layer must remain the IAPD state compilation');
  }
  if (value.stateRia.completeStateRiaCount !== 740) {
    throw new Error('Colorado approved state-IA count drifted');
  }
  if (typeof value.stateRia.registrationRows !== 'number' || typeof value.stateRia.distinctFirmCrd !== 'number') {
    throw new Error('Registration rows and distinct CRD must remain separate numeric fields');
  }
  if (!value.stateRia.filter.includes('StateRgstn/Rgltr/@Cd=CO')) {
    throw new Error('State RIA filter must use StateRgstn/Rgltr/@Cd=CO');
  }
  if (!value.federalNotice.filter.includes('NoticeFiled/States/@RgltrCd=CO')) {
    throw new Error('Federal notice filter must use NoticeFiled/States/@RgltrCd=CO');
  }
  if (!value.stateEra.filter.includes('ERA/Rgltr/@Cd=CO')) {
    throw new Error('State ERA filter must use ERA/Rgltr/@Cd=CO');
  }
  if (!value.nationalOverlay.grain.includes('principal-office')) {
    throw new Error('National overlay grain must remain principal-office geography');
  }
  if (value.federalNotice.overlapApprovedStateIaJoinMethod !== undefined) {
    if (!String(value.federalNotice.overlapApprovedStateIaJoinMethod).includes('exact firm CRD')) {
      throw new Error('State-IA / notice overlap must be exact-CRD intersection');
    }
  }
  if (value.stateEra.overlapWithStateIa !== 0) {
    throw new Error('State IA and state ERA overlap must remain zero in this extract');
  }
  if (value.riaEra.coPrincipalOfficeSplit !== 'SOURCE_NOT_SPLIT') {
    throw new Error('Do not invent a CO RIA/ERA geography split');
  }
  if (value.formD.overlay !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Form D Colorado overlay');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download Colorado enforcement PDFs in CO-INV-001');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay and state-intel identities are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES !== 0) {
    throw new Error('Do not mint public investor profiles in CO-INV-001');
  }
  if (value.expansionLedger.NEW_FEDERAL_NOTICE_FILING_ROWS !== 3673) {
    throw new Error('Colorado notice-filing rows must remain a separate ledger field');
  }
  if (value.expansionLedger.TOTAL_NEW_COLORADO_REGULATORY_OBSERVATION_ROWS !== 4623) {
    throw new Error('Colorado regulatory observation-row aggregate drifted');
  }
  if (value.expansionLedger.EXACT_ADVERSE_PROFILE_ATTACHMENTS !== 0) {
    throw new Error('No exact adverse attachments were accepted');
  }
  if (value.profileAttachments.length !== 0) {
    throw new Error('Colorado profile attachments must remain empty');
  }
  if (value.iar.coloradoPersonDirectory !== 'NOT_PUBLISHED') {
    throw new Error('Do not publish a Colorado IAR person directory');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('CO-INV-001 publication gate is off');
  }
  if (value.route !== '/colorado') {
    throw new Error('Colorado route drifted');
  }
  return value;
}
