import Link from 'next/link';
import { KY_DFI_2025_SECURITIES as dfi, KY_REGISTRATION_LENSES as registration, KY_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://kfi.ky.gov/newstatic_info.aspx?static_id=377&menuid=67',
  exams: 'https://kfi.ky.gov/newstatic_Info.aspx?static_ID=348',
  investors: 'https://kfi.ky.gov/newstatic_Info.aspx?static_ID=622',
  enforcement: 'https://kfi.ky.gov/new_bulletin.aspx?bullid=3',
  report: 'https://kfi.ky.gov/Documents/2025%20Annual%20Report.pdf',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Kentucky Investment Adviser & Securities Intelligence',
    description: 'Kentucky Department of Financial Institutions, Securities Division: separate IAPD state IA, notice, ERA and principal-office lenses, plus 2025 DFI year-end counts. No city pages or rankings.',
    path: '/kentucky',
    host: await readRequestHost(),
  });
}

export default function KentuckyPage() {
  const overlap = registration.exactCrdIntersections;
  const office = registration.stateIa.mainOfficeAmongJurisdictionRecords;
  const year = dfi.yearEnd;
  const exams = dfi.examinations;
  const action = dfi.enforcement;
  const filings = dfi.corporationFinanceFilings;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Kentucky</p>
      <h1>Kentucky Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Kentucky Department of Financial Institutions, Securities Division regulates securities activity under the Securities Act of Kentucky, KRS 292. Licensing and Registration, Compliance, and Enforcement are separate branches. A registration, notice filing, examination, or order is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.division}>Kentucky Securities Division</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate IAPD adviser lenses</h2>
      <p>State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. Counts below use regulator jurisdiction code KY, not a main-office address. APPROVED and FILED are IAPD status text, not a quality judgment. They cannot be summed, and they are not the December 31, 2025 DFI year-end tables.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.count)}</p><h3>Kentucky state IA firm CRDs, APPROVED</h3><p>{registration.stateIa.filter}. {registration.stateIa.rows} StateRgstn rows include {registration.stateIa.statusRows.TERMREQUEST} TERMREQUEST, which is not in this count. A Kentucky office alone does not establish state registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.count)}</p><h3>Federal notice firm CRDs, FILED</h3><p>{registration.federalNotice.filter}. Notice filing is not Kentucky state IA registration. Every filed row in this extract is FirmType Registered, not ERA. Source date {registration.federalNotice.sourceAsOf}.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.count)}</p><h3>Active ERA firm CRDs</h3><p>{registration.era.filter}. An exempt reporting adviser is not an SEC-registered RIA and not a state-registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Kentucky principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not Kentucky registration or notice filing, and this count was not recomputed from the {registration.acceptedIapdSourceDate} compilation.</p></article>
      </div>
      <p>Exact firm-CRD intersections from the {registration.acceptedIapdSourceDate} jurisdiction filters, kept separate: state IA APPROVED ∩ notice FILED {overlap.stateIaApprovedAndNoticeFiled.length}; state IA ∩ ERA {overlap.stateIaAndEra.length}; ERA ∩ notice {overlap.eraAndNoticeFiled.length}. The accepted principal-office overlay has no CRD list in this publication, so it is not intersected here. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. Of the {registration.stateIa.distinctFirmCrd} Kentucky StateRgstn records, {office.kentucky} print a Kentucky main office and {office.notKentucky} do not. That address split is not the registration count and is not the accepted-roster count of {registration.principalOffice.count}.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>DFI year-end 2025, a different clock</h2>
      <p>The <a href={SOURCE.report}>DFI 2025 annual report</a> prints December 31 totals. These are not IAPD CRD counts. Flow rows are printed beside the year-end total and are not added here.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(year.stateRegisteredInvestmentAdvisers.totalRegistered)}</p><h3>State-registered IA firms, year-end</h3><p>Renewed {fmt(year.stateRegisteredInvestmentAdvisers.renewed)}, approved {year.stateRegisteredInvestmentAdvisers.approved}, terminated {year.stateRegisteredInvestmentAdvisers.terminated}. Prior year-end {year.stateRegisteredInvestmentAdvisers.priorYearTotal}. This {year.stateRegisteredInvestmentAdvisers.totalRegistered} is not the IAPD APPROVED count of {registration.stateIa.count}.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(dfi.federalCoveredNoticeFilings.totalEffectiveYearEnd)}</p><h3>Effective federal-covered notice filings</h3><p>Renewed {fmt(dfi.federalCoveredNoticeFilings.renewed)}. The report does not print the new, withdrawn, failed-to-renew, and terminated components. This {fmt(dfi.federalCoveredNoticeFilings.totalEffectiveYearEnd)} is not the IAPD FILED count of {fmt(registration.federalNotice.count)}.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(year.brokerDealers.totalRegistered)}</p><h3>Broker-dealer firms, year-end</h3><p>Renewed {fmt(year.brokerDealers.renewed)}, approved {year.brokerDealers.approved}, withdrawals from BDW {year.brokerDealers.withdrawalsFromBdw}. Not an adviser count. A Kentucky CRD roster of these firms was <strong>NOT_ACQUIRED</strong>.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(year.brokerDealerAgents.totalRegistered)}</p><h3>Broker-dealer agent registrations</h3><p>The at-a-glance label Securities Professionals prints this same {fmt(dfi.glance.securitiesProfessionals)}. Persons, not firms. Issuer-agent registrations are a separate printed {year.issuerAgents.totalRegistered}, with approved and terminated printed as 0.</p></article>
      </div>
      <p>Investment adviser representatives, state and federal combined, year-end {fmt(dfi.investmentAdviserRepresentatives.totalStateAndFederalYearEnd)}. Renewed {fmt(dfi.investmentAdviserRepresentatives.renewed)}. The report does not split state from federal, and it does not print the flow components. An IAR is a person. This is not the {fmt(year.brokerDealerAgents.totalRegistered)} broker-dealer agent registrations. DFI also prints {dfi.headquarteredNameLists.brokerDealerPrintedRows} broker-dealers and {dfi.headquarteredNameLists.investmentAdviserPrintedRows} investment advisers on headquarters name lists. Those rows have no CRD column, are not the year-end totals, and are not the accepted-roster {registration.principalOffice.count}. Names are not published here. <strong>Exact CRD attachments: {dfi.exactCrdAttachments}. Name-only adverse joins: {dfi.nameOnlyAdverseJoins}.</strong></p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Examinations, enforcement and filings</h2>
      <p><a href={SOURCE.exams}>The Compliance Branch examines broker-dealers and investment advisers</a>. For 2025 the report prints {exams.brokerDealer} broker-dealer examinations, {exams.investmentAdvisory} investment-advisory examinations, and {exams.total} total. Orders or agreements entered from examinations: {exams.ordersOrAgreementsEnteredFromExamination}. An examination is not a violation, and those {exams.ordersOrAgreementsEnteredFromExamination} are not the {action.administrativeOrders} administrative orders. Provider-level exam rows: <strong>NOT_ACQUIRED</strong>.</p>
      <p>Enforcement branch, same December 31, 2025 clock: referrals or assistance to outside agencies {action.referralsOrAssistanceToOutsideAgencies}; referrals from outside agencies {action.referralsFromOutsideAgencies}; investigations opened {action.investigationsOpened}, closed {action.investigationsClosed}, pending {action.investigationsPending}. Administrative orders {action.administrativeOrders}. Civil orders print {action.civilOrders}. Fines ${fmt(action.finesUsd)}. Restitution ordered ${fmt(action.restitutionOrderedUsd)}. A nationwide Vanguard order dated {action.vanguardOrderDate} prints ${fmt(action.vanguardNationwideRestitutionUsd)}; Kentucky&apos;s allocation was not determined. Criminal referrals {action.criminalReferrals}. Criminal indictments print {action.criminalIndictments}. The row labeled &quot;{action.investigationsWithFederalStateLawLabel}&quot; prints {action.investigationsWithFederalStateLaw}. <a href={SOURCE.enforcement}>The Securities Enforcement Actions index</a> was not parsed into order rows. <strong>Exact adverse attachments: {orders.exactEnforcementAttachments}.</strong> An index link is not a finding.</p>
      <p>Corporation-finance filings, not companies: private placements {filings.privatePlacementSecuritiesOfferings}; investment-company new {filings.investmentCompaniesNew}; investment-company renewals {fmt(filings.investmentCompaniesRenewals)}; unit investment trusts {fmt(filings.unitInvestmentTrusts)}; Regulation D, Rule 506 {fmt(filings.regulationDRule506Offerings)}; claims of exemption {filings.claimsOfExemptionRequested}; Regulation A, Tier 2 {filings.regulationATier2Offerings}. Printed total {fmt(filings.printedTotal)}. <a href={SOURCE.investors}>Complaint intake is described</a>. Provider complaint rows and outcomes: <strong>NOT_ACQUIRED</strong>. A complaint is not a finding.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. IAPD jurisdiction filters: {registration.acceptedIapdSourceDate}, filtered {registration.filteredAt}. DFI annual report clock: {dfi.clock}, retrieved {dfi.retrievedAt}. There is no universal Kentucky securities as-of date.</p><p>DFI bulk CRD rosters for broker-dealers, agents and IARs, the order-document corpus, exact SEC-file intersections, provider exam rows and complaint outcomes: <strong>NOT_ACQUIRED</strong>. New canonical firms: 0. Graph writes: 0. Claim eligibility changes: 0. Louisville and Lexington stay statewide. No city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Kentucky">Ask about Kentucky evidence</Link> · <a href={SOURCE.division}>Kentucky Securities Division</a> · <a href={SOURCE.brokercheck}>BrokerCheck</a></p></div></section>
  </main>;
}
