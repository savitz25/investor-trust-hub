import { TX_PUBLIC_SNAPSHOT, type TxPublicSnapshot } from './tx-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { TX_PUBLIC_SNAPSHOT, type TxPublicSnapshot };

export const TX_PUBLIC_ROUTE = '/texas' as const;
export const TX_PUBLIC_FINGERPRINT =
  '227c59ce0b906a33d66f8a6f1b66fc1becb3ce40f28ca5cecbd5b4564ef2fdab';

export function txPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'TX');
  return row?.count ?? 0;
}

export type TxProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdTxProfileAttachments(crd: string | null | undefined): TxProfileAttachment[] {
  if (!crd) return [];
  const rows = TX_PUBLIC_SNAPSHOT.profileAttachments as readonly TxProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachTxEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD_FIRM' || matchStatus === 'EXACT_SEC_FILE' || matchStatus === 'EXACT_TX_FILE';
}

export function assertTexasPublicIntel(
  value: TxPublicSnapshot = TX_PUBLIC_SNAPSHOT,
): TxPublicSnapshot {
  if (value.version !== 'investor-tx-state-intel-v1') {
    throw new Error(`Unexpected Texas contract ${value.version}`);
  }
  if (value.fingerprint !== TX_PUBLIC_FINGERPRINT) {
    throw new Error('Texas public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.txPrincipalOfficeSecIardFirms !== txPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Texas principal-office overlay drifted from national roster');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Texas state-RIA roster');
  }
  if (value.stateRia.completeStateRiaCount !== 'UNKNOWN') {
    throw new Error('Live Texas state-RIA denominator must remain UNKNOWN');
  }
  if (value.riaEra.txPrincipalOfficeSplit !== 'SOURCE_NOT_SPLIT') {
    throw new Error('Do not invent a TX RIA/ERA geography split');
  }
  if (value.formD.overlay !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Form D Texas overlay');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  return value;
}
