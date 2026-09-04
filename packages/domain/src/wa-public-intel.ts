import { WA_PUBLIC_SNAPSHOT, type WaPublicSnapshot } from './wa-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { WA_PUBLIC_SNAPSHOT, type WaPublicSnapshot };

export const WA_PUBLIC_ROUTE = '/washington' as const;
export const WA_PUBLIC_FINGERPRINT =
  'bb93ff70a10d559222c7e9a1520b925bb955fe9ab6c3357aff44595fce2eb415';

export function waPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'WA');
  return row?.count ?? 0;
}

export type WaProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdWaProfileAttachments(crd: string | null | undefined): WaProfileAttachment[] {
  if (!crd) return [];
  const rows = WA_PUBLIC_SNAPSHOT.profileAttachments as readonly WaProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachWaEvidenceToProfile(matchStatus: string): boolean {
  return (
    matchStatus === 'EXACT_CRD' ||
    matchStatus === 'EXACT_DFI_FILE_NUMBER' ||
    matchStatus === 'EXACT_DOCKET_OR_ORDER_IDENTITY'
  );
}

export function assertWashingtonPublicIntel(
  value: WaPublicSnapshot = WA_PUBLIC_SNAPSHOT,
): WaPublicSnapshot {
  if (value.version !== 'investor-wa-state-intel-v1') {
    throw new Error(`Unexpected Washington contract ${value.version}`);
  }
  if (value.fingerprint !== WA_PUBLIC_FINGERPRINT) {
    throw new Error('Washington public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.waPrincipalOfficeSecIardFirms !== waPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Washington principal-office overlay drifted from national roster');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Washington state-RIA roster');
  }
  if (value.stateRia.completeStateRiaCount !== 'UNKNOWN') {
    throw new Error('Live Washington state-RIA denominator must remain UNKNOWN');
  }
  if (value.riaEra.waPrincipalOfficeSplit !== 'SOURCE_NOT_SPLIT') {
    throw new Error('Do not invent a WA RIA/ERA geography split');
  }
  if (value.formD.overlay !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Form D Washington overlay');
  }
  if (value.enforcement.doNotCalculateEnforcementRate !== true) {
    throw new Error('Do not publish an enforcement rate');
  }
  if (value.dfiYearEndAggregates.notALiveRoster !== true) {
    throw new Error('DFI year-end aggregates must not be treated as a live roster');
  }
  if (value.publicationGate !== 'ON') {
    throw new Error('WA-INV-001 publication gate is off');
  }
  return value;
}
