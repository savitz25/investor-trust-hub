import registration from '../../../data/south-carolina/sc-inv-001/registration-lenses.json';
import orders from '../../../data/south-carolina/sc-inv-001/securities-orders.json';

export const SC_PUBLIC_ROUTE = '/south-carolina' as const;
export const SC_REGISTRATION_LENSES = registration;
export const SC_SECURITIES_ORDERS = orders;

export function assertSouthCarolinaPublicIntel() {
  if (registration.contract !== 'sc-inv-001-registration-v1' || orders.contract !== 'sc-inv-001-securities-orders-v1') throw new Error('South Carolina source contract');
  const lists = registration.identifierLists;
  if (registration.stateIa.count !== lists.stateIaApprovedFirmCrds.length || registration.stateIa.approvedDistinctFirmCrd !== lists.stateIaApprovedFirmCrds.length) throw new Error('state IA grain');
  if (registration.era.count !== lists.eraActiveFirmCrds.length || registration.era.activeDistinctFirmCrd !== lists.eraActiveFirmCrds.length) throw new Error('ERA grain');
  if (registration.federalNotice.count !== lists.noticeFiledFirmCrds.length || registration.federalNotice.filedDistinctFirmCrd !== lists.noticeFiledFirmCrds.length) throw new Error('notice grain');
  if (registration.principalOffice.count !== 122 || registration.principalOffice.sourceAsOf !== '2026-08-27') throw new Error('principal-office overlay');
  if (registration.mainOfficeDiagnostic.publishMainAddrRecount !== false) throw new Error('MainAddr recount stays off the published count');
  if (registration.dedupedSouthCarolinaAdvisers !== null || registration.graphWrites !== 0 || orders.graphWrites !== 0) throw new Error('no combined total or graph writes');
  if (registration.newCanonicalFirms !== 0 || registration.canonicalReconciliation.netNewCanonicalFirms !== 0) throw new Error('no new canonical firms');
  if (registration.canonicalReconciliation.existingCanonicalMatches !== null || registration.canonicalReconciliation.unresolvedIdentities !== registration.stateIa.count) throw new Error('spine membership stays unresolved');
  if (orders.status !== 'BOUNDED_INDEX' || orders.rowCount !== 25 || orders.rows.length !== 25) throw new Error('bounded order index');
  if (orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAdverseJoins !== 0 || orders.rowsWithCrdColumn !== 0) throw new Error('order attachment safety');
  if (orders.respondentNamesStored !== false || orders.pdfsDownloaded !== false) throw new Error('order extract boundary');
  if (orders.ceaseAndDesistIsFinalAdjudication !== false || orders.rows.some((row) => row.firmCrd !== null || row.finalAdjudication !== false)) throw new Error('order finality');
  if (orders.yearCounts['2025'] + orders.yearCounts['2026'] !== orders.rowCount) throw new Error('order year partition');
  if (orders.actionTagRows.reduce((sum, row) => sum + row.rows, 0) !== orders.rowCount) throw new Error('action tags must partition the index');
  const grains = [registration.stateIa.count, registration.federalNotice.count, registration.era.count, registration.principalOffice.count];
  if (new Set(grains).size !== grains.length) throw new Error('registration grains must stay distinct');
  return true;
}
