import registration from '../../../data/connecticut/ct-inv-001/registration-lenses.json';
import orders from '../../../data/connecticut/ct-inv-001/securities-orders.json';

export const CT_PUBLIC_ROUTE = '/connecticut' as const;
export const CT_REGISTRATION_LENSES = registration;
export const CT_SECURITIES_ORDERS = orders;

export function assertConnecticutPublicIntel() {
  if (registration.contract !== 'ct-inv-001-registration-v1' || orders.contract !== 'ct-inv-001-orders-v1') throw new Error('Connecticut source contract');
  const iapd = registration.iapd;
  if (iapd.stateIa.approvedFirmCrds !== iapd.identifierLists.stateIaApproved.length) throw new Error('CT state IA grain');
  if (iapd.era.activeFirmCrds !== iapd.identifierLists.eraActive.length) throw new Error('CT ERA grain');
  if (iapd.federalNotice.filedFirmCrds !== iapd.identifierLists.noticeFiled.length) throw new Error('CT notice grain');
  if (iapd.principalOffice.firmCrds !== iapd.identifierLists.principalOffice.length) throw new Error('CT principal-office grain');
  if (registration.dedupedConnecticutAdvisers !== null || registration.graphWrites !== 0 || registration.claimChanges !== 0) throw new Error('CT combined total/graph');
  if (orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAttachments !== 0 || orders.graphWrites !== 0) throw new Error('CT adverse attachment');
  const known = new Set(Object.values(iapd.identifierLists).flat());
  for (const row of orders.rows) {
    if (row.exactIapdFirmCrdCrosswalk && (!known.has(row.exactIapdFirmCrdCrosswalk) || row.exactIapdFirmCrdCrosswalk !== row.printedFirmCrd || row.respondentGrain !== 'organization caption')) throw new Error('CT unsafe CRD crosswalk');
    if (row.profileEvidenceAttached) throw new Error('CT adverse profile attachment');
  }
  return { registration, orders };
}
