import lenses from '../../../data/michigan/mi-inv-001/iapd-mi-lenses.json';
import orders from '../../../data/michigan/mi-inv-001/securities-orders.json';

export const MI_PUBLIC_ROUTE = '/michigan' as const;
export const MI_IAPD_LENSES = lenses;
export const MI_SECURITIES_ORDERS = orders;

export function assertMichiganPublicIntel() {
  if (lenses.contract !== 'mi-inv-001-iapd-lenses-v1' || orders.contract !== 'mi-inv-001-securities-orders-v1') throw new Error('Michigan source contract');
  const lists = lenses.identifierLists;
  if (lenses.stateIa.approvedDistinctFirmCrd !== lists.stateIaApprovedFirmCrds.length) throw new Error('state IA grain');
  if (lenses.era.activeDistinctFirmCrd !== lists.eraActiveFirmCrds.length) throw new Error('ERA grain');
  if (lenses.federalNotice.filedDistinctFirmCrd !== lists.noticeFiledFirmCrds.length) throw new Error('notice grain');
  if (lenses.principalOffice.distinctFirmCrd !== lists.principalOfficeFirmCrds.length) throw new Error('principal grain');
  if (orders.rows.length !== 107 || orders.exactFirmEvidenceAttachments !== 0 || orders.nameOnlyAttachments !== 0) throw new Error('order scope/attachment');
  if (lenses.dedupedMichiganAdvisers !== null || lenses.graphWrites !== 0 || orders.graphWrites !== 0) throw new Error('no combined total or graph writes');
  const known = new Set(Object.values(lists).flat());
  for (const row of orders.rows) {
    if (row.exactIapdFirmCrdLink && (!known.has(row.exactIapdFirmCrdLink) || row.exactIapdFirmCrdLink !== row.captionFirmCrd || row.respondentGrain !== 'firm')) throw new Error('unsafe firm crosswalk');
    if (row.profileEvidenceAttached) throw new Error('profile adverse attachment');
  }
  return { lenses, orders };
}
