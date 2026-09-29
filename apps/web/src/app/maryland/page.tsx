import Link from 'next/link';
import { MD_REGISTRATION_LENSES as registration, MD_SECURITIES_ACTIONS as actions } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://oag.maryland.gov/i-need-to/Pages/securities-division.aspx',
  orders: actions.indexUrl,
  exams: 'https://oag.maryland.gov/i-need-to/Pages/investment-adviser-resources.aspx',
  complaints: 'https://oag.maryland.gov/i-need-to/Pages/file-a-securities-complaint.aspx',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

export async function generateMetadata() {
  return pageMetadata({ title: 'Maryland Investment Adviser & Securities Intelligence', description: 'Maryland Securities Division registration verification, distinct adviser lenses, 2022–2026 administrative actions, examination and complaint capabilities. No rankings.', path: '/maryland', host: await readRequestHost() });
}

type Search = { crd?: string; sec?: string };

export default async function MarylandPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const crd = typeof params.crd === 'string' && /^\d{4,10}$/.test(params.crd) ? params.crd : '';
  const sec = typeof params.sec === 'string' && /^801-\d{1,8}$/i.test(params.sec) ? params.sec.toUpperCase() : '';
  const candidates = actions.rows.filter((row) => (crd && (row.printedCrdCandidates as string[]).includes(crd)) || (sec && (row.printedSecFileCandidates as string[]).includes(sec)));
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Maryland</p>
      <h1>Maryland Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Maryland Office of the Attorney General, Securities Division registers investment advisers, broker-dealers and their separate representative and agent classes. Its published administrative actions add state-specific evidence. Registration status is source reporting, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.division}>Verify with Maryland</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p>Maryland state IA current or approved registration, federal-covered adviser notice filings, active exempt reporting advisers (ERA), and Maryland principal offices are separate firm-CRD lenses. They cannot be summed. Maryland directs the public to contact its Securities Division for exact registration and complaint checks. A clean statewide Maryland roster was <strong>NOT_ACQUIRED</strong>.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>State IA firm CRDs</h3><p>NOT_ACQUIRED. Confirm current Maryland status with the division or IAPD. “Approved” is a source status, not investment quality.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>Federal notice firm CRDs</h3><p>NOT_ACQUIRED. A notice filing is not Maryland state IA registration or a Maryland office.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>Active ERA firm CRDs</h3><p>NOT_ACQUIRED. An ERA is not an SEC-registered RIA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Maryland principal-office firms</h3><p>Accepted national SEC/IARD roster, {registration.principalOffice.sourceAsOf}. This older office-geography lens is not Maryland registration or service territory.</p></article>
      </div>
      <p>The later IAPD compilation source date is {registration.acceptedIapdSourceDate}, but Maryland registration filters could not be reproduced from accessible files in this run. The older accepted national roster supports only the principal-office geography above. Exact Maryland CRD intersections are <strong>NOT_ACQUIRED</strong>, not zero. No national adviser population was duplicated.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p><a href={SOURCE.division}>The Securities Division</a> provides exact registration and complaint checks for brokerage firms, stockbrokers and advisers. <a href={SOURCE.brokercheck}>BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> provide further firm or person research. Maryland-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is never treated as a firm CRD.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>2022–2026 Securities Division actions</h2><p>The <a href={SOURCE.orders}>Maryland administrative-actions index</a> supplied <strong>{actions.rows.length} dated rows</strong> in the bounded window. {actions.rows.filter((row) => !!row.sourceDocument).length} links resolved to official PDF paths; {actions.rows.filter((row) => row.pdfChecked).length} PDFs were readable in this pass. These are document-index rows, not unique matters, firms, final adverse findings or a complete history.</p><p>Index labels: {actions.statusCounts.consent} consent, {actions.statusCounts.final} final, {actions.statusCounts.show_cause_or_summary} show-cause or summary, and {actions.statusCounts.other_or_unresolved} other or unresolved. A show-cause order is not a final finding; consent and final orders retain their separate source labels. Sixteen readable PDFs contain printed CRD candidates. They have not been assigned firm or person identity solely from that print. <strong>Exact firm attachments: 0; name-only adverse joins: 0.</strong></p>
      <form action="/maryland" className="ith-actions"><label>Printed CRD candidate <input name="crd" defaultValue={crd} inputMode="numeric" placeholder="Labeled CRD" /></label><label>Printed SEC file <input name="sec" defaultValue={sec} placeholder="801-xxxxx" /></label><button type="submit">Check bounded documents</button></form>
      {(crd || sec) && <p>{candidates.length} document(s) print that identifier within the first two pages. This is a document candidate, not a verified respondent match or an adverse profile attachment. No result does not imply a clean history.</p>}
      {candidates.length > 0 && <ul>{candidates.slice(0, 20).map((row) => <li key={`${row.actionDateAsIndexed}-${row.attachmentAsIndexed}`}><a href={row.sourceDocument ?? SOURCE.orders}>{row.respondentAsIndexed}</a> · {row.orderTypeAsIndexed} · index date {row.actionDateAsIndexed}</li>)}</ul>}
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>Maryland describes an <a href={SOURCE.exams}>investment-adviser examination program</a>. Examination capability is <strong>KNOWN</strong>; provider-level outcomes are <strong>NOT_ACQUIRED</strong>. The division accepts <a href={SOURCE.complaints}>securities complaints</a>; complaint intake is <strong>KNOWN</strong>. The complaint form says submitted personal information remains confidential unless formal legal action is taken. Public provider-level complaint rows and outcomes are <strong>NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Older accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}; later IAPD compilation source date: {registration.acceptedIapdSourceDate}; Maryland registration status date: unavailable; action-list retrieval: {actions.retrievedAt}; each action&apos;s displayed list date is retained separately; snapshot generated: {actions.generatedAt}. There is no universal Maryland securities as-of date.</p><p>State IA, notice and ERA counts and exact CRD intersections: <strong>NOT_ACQUIRED</strong>. Maryland-only BD and person rosters, provider-level exam results and complaints: <strong>NOT_ACQUIRED</strong>. New canonical firms: 0. Graph writes: 0. Claim changes: 0. No city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Maryland">Ask about Maryland evidence</Link> · <a href={SOURCE.division}>Maryland Securities Division</a></p></div></section>
  </main>;
}
