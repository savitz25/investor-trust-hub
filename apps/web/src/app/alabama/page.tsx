import Link from 'next/link';
import { AL_REGISTRATION_LENSES as registration, AL_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  asc: 'https://asc.alabama.gov/',
  registration: 'https://asc.alabama.gov/for-industry/registration/',
  stateFiling: 'https://asc.alabama.gov/for-industry/filing-requirements/investment-advisers-state-filing/',
  noticeFiling: 'https://asc.alabama.gov/for-industry/filing-requirements/investment-advisers-notice-filing/',
  representative: 'https://asc.alabama.gov/for-industry/filing-requirements/investment-adviser-representatives/',
  broker: 'https://asc.alabama.gov/for-industry/filing-requirements/broker-dealer/',
  agent: 'https://asc.alabama.gov/for-industry/filing-requirements/broker-dealer-agent/',
  orders: 'https://asc.alabama.gov/for-industry/enforcement/administrative-actions/',
  complaints: 'https://asc.alabama.gov/for-industry/enforcement/complaint-procedure/',
  auditing: 'https://asc.alabama.gov/for-industry/auditing/',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Alabama Investment Adviser & Securities Intelligence',
    description: 'Alabama Securities Commission: separate state IA, federal notice, ERA and principal-office lenses, plus a 2025–2026 administrative-action index. No city pages or rankings.',
    path: '/alabama',
    host: await readRequestHost(),
  });
}

export default function AlabamaPage() {
  const overlap = registration.exactCrdIntersections;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Alabama</p>
      <h1>Alabama Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Alabama Securities Commission Registration Division registers firms and individuals that offer or sell securities or provide investment advice in Alabama. State investment adviser filings, notice filings, investment adviser representatives, broker-dealers, and broker-dealer agents are separate registration classes. Registration is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.stateFiling}>Alabama state adviser filing</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p><a href={SOURCE.registration}>ASC Registration</a> lists <a href={SOURCE.stateFiling}>investment adviser state filing</a> separately from <a href={SOURCE.noticeFiling}>investment adviser notice filing</a>. State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. They cannot be summed. Counts below use regulator jurisdiction code AL, not a main-office address. APPROVED and FILED are IAPD status text, not a quality judgment.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.count)}</p><h3>Alabama state IA firm CRDs, APPROVED</h3><p>{registration.stateIa.filter}. {registration.stateIa.rows} StateRgstn rows include {registration.stateIa.statusRows.TERMREQUEST} TERMREQUEST, which is not in this count. An Alabama office alone does not establish state registration. {registration.mainOfficeDiagnostic.approvedStateIaWithAlabamaMainOffice} of these APPROVED firm CRDs also have an Alabama main office in the state compilation. That overlap is not another population.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.count)}</p><h3>Federal notice firm CRDs, FILED</h3><p>{registration.federalNotice.filter}. Notice filing is not Alabama state IA registration. Every filed row in this extract is FirmType Registered, not ERA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.count)}</p><h3>Active ERA firm CRDs</h3><p>{registration.era.filter}. An exempt reporting adviser is not an SEC-registered RIA and not a state-registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Alabama principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not Alabama registration or notice filing, and this count was not recomputed as the published figure from the {registration.acceptedIapdSourceDate} compilation. A separate MainAddr recount on that compilation is also {registration.mainOfficeDiagnostic.secCompilationMainAddrAlabama} and stays on its own clock.</p></article>
      </div>
      <p>Exact firm-CRD intersections from the {registration.acceptedIapdSourceDate} jurisdiction filters, kept separate: state IA APPROVED ∩ notice FILED {overlap.stateIaApprovedAndNoticeFiled.length}; state IA ∩ ERA {overlap.stateIaAndEra.length}; ERA ∩ notice {overlap.eraAndNoticeFiled.length}. The accepted principal-office overlay has no CRD list in this publication, so it is not intersected here. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. No national adviser population was duplicated. <a href={registration.stateFeed.url}>IAPD state compilation</a> · <a href={registration.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p>ASC lists <a href={SOURCE.broker}>broker-dealer</a> and <a href={SOURCE.agent}>broker-dealer agent</a> filings separately from <a href={SOURCE.representative}>investment adviser representative</a> filings. <a href={SOURCE.brokercheck}>FINRA BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> are additional firm or person research paths. Alabama-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is not a firm CRD. An investment adviser representative is not a firm.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>ASC administrative-action index, 2025–2026</h2><p><a href={SOURCE.orders}>The ASC administrative-actions page</a> groups documents by year folder. This publication read the 2025 and 2026 folders: <strong>{orders.yearCounts['2026']}</strong> documents in 2026 and <strong>{orders.yearCounts['2025']}</strong> in 2025, {orders.rowCount} index rows. Older year folders on that page were <strong>NOT_ACQUIRED</strong>. Missing older years are not zero. Source action tags partition those rows and are not findings:</p><ul>{orders.actionTagRows.map((row) => <li key={row.tag}>{row.tag}: {row.rows}</li>)}</ul><p>A cease-and-desist is not a final adjudication. A consent order keeps the source label consent order. Respondent text was not stored and was not joined to a firm or person. PDFs were not downloaded. <strong>Exact adverse attachments: {orders.exactEnforcementAttachments}; name-only adverse joins: {orders.nameOnlyAdverseJoins}.</strong></p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Auditing and complaints</h2><p>ASC publishes an <a href={SOURCE.auditing}>Auditing Division</a> page. Examination capability is <strong>KNOWN</strong>; provider-level exam rows and outcomes are <strong>NOT_ACQUIRED</strong>. The commission publishes a <a href={SOURCE.complaints}>complaint procedure</a>. Complaint intake is <strong>KNOWN</strong>; provider complaint rows are <strong>NOT_ACQUIRED</strong> and outcomes are <strong>REQUEST_ONLY / NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. IAPD jurisdiction filters: {registration.acceptedIapdSourceDate}, filtered {registration.filteredAt}. ASC index reviewed {orders.retrievedAt}. Snapshot generated {registration.generatedAt}. There is no universal Alabama securities as-of date.</p><p>ASC bulk registration, broker-dealer, agent and IAR rosters, older administrative-action folders, exact SEC-file intersections, provider exam rows and complaint outcomes: <strong>NOT_ACQUIRED</strong>. Existing canonical matches were not re-read from the firm spine, so spine membership of the {registration.canonicalReconciliation.unresolvedIdentities} APPROVED state-IA firm CRDs stays unresolved. Net-new canonical firms created: {registration.newCanonicalFirms}. Graph writes: {registration.graphWrites}. Claim eligibility changes: {registration.claimChanges}. Birmingham, Montgomery, Huntsville, Tuscaloosa, and Mobile, Alabama stay statewide. No county or city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Alabama">Ask about Alabama evidence</Link> · <a href={SOURCE.asc}>Alabama Securities Commission</a></p></div></section>
  </main>;
}
