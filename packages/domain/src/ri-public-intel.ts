import registration from '../../../data/rhode-island/ri-inv-001/registration-lenses.json';
import orders from '../../../data/rhode-island/ri-inv-001/securities-orders.json';

export const RI_PUBLIC_ROUTE = '/rhode-island' as const;
export const RI_REGISTRATION_LENSES = registration;
export const RI_SECURITIES_ORDERS = orders;

export function assertRhodeIslandPublicIntel() {
  if (registration.contract !== 'ri-inv-001-registration-v1' || orders.contract !== 'ri-inv-001-orders-v1') throw new Error('Rhode Island source contract');
  const iapd = registration;
  if (iapd.stateIa.approvedFirmCrds !== iapd.stateIa.approvedFirmCrdIds.length) throw new Error('RI state IA lens');
  if (iapd.federalNotice.filedFirmCrds !== iapd.federalNotice.firmCrds.length) throw new Error('RI notice lens');
  if (iapd.era.activeFirmCrds > iapd.era.distinctFirmCrds) throw new Error('RI ERA lens');
  if (Object.hasOwn(iapd, 'combinedAdviserTotal')) throw new Error('RI combined adviser total');
  if (orders.documentRows !== orders.rows.length || orders.rows.some((row) => !row.sourceDocument || Object.hasOwn(row, 'profileEvidenceAttached'))) throw new Error('RI order observations');
  return { registration, orders };
}
