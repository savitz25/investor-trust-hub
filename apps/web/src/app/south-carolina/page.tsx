import Link from 'next/link';
import { SC_REGISTRATION_LENSES as registration, SC_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://www.scag.gov/inside-the-office/legal-services-division/securities/',
  statute: 'https://www.scstatehouse.gov/code/t35c001.php',
  orders: 'https://www.scag.gov/inside-the-office/legal-services-division/securities/enforcement/notices-and-orders/',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'South Carolina Investment Adviser & Securities Intelligence',
    description: 'South Carolina Attorney General Securities Division: separate state IA, federal notice, ERA and principal-office lenses, plus a 2025–2026 notices-and-orders index. No city pages or rankings.',
    path: '/south-carolina',
    host: await readRequestHost(),
  });
}

export default function SouthCarolinaPage() {
  const overlap = registration.exactCrdIntersections;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · South Carolina</p>
      <h1>South Carolina Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The South Carolina Attorney General is ex officio Securities Commissioner. State investment adviser registration, notice filing, exempt reporting advisers, investment adviser representatives, broker-dealers, and agents are separate classes. This page does not publish one South Carolina adviser total. Registration status is source text, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.statute}>South Carolina Securities Act</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p>State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. They cannot be summed. Counts below use regulator jurisdiction code SC, not a main-office address. APPROVED and FILED are IAPD status text, not a quality judgment.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.count)}</p><h3>South Carolina state IA firm CRDs, APPROVED</h3><p>{registration.stateIa.filter}. {registration.stateIa.rows} StateRgstn rows include {registration.stateIa.statusRows.CONDREST} CONDREST, which is not in this count. A South Carolina office alone does not establish state registration. {registration.mainOfficeDiagnostic.approvedStateIaWithSouthCarolinaMainOffice} of these APPROVED firm CRDs also have a South Carolina main office in the state compilation. That overlap is not another population.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.count)}</p><h3>Federal notice firm CRDs, FILED</h3><p>{registration.federalNotice.filter}. Notice filing is not South Carolina state IA registration. Every filed row in this extract is FirmType Registered, not ERA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.count)}</p><h3>Active ERA firm CRDs</h3><p>{registration.era.filter}. An exempt reporting adviser is not an SEC-registered RIA and not a state-registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>South Carolina principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not South Carolina registration or notice filing, and this count was not recomputed as the published figure from the {registration.acceptedIapdSourceDate} compilation. A separate MainAddr recount on that compilation was not used as this count.</p></article>
      </div>
      <p>Exact firm-CRD intersections from the {registration.acceptedIapdSourceDate} jurisdiction filters, kept separate: state IA APPROVED ∩ notice FILED {overlap.stateIaApprovedAndNoticeFiled.length}; state IA ∩ ERA {overlap.stateIaAndEra.length}; ERA ∩ notice {overlap.eraAndNoticeFiled.length}. The accepted principal-office overlay has no CRD list in this publication, so it is not intersected here. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. No national adviser population was duplicated. <a href={registration.stateFeed.url}>IAPD state compilation</a> · <a href={registration.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p>The <a href={SOURCE.statute}>Securities Act</a> treats broker-dealers, agents and investment adviser representatives as separate firm and person classes from state-registered adviser firms. <a href={SOURCE.brokercheck}>FINRA BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> are additional research paths. South Carolina bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is not a firm CRD. An investment adviser representative is not a firm.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Notices and orders, 2025–2026</h2><p><a href={SOURCE.orders}>The Attorney General notices-and-orders index</a> is organized by year page. This publication read the 2025 and 2026 pages: <strong>{orders.yearCounts['2025']}</strong> linked documents in 2025 and <strong>{orders.yearCounts['2026']}</strong> in 2026, {orders.rowCount} index rows. Those rows are documents, not findings and not one matter count. Older year pages were <strong>NOT_ACQUIRED</strong>. Missing older years are not zero. Printed dispositions partition those rows:</p><ul>{orders.actionTagRows.map((row) => <li key={row.tag}>{row.tag}: {row.rows}</li>)}</ul><p>A cease-and-desist is not a final adjudication. A consent order keeps the source label consent order. An order to vacate is not a new violation. A summons and complaint is not an order. A final judgment posted on the index is not a state administrative order. The continuing-education requirement order is not an enforcement finding against a firm. {orders.captionsPrintingCrd} captions print a CRD. Those numbers were not copied and were not joined. Respondent names were not stored. PDFs were not downloaded. <strong>Exact adverse attachments: {orders.exactEnforcementAttachments}; name-only adverse joins: {orders.nameOnlyAdverseJoins}.</strong></p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>Provider-level examination rows were <strong>NOT_ACQUIRED</strong>. An examination is not a violation, and missing exam rows are not a clean examination history. Provider-level complaint rows were <strong>NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. IAPD jurisdiction filters: {registration.acceptedIapdSourceDate}, filtered {registration.filteredAt}. Order index reviewed {orders.retrievedAt}. Snapshot generated {registration.generatedAt}. There is no universal South Carolina securities as-of date.</p><p>State bulk registration, broker-dealer, agent and IAR rosters, older notices-and-orders pages, exact SEC-file intersections, provider exam rows and complaint rows: <strong>NOT_ACQUIRED</strong>. Existing canonical matches were not re-read from the firm spine, so spine membership of the {registration.canonicalReconciliation.unresolvedIdentities} APPROVED state-IA firm CRDs stays unresolved. Net-new canonical firms created: {registration.newCanonicalFirms}. Graph writes: {registration.graphWrites}. Claim eligibility changes: {registration.claimChanges}. Charleston, Columbia, and Greenville stay statewide. No county or city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20South%20Carolina">Ask about South Carolina evidence</Link> · <a href={SOURCE.division}>Securities Division</a></p></div></section>
  </main>;
}
