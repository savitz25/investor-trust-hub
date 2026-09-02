import { NJ_PUBLIC_SNAPSHOT, type NjPublicSnapshot } from './nj-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { NJ_PUBLIC_SNAPSHOT, type NjPublicSnapshot };

export const NJ_PUBLIC_ROUTE = '/new-jersey' as const;

export const NJ_DOCUMENT_CLASS_LABELS: Record<string, string> = {
  consent_order: 'Consent orders',
  cease_and_desist: 'Cease-and-desist',
  revocation: 'Revocation / summary revocation (filename)',
  summary_order: 'Summary orders',
  civil_complaint: 'Civil / verified complaints',
  final_order: 'Final orders',
  bar: 'Bars',
  other_bureau_document: 'Other Bureau documents',
};

export function njPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'NJ');
  return row?.count ?? 0;
}

export type NjProfileAttachment = {
  crd: string;
  matchStatus: string;
};

export function exactCrdProfileAttachments(crd: string | null | undefined): NjProfileAttachment[] {
  if (!crd) return [];
  const rows = NJ_PUBLIC_SNAPSHOT.profileAttachments as readonly NjProfileAttachment[];
  return rows.filter((row) => row.crd === crd);
}

export function mayAttachNjEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD_FIRM' || matchStatus === 'EXACT_SEC_FILE' || matchStatus === 'HIGH_CONFIDENCE';
}
