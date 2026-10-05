import Link from 'next/link';
import { LA_REGISTRATION_LENSES as registration, LA_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  ofi: 'https://ofi.la.gov/',
  securities: 'https://ofi.la.gov/securities/',
  adviser: 'https://ofi.la.gov/securities/investment-advisers/',
  broker: 'https://ofi.la.gov/securities/broker-dealers-and-agents/',
  faqs: 'https://ofi.la.gov/securities/faqs/',
  exams: 'https://ofi.la.gov/SecExamPolicy.pdf',
  complaints: 'https://ofi.la.gov/securities/securities-complaints/',
  prosecutions: 'https://ofi.la.gov/securities/criminal-prosecutions-2/',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Louisiana Investment Adviser & Securities Intelligence',
    description: 'Louisiana Office of Financial Institutions, Securities Division: separate state IA, federal notice, ERA and principal-office lenses. No administrative-order index, city pages, or rankings.',
    path: '/louisiana',
    host: await readRequestHost(),
  });
}

export default function LouisianaPage() {
  const overlap = registration.exactCrdIntersections;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Louisiana</p>
      <h1>Louisiana Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Louisiana Office of Financial Institutions, Securities Division registers securities offerings and licenses broker-dealers, agents, and investment advisers. The Commissioner of Financial Institutions serves as Commissioner of Securities. That is an officer of this Office, not a separate securities commission. Registration is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.adviser}>Louisiana adviser registration</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p><a href={SOURCE.securities}>OFI Securities</a> registers investment advisers. <a href={SOURCE.faqs}>OFI also describes notice-filing investment advisers</a> as a different class. State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. They cannot be summed. Counts below use regulator jurisdiction code LA, not a main-office address. APPROVED and FILED are IAPD status text, not a quality judgment.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.count)}</p><h3>Louisiana state IA firm CRDs, APPROVED</h3><p>{registration.stateIa.filter}. {registration.stateIa.rows} StateRgstn rows include {registration.stateIa.statusRows.TERMREQUEST} TERMREQUEST, which is not in this count. A Louisiana office alone does not establish state registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.count)}</p><h3>Federal notice firm CRDs, FILED</h3><p>{registration.federalNotice.filter}. Notice filing is not Louisiana state IA registration. Every filed row in this extract is FirmType Registered, not ERA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.count)}</p><h3>Active ERA firm CRDs</h3><p>{registration.era.filter}. An exempt reporting adviser is not an SEC-registered RIA and not a state-registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Louisiana principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not Louisiana registration or notice filing, and this count was not recomputed from the {registration.acceptedIapdSourceDate} compilation.</p></article>
      </div>
      <p>Exact firm-CRD intersections from the {registration.acceptedIapdSourceDate} jurisdiction filters, kept separate: state IA APPROVED ∩ notice FILED {overlap.stateIaApprovedAndNoticeFiled.length}; state IA ∩ ERA {overlap.stateIaAndEra.length}; ERA ∩ notice {overlap.eraAndNoticeFiled.length}. The accepted principal-office overlay has no CRD list in this publication, so it is not intersected here. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. No national adviser population was duplicated. <a href={registration.stateFeed.url}>IAPD state compilation</a> · <a href={registration.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p><a href={SOURCE.broker}>OFI describes broker-dealer and agent registration</a> separately from <a href={SOURCE.adviser}>investment adviser and investment adviser representative</a> requirements. <a href={SOURCE.brokercheck}>FINRA BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> are additional firm or person research paths. Louisiana-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is not a firm CRD. An investment adviser representative is not a firm.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>OFI securities orders</h2><p>An OFI administrative-order index was <strong>NOT_ACQUIRED</strong>. <a href={SOURCE.securities}>The Securities Division describes enforcement</a>, and <a href={SOURCE.prosecutions}>criminal-prosecution news</a> is a headline list, not an order corpus. Those headlines were not counted and were not parsed onto CRDs. A cease-and-desist is not a final finding. Missing is not zero orders. <strong>Exact adverse attachments: {orders.exactEnforcementAttachments}; name-only adverse joins: {orders.nameOnlyAdverseJoins}.</strong></p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>OFI publishes an <a href={SOURCE.exams}>examination policy for broker-dealers and state-registered investment advisers</a>. Examination capability is <strong>KNOWN</strong>; provider-level exam rows and outcomes are <strong>NOT_ACQUIRED</strong>. The division <a href={SOURCE.complaints}>accepts written securities complaints</a>. Complaint intake is <strong>KNOWN</strong>; provider complaint rows are <strong>NOT_ACQUIRED</strong> and outcomes are <strong>REQUEST_ONLY / NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. IAPD jurisdiction filters: {registration.acceptedIapdSourceDate}, filtered {registration.filteredAt}. OFI pages reviewed {orders.retrievedAt}. Snapshot generated {registration.generatedAt}. There is no universal Louisiana securities as-of date.</p><p>OFI bulk registration, broker-dealer, agent and IAR rosters, the administrative-order corpus, exact SEC-file intersections, provider exam rows and complaint outcomes: <strong>NOT_ACQUIRED</strong>. New canonical firms: 0. Graph writes: 0. Claim eligibility changes: 0. New Orleans, Baton Rouge, Shreveport and Lafayette stay statewide. No parish or city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Louisiana">Ask about Louisiana evidence</Link> · <a href={SOURCE.securities}>Louisiana OFI Securities</a></p></div></section>
  </main>;
}
