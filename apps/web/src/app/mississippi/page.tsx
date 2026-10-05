import Link from 'next/link';
import { MS_REGISTRATION_LENSES as registration, MS_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  orders: 'https://www.sos.ms.gov/content/enforcementsearch/?page=securities',
  complaints: 'https://www.sos.ms.gov/securities/information-investors/file-complaint',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Mississippi Investment Adviser & Securities Intelligence',
    description: 'Mississippi Secretary of State Securities Division: separate state IA, federal notice, ERA and principal-office lenses. Order rows were not acquired. No city pages or rankings.',
    path: '/mississippi',
    host: await readRequestHost(),
  });
}

export default function MississippiPage() {
  const overlap = registration.exactCrdIntersections;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Mississippi</p>
      <h1>Mississippi Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Mississippi Secretary of State Securities Division regulates securities activity in Mississippi. State investment adviser registration, notice filing, exempt reporting advisers, investment adviser representatives, broker-dealers, and agents are separate classes. Registration is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.orders}>Secretary of State enforcement search</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p>State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. They cannot be summed. Counts below use regulator jurisdiction code MS, not a main-office address. APPROVED and FILED are IAPD status text, not a quality judgment.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.count)}</p><h3>Mississippi state IA firm CRDs, APPROVED</h3><p>{registration.stateIa.filter}. This extract has {registration.stateIa.rows} StateRgstn rows, and every one is APPROVED. An office in Mississippi does not by itself establish state registration. {registration.mainOfficeDiagnostic.approvedStateIaWithMississippiMainOffice} of these APPROVED firm CRDs also have a Mississippi main office in the state compilation. That overlap is not another population. {registration.mainOfficeDiagnostic.addressMississippiWithoutMississippiJurisdiction} firm record has a Mississippi main office without a Mississippi StateRgstn or ERA row. That address is not a registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.count)}</p><h3>Federal notice firm CRDs, FILED</h3><p>{registration.federalNotice.filter}. Notice filing is not Mississippi state IA registration. Every filed row in this extract is FirmType Registered, not ERA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.count)}</p><h3>Active ERA firm CRDs</h3><p>{registration.era.filter}. An exempt reporting adviser is not an SEC-registered RIA and not a state-registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Mississippi principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not Mississippi registration or notice filing, and this count was not recomputed as the published figure from the {registration.acceptedIapdSourceDate} compilation. A separate MainAddr recount on that compilation is also {registration.mainOfficeDiagnostic.secCompilationMainAddrMississippi}. Equal counts were not intersected and are not the same firms.</p></article>
      </div>
      <p>Exact firm-CRD intersections from the {registration.acceptedIapdSourceDate} jurisdiction filters, kept separate: state IA APPROVED and notice FILED {overlap.stateIaApprovedAndNoticeFiled.length}; state IA and ERA {overlap.stateIaAndEra.length}; ERA and notice {overlap.eraAndNoticeFiled.length}. The accepted principal-office overlay has no CRD list in this publication, so it is not intersected here. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. No national adviser population was duplicated. <a href={registration.stateFeed.url}>IAPD state compilation</a> · <a href={registration.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p><a href={SOURCE.brokercheck}>FINRA BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> are additional firm or person research paths. Mississippi-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is not a firm CRD. An investment adviser representative is not a firm.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Securities orders and complaints</h2><p>The <a href={SOURCE.orders}>Secretary of State enforcement search</a> is public. Order rows were <strong>NOT_ACQUIRED</strong>. The first result page is not a census. A cease-and-desist is not a final adjudication. Respondent names were not stored and were not joined to a firm or person. <strong>Exact adverse attachments: {orders.exactEnforcementAttachments}; name-only adverse joins: {orders.nameOnlyAdverseJoins}.</strong></p><p>The division publishes a <a href={SOURCE.complaints}>complaint form</a>. Complaint intake is <strong>KNOWN</strong>. Provider complaint rows and outcomes are <strong>NOT_ACQUIRED</strong>. A complaint is not an enforcement finding. Provider examination rows are <strong>NOT_ACQUIRED</strong>.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. IAPD jurisdiction filters: {registration.acceptedIapdSourceDate}, filtered {registration.filteredAt}. Enforcement search reviewed {orders.retrievedAt}. Snapshot generated {registration.generatedAt}. There is no universal Mississippi securities as-of date.</p><p>Secretary of State bulk registration, broker-dealer, agent and IAR rosters, the securities order corpus, exact SEC-file intersections, provider exam rows and complaint outcomes: <strong>NOT_ACQUIRED</strong>. Existing canonical matches were not re-read from the firm spine, so spine membership of the {registration.canonicalReconciliation.unresolvedIdentities} APPROVED state-IA firm CRDs stays unresolved. Net-new canonical firms created: {registration.newCanonicalFirms}. Graph writes: {registration.graphWrites}. Claim eligibility changes: {registration.claimChanges}. Jackson, Gulfport, and Biloxi stay statewide. No county or city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Mississippi">Ask about Mississippi evidence</Link></p></div></section>
  </main>;
}
