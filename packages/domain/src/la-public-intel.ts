import registration from '../../../data/louisiana/la-inv-001/registration-lenses.json';
import orders from '../../../data/louisiana/la-inv-001/securities-orders.json';

export const LA_PUBLIC_ROUTE = '/louisiana' as const;
export const LA_REGISTRATION_LENSES = registration;
export const LA_SECURITIES_ORDERS = orders;

export function assertLouisianaPublicIntel() {
  if (registration.contract !== 'la-inv-001-registration-v1' || orders.contract !== 'la-inv-001-securities-orders-v1') throw new Error('Louisiana source contract');
  const lists = registration.identifierLists;
  if (registration.stateIa.count !== lists.stateIaApprovedFirmCrds.length || registration.stateIa.approvedDistinctFirmCrd !== lists.stateIaApprovedFirmCrds.length) throw new Error('state IA grain');
  if (registration.era.count !== lists.eraActiveFirmCrds.length || registration.era.activeDistinctFirmCrd !== lists.eraActiveFirmCrds.length) throw new Error('ERA grain');
  if (registration.federalNotice.count !== lists.noticeFiledFirmCrds.length || registration.federalNotice.filedDistinctFirmCrd !== lists.noticeFiledFirmCrds.length) throw new Error('notice grain');
  if (registration.principalOffice.count !== 84 || registration.principalOffice.sourceAsOf !== '2026-08-27') throw new Error('principal-office overlay');
  if (registration.dedupedLouisianaAdvisers !== null || registration.graphWrites !== 0 || orders.graphWrites !== 0) throw new Error('no combined total or graph writes');
  if (orders.status !== 'NOT_ACQUIRED' || orders.rowCount !== null || orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAdverseJoins !== 0) throw new Error('order corpus');
  if (orders.rows.length !== 0) throw new Error('unparsed orders are not a corpus');
  const grains = [registration.stateIa.count, registration.federalNotice.count, registration.era.count, registration.principalOffice.count];
  if (new Set(grains).size !== grains.length) throw new Error('registration grains must stay distinct');
  return true;
}
