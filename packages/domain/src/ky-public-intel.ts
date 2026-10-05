import registration from '../../../data/kentucky/ky-inv-001/registration-lenses.json';
import orders from '../../../data/kentucky/ky-inv-001/securities-orders.json';
import dfi from '../../../data/kentucky/ky-inv-001/dfi-2025-securities.json';

export const KY_PUBLIC_ROUTE = '/kentucky' as const;
export const KY_REGISTRATION_LENSES = registration;
export const KY_SECURITIES_ORDERS = orders;
export const KY_DFI_2025_SECURITIES = dfi;

export function assertKentuckyPublicIntel() {
  if (registration.contract !== 'ky-inv-001-registration-v1' || orders.contract !== 'ky-inv-001-securities-orders-v1' || dfi.contract !== 'ky-inv-001-dfi-2025-securities-v1') throw new Error('Kentucky source contract');
  const lists = registration.identifierLists;
  if (registration.stateIa.count !== lists.stateIaApprovedFirmCrds.length || registration.stateIa.approvedDistinctFirmCrd !== 150) throw new Error('state IA grain');
  if (registration.stateIa.rows !== 151 || registration.stateIa.statusRows.TERMREQUEST !== 1) throw new Error('TERMREQUEST stays out of the approved count');
  if (registration.era.count !== lists.eraActiveFirmCrds.length || registration.era.activeDistinctFirmCrd !== 9) throw new Error('ERA grain');
  if (registration.federalNotice.count !== lists.noticeFiledFirmCrds.length || registration.federalNotice.filedDistinctFirmCrd !== 1528) throw new Error('notice grain');
  if (registration.principalOffice.count !== 89 || registration.principalOffice.sourceAsOf !== '2026-08-27') throw new Error('principal-office overlay');
  if (registration.stateIa.mainOfficeAmongJurisdictionRecords.kentucky + registration.stateIa.mainOfficeAmongJurisdictionRecords.notKentucky !== registration.stateIa.distinctFirmCrd) throw new Error('main-office split');
  if (registration.dedupedKentuckyAdvisers !== null || registration.graphWrites !== 0 || orders.graphWrites !== 0 || dfi.graphWrites !== 0) throw new Error('no combined total or graph writes');
  if (orders.status !== 'NOT_ACQUIRED' || orders.rowCount !== null || orders.exactEnforcementAttachments !== 0 || orders.nameOnlyAdverseJoins !== 0) throw new Error('order corpus');
  if (orders.rows.length !== 0 || dfi.exactCrdAttachments !== 0 || dfi.nameOnlyAdverseJoins !== 0) throw new Error('unparsed orders are not attachments');
  if (dfi.clock !== '2025-12-31' || dfi.yearEnd.stateRegisteredInvestmentAdvisers.totalRegistered !== 159) throw new Error('DFI state IA clock');
  if (dfi.yearEnd.stateRegisteredInvestmentAdvisers.totalRegistered === registration.stateIa.count) throw new Error('DFI year-end IA is not the IAPD approved count');
  if (dfi.federalCoveredNoticeFilings.totalEffectiveYearEnd !== 1430 || dfi.federalCoveredNoticeFilings.totalEffectiveYearEnd === registration.federalNotice.count) throw new Error('notice clocks stay distinct');
  if (dfi.federalCoveredNoticeFilings.newWithdrawnFailedTerminated !== null || dfi.investmentAdviserRepresentatives.stateOnly !== null) throw new Error('unprinted flow components stay unknown');
  if (dfi.investmentAdviserRepresentatives.totalStateAndFederalYearEnd !== 7359 || dfi.glance.securitiesProfessionals !== 182894) throw new Error('person grains');
  if (dfi.glance.securitiesProfessionals !== dfi.yearEnd.brokerDealerAgents.totalRegistered) throw new Error('glance professionals and broker-dealer agents are the same printed number');
  if (dfi.yearEnd.brokerDealers.totalRegistered !== 1382 || dfi.yearEnd.issuerAgents.totalRegistered !== 2) throw new Error('broker-dealer grains');
  if (dfi.headquarteredNameLists.brokerDealerPrintedRows !== 9 || dfi.headquarteredNameLists.investmentAdviserPrintedRows !== 90) throw new Error('headquarters name rows');
  const headquartersNameRows: number = dfi.headquarteredNameLists.investmentAdviserPrintedRows;
  const acceptedRosterFirms: number = registration.principalOffice.count;
  if (headquartersNameRows === acceptedRosterFirms) throw new Error('name list is not the accepted roster');
  if (dfi.examinations.brokerDealer + dfi.examinations.investmentAdvisory !== dfi.examinations.total || dfi.examinations.total !== 48) throw new Error('examination rows');
  if (dfi.examinations.ordersOrAgreementsEnteredFromExamination === dfi.enforcement.administrativeOrders) throw new Error('exam agreements are not the administrative-order total');
  const filings = dfi.corporationFinanceFilings;
  const filingRows = [filings.privatePlacementSecuritiesOfferings, filings.investmentCompaniesNew, filings.investmentCompaniesRenewals, filings.unitInvestmentTrusts, filings.regulationDRule506Offerings, filings.claimsOfExemptionRequested, filings.regulationATier2Offerings];
  if (filingRows.reduce((sum, value) => sum + value, 0) !== filings.printedTotal || filings.printedTotal !== 5737) throw new Error('filing total');
  const lenses = [registration.stateIa.count, registration.federalNotice.count, registration.era.count, registration.principalOffice.count];
  if (new Set(lenses).size !== lenses.length) throw new Error('registration lenses must stay distinct');
  if (registration.stateFeed.sha256 !== '5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02') throw new Error('state feed hash');
  if (registration.secFeed.sha256 !== 'f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22') throw new Error('sec feed hash');
  if (registration.stateIa.filter.includes('MainAddr') || registration.federalNotice.filter.includes('MainAddr') || registration.era.filter.includes('MainAddr')) throw new Error('jurisdiction filter, not address');
  return true;
}
