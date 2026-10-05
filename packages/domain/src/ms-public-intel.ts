import registration from '../../../data/mississippi/ms-inv-001/registration-lenses.json';
import orders from '../../../data/mississippi/ms-inv-001/securities-orders.json';

export const MS_PUBLIC_ROUTE = '/mississippi' as const;
export const MS_REGISTRATION_LENSES = registration;
export const MS_SECURITIES_ORDERS = orders;

export function assertMississippiPublicIntel() {
  if (registration.contract !== 'ms-inv-001-registration-v1' || orders.contract !== 'ms-inv-001-securities-orders-v1') throw new Error('Mississippi source contract');
  const lists = registration.identifierLists;
  if (registration.stateIa.count !== lists.stateIaApprovedFirmCrds.length || registration.stateIa.approvedDistinctFirmCrd !== lists.stateIaApprovedFirmCrds.length) throw new Error('state IA grain');
  if (registration.era.count !== lists.eraActiveFirmCrds.length || registration.era.activeDistinctFirmCrd !== lists.eraActiveFirmCrds.length) throw new Error('ERA grain');
  if (registration.federalNotice.count !== lists.noticeFiledFirmCrds.length || registration.federalNotice.filedDistinctFirmCrd !== lists.noticeFiledFirmCrds.length) throw new Error('notice grain');
  if (registration.principalOffice.count !== 35 || registration.principalOffice.sourceAsOf !== '2026-08-27') throw new Error('principal-office overlay');
  if (registration.dedupedMississippiAdvisers !== null || registration.graphWrites !== 0 || orders.graphWrites !== 0) throw new Error('no combined total or graph writes');
  if (registration.newCanonicalFirms !== 0 || registration.canonicalReconciliation.netNewCanonicalFirms !== 0) throw new Error('no new canonical firms');
  if (registration.canonicalReconciliation.existingCanonicalMatches !== null || registration.canonicalReconciliation.unresolvedIdentities !== registration.stateIa.count) throw new Error('spine membership stays unresolved');
  if (orders.status !== 'NOT_ACQUIRED' || orders.rowCount !== null || orders.rows.length !== 0) throw new Error('order corpus stays unacquired');
  if (orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAdverseJoins !== 0 || orders.rowsWithCrdColumn !== 0) throw new Error('order attachment safety');
  if (orders.ceaseAndDesistIsFinalAdjudication !== false) throw new Error('order finality');
  const grains = [registration.stateIa.count, registration.federalNotice.count, registration.era.count, registration.principalOffice.count];
  if (new Set(grains).size !== grains.length) throw new Error('registration grains must stay distinct');
  if (registration.exactCrdIntersections.stateIaApprovedAndNoticeFiled.length !== 2) throw new Error('state IA and notice overlap');
  return true;
}
