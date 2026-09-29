import lenses from '../../../data/indiana/in-inv-001/iapd-in-lenses.json';
import orders from '../../../data/indiana/in-inv-001/securities-orders.json';

export const IN_PUBLIC_ROUTE = '/indiana' as const;
export const IN_IAPD_LENSES = lenses;
export const IN_SECURITIES_ORDERS = orders;

export function assertIndianaPublicIntel() {
  if (lenses.contract !== 'in-inv-001-iapd-lenses-v1' || orders.contract !== 'in-inv-001-securities-orders-v1') throw new Error('Indiana source contract');
  const lists = lenses.identifierLists;
  if (lenses.stateIa.approvedDistinctFirmCrd !== lists.stateIaApprovedFirmCrds.length) throw new Error('state IA grain');
  if (lenses.era.activeDistinctFirmCrd !== lists.eraActiveFirmCrds.length) throw new Error('ERA grain');
  if (lenses.federalNotice.filedDistinctFirmCrd !== lists.noticeFiledFirmCrds.length) throw new Error('notice grain');
  if (lenses.principalOffice.distinctFirmCrd !== lists.principalOfficeFirmCrds.length) throw new Error('principal grain');
  if (orders.rows.length !== orders.rowCount || orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAdverseJoins !== 0) throw new Error('order scope/attachment');
  if (lenses.dedupedIndianaAdvisers !== null || lenses.graphWrites !== 0 || orders.graphWrites !== 0) throw new Error('no combined total or graph writes');
  for (const row of orders.rows) {
    if (row.profileAttached) throw new Error('profile adverse attachment');
    if (row.exactIapdFirmCrdLinks.length && row.respondentGrain !== 'firm-linked caption') throw new Error('unsafe firm crosswalk');
  }
  return true;
}
