import { AZ_PUBLIC_SNAPSHOT, type AzPublicSnapshot } from './az-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { AZ_PUBLIC_SNAPSHOT, type AzPublicSnapshot };

export const AZ_PUBLIC_ROUTE = '/arizona' as const;
export const AZ_PUBLIC_FINGERPRINT =
  '683c862012698a9f0e5ed0453bf5da5e15561d7c4f5a9ee40788fd7a1b61b03b';

export function azPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'AZ');
  return row?.count ?? 0;
}

export type AzProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdAzProfileAttachments(crd: string | null | undefined): AzProfileAttachment[] {
  if (!crd) return [];
  const rows = AZ_PUBLIC_SNAPSHOT.profileAttachments as readonly AzProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachAzEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_ACC_DOCKET' ||
    matchStatus === 'EXACT_ACC_FILE_NUMBER' ||
    matchStatus === 'EXACT_ORDER_IDENTITY'
  );
}

export function assertArizonaPublicIntel(
  value: AzPublicSnapshot = AZ_PUBLIC_SNAPSHOT,
): AzPublicSnapshot {
  if (value.version !== 'investor-az-state-intel-v1') {
    throw new Error(`Unexpected Arizona contract ${value.version}`);
  }
  if (value.fingerprint !== AZ_PUBLIC_FINGERPRINT) {
    throw new Error('Arizona public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.azPrincipalOfficeSecIardFirms !== azPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Arizona principal-office overlay drifted from national roster');
  }
  if (value.stateRia.AZ_STATE_IA_BUSINESS_ROSTER !== 'SOURCE_AVAILABLE_BY_REQUEST') {
    throw new Error('Do not invent an Arizona state-IA roster');
  }
  if (value.stateRia.completeStateRiaCount !== 'UNKNOWN') {
    throw new Error('Live Arizona state-IA denominator must remain UNKNOWN');
  }
  if (value.stateRia.requestFiled !== false) {
    throw new Error('AZ-INV-001 must not file the ACC list request');
  }
  if (value.riaEra.azPrincipalOfficeSplit !== 'SOURCE_NOT_SPLIT') {
    throw new Error('Do not invent an AZ RIA/ERA geography split');
  }
  if (value.formD.overlay !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Form D Arizona overlay');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.enforcement.pdfsDownloaded !== 0) {
    throw new Error('Do not download ACC enforcement PDFs in AZ-INV-001');
  }
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) {
    throw new Error('Federal overlay firms are not net-new canonical organizations');
  }
  if (value.expansionLedger.NET_NEW_STATE_IDENTITIES !== 0) {
    throw new Error('No ACC state identities were acquired');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('AZ-INV-001 publication gate is off');
  }
  return value;
}
