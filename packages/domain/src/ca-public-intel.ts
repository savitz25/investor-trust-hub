import { CA_PUBLIC_SNAPSHOT, type CaPublicSnapshot } from './ca-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { CA_PUBLIC_SNAPSHOT, type CaPublicSnapshot };

export const CA_PUBLIC_ROUTE = '/california' as const;
export const CA_PUBLIC_FINGERPRINT =
  '4c1eb0d124c6890f816eb9ce10c1f865f0749d2e1f563d1254860fe3ca2a76e2';

export function caPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'CA');
  return row?.count ?? 0;
}

export type CaProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdCaProfileAttachments(crd: string | null | undefined): CaProfileAttachment[] {
  if (!crd) return [];
  const rows = CA_PUBLIC_SNAPSHOT.profileAttachments as readonly CaProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachCaEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD_FIRM' || matchStatus === 'EXACT_SEC_FILE' || matchStatus === 'HIGH_CONFIDENCE';
}

export function assertCaliforniaPublicIntel(
  value: CaPublicSnapshot = CA_PUBLIC_SNAPSHOT,
): CaPublicSnapshot {
  if (value.version !== 'investor-ca-state-intel-v1') {
    throw new Error(`Unexpected California contract ${value.version}`);
  }
  if (value.fingerprint !== CA_PUBLIC_FINGERPRINT) {
    throw new Error('California public snapshot fingerprint drifted');
  }
  if (value.nationalOverlay.caPrincipalOfficeSecIardFirms !== caPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('California principal-office overlay drifted from national roster');
  }
  if (value.stateRia.STATE_RIA_BULK_ROSTER !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a California state-RIA roster');
  }
  if (value.riaEra.caPrincipalOfficeSplit !== 'SOURCE_NOT_SPLIT') {
    throw new Error('Do not invent a CA RIA/ERA geography split');
  }
  if (value.formD.overlay !== 'SOURCE_NOT_ACQUIRED') {
    throw new Error('Do not invent a Form D California overlay');
  }
  return value;
}
