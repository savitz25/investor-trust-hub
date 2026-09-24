import { GA_PUBLIC_SNAPSHOT, type GaPublicSnapshot } from './ga-public-snapshot';
import { V1_ROSTER_PRINCIPAL_OFFICE_STATES } from './investor-home-intel';

export { GA_PUBLIC_SNAPSHOT, type GaPublicSnapshot };

export const GA_PUBLIC_ROUTE = '/georgia' as const;
export const GA_PUBLIC_FINGERPRINT =
  'f1c44afc81eb7be3d774c91fb3928e01a4a6542511ea5dde0d079b79f41dbea6';

export function gaPrincipalOfficeCountFromNationalRoster(): number {
  const row = V1_ROSTER_PRINCIPAL_OFFICE_STATES.find((cell) => cell.region === 'GA');
  return row?.count ?? 0;
}

export function mayAttachGaEvidenceToProfile(matchStatus: string): boolean {
  return matchStatus === 'EXACT_CRD' || matchStatus === 'EXACT_FIRM_CRD';
}

export function assertGeorgiaPublicIntel(
  value: GaPublicSnapshot = GA_PUBLIC_SNAPSHOT,
): GaPublicSnapshot {
  if (value.version !== 'investor-ga-state-intel-v1') {
    throw new Error(`Unexpected Georgia contract ${value.version}`);
  }
  if (value.fingerprint !== GA_PUBLIC_FINGERPRINT) {
    throw new Error('Georgia public snapshot fingerprint drifted');
  }
  if (value.route !== '/georgia') throw new Error('path');
  if (value.nationalOverlay.gaPrincipalOfficeSecIardFirms !== gaPrincipalOfficeCountFromNationalRoster()) {
    throw new Error('Georgia principal-office overlay drifted from national roster');
  }
  if (value.nationalOverlay.gaPrincipalOfficeSecIardFirms !== 364) {
    throw new Error('Georgia principal-office count drifted');
  }
  if (value.populations.state_registered_ia_firms !== 'NOT_ACQUIRED') throw new Error('state IA roster');
  if (value.populations.iar_persons !== 'NOT_ACQUIRED') throw new Error('IAR roster');
  if (value.populations.broker_dealer_firms !== 'NOT_ACQUIRED') throw new Error('BD roster');
  if (value.populations.broker_dealer_agents !== 'NOT_ACQUIRED') throw new Error('agent roster');
  if (value.populations.offerings !== 'NOT_ACQUIRED') throw new Error('offerings');
  if (value.enforcement.index_rows !== 57) throw new Error('order index');
  if (value.enforcement.events.length !== 57) throw new Error('event rows');
  if (value.enforcement.exact_profile_attachments !== 0) throw new Error('no profile attachments');
  if (value.enforcement.events.some((event) => event.exact_profile_attachment)) {
    throw new Error('no event is attached');
  }
  if (value.enforcement.events.some((event) => event.allegation_is_finding)) {
    throw new Error('caption is not a finding');
  }
  const printed = value.enforcement.events.flatMap((event) => event.crd_printed);
  if (!printed.includes('6413') || !printed.includes('7452') || !printed.includes('105958')) {
    throw new Error('printed CRDs missing');
  }
  if (value.complaints.count != null) throw new Error('no complaint census');
  if (value.expansionLedger.GRAPH_WRITES !== 0) throw new Error('no graph writes');
  if (value.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS !== 0) throw new Error('no new firms');
  if (value.claimEligibilityBroadened !== false) throw new Error('claim frozen');
  if (value.no_atlanta_page !== true) throw new Error('no Atlanta page');
  if (value.non_enforcement.implementation_orders.grain !== 'NON_ENFORCEMENT') {
    throw new Error('implementation orders are not enforcement');
  }
  return value;
}
