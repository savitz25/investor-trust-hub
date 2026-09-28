import Link from 'next/link';
import { MI_IAPD_LENSES as lenses, MI_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const OFFICIAL = {
  division: 'https://www.michigan.gov/lara/bureau-list/cscl/securities',
  ia: 'https://www.michigan.gov/lara/bureau-list/cscl/securities/industry/investment-advisers',
  list: 'https://www.michigan.gov/lara/bureau-list/cscl/licensing/critical-links/cscl-license-list-and-data',
  verify: 'https://www.michigan.gov/miclear',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
  orders: 'https://www.michigan.gov/lara/bureau-list/cscl/complaints/disciplinary/securities',
  reports: 'https://www.michigan.gov/lara/bureau-list/cscl/complaints/disciplinary/licensing-disciplinary-action-report',
  exams: 'https://www.michigan.gov/lara/bureau-list/cscl/securities/spotlight/mi-guide-investment-adviser-examination-program',
  complaints: 'https://www.michigan.gov/lara/bureau-list/cscl/complaints/file-a-complaint-miclear',
};

const fmt = (value: number) => value.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Michigan Investment Adviser & Securities Intelligence',
    description: 'Michigan CSCL securities research: distinct IAPD state IA, ERA, federal notice and principal-office lenses; published orders, examination and complaint capabilities. No rankings.',
    path: '/michigan',
    host: await readRequestHost(),
  });
}

type Search = { crd?: string; sec?: string };

export default async function MichiganPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const crd = typeof params.crd === 'string' && /^\d{1,10}$/.test(params.crd) ? params.crd : '';
  const sec = typeof params.sec === 'string' && /^801-\d{1,8}$/.test(params.sec) ? params.sec : '';
  const exact = crd ? orders.rows.filter((row) => row.exactIapdFirmCrdLink === crd) : [];
  const secCandidates = sec ? orders.rows.filter((row) => (row.printedSecFileCandidates as string[]).includes(sec)) : [];
  const latest = orders.rows.filter((row) => row.exactIapdFirmCrdLink).slice(0, 12);
  const overlap = lenses.exactCrdIntersections;

  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Michigan</p>
      <h1>Michigan Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">Michigan LARA’s Corporations, Securities &amp; Commercial Licensing Bureau (CSCL), Securities &amp; Audit Division is the regulator. IARD/CRD is filing infrastructure; IAPD and BrokerCheck are public research tools. A state-registered adviser firm, federal notice filer, exempt reporting adviser, broker-dealer, representative, securities agent, Form ADV filing and principal office are different grains. Registration is reported by the source, not an endorsement.</p>
      <p className="ith-kicker">We organize the evidence. You decide.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={OFFICIAL.verify}>Verify with Michigan</a><a className="th-btn-secondary th-btn-hero" href={OFFICIAL.iapd}>Research on IAPD</a></div>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate Michigan lenses</h2>
      <p>These are distinct firm-CRD sets from accepted IAPD compilations dated {lenses.stateFeed.sourceAsOf}. They must not be added into a “Michigan advisers” total. A Michigan-only CSCL active-license spreadsheet is request-only, so that regulator roster is <strong>NOT_ACQUIRED</strong>.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.stateIa.approvedDistinctFirmCrd)}</p><h3>Michigan state IA firm CRDs, APPROVED</h3><p>{lenses.stateIa.filter}; {fmt(lenses.stateIa.rows)} registration rows and {fmt(lenses.stateIa.distinctFirmCrd)} distinct firm CRDs across statuses. APPROVED is IAPD status text, not approval of investment quality.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.era.activeDistinctFirmCrd)}</p><h3>Active exempt reporting adviser CRDs</h3><p>{lenses.era.filter}. ERA reporting is not state IA or SEC RIA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.federalNotice.filedDistinctFirmCrd)}</p><h3>Filed federal-covered notices</h3><p>{lenses.federalNotice.filter}. A notice is not state IA registration and not a Michigan office.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.principalOffice.distinctFirmCrd)}</p><h3>SEC-compilation principal-office firm CRDs</h3><p>{lenses.principalOffice.filter}. Office geography is not a registration or service-area claim.</p></article>
      </div>
      <p>Exact firm-CRD intersections: state IA APPROVED ∩ filed notice <strong>{overlap.stateIaApprovedAndNoticeFiled.length}</strong> ({overlap.stateIaApprovedAndNoticeFiled.join(', ') || 'none'}); state IA ∩ ERA <strong>{overlap.stateIaAndEra.length}</strong>; ERA ∩ notice <strong>{overlap.eraAndNoticeFiled.length}</strong>; principal office ∩ notice <strong>{overlap.principalAndNoticeFiled.length}</strong>. These intersections are not a deduplicated population.</p>
      <p><a href={lenses.stateFeed.url}>IAPD state compilation</a> · <a href={lenses.secFeed.url}>IAPD SEC compilation</a> · <a href={OFFICIAL.ia}>CSCL adviser rules</a> · <a href={OFFICIAL.list}>CSCL request-only license list</a></p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and representatives</h2><p>CSCL regulates broker-dealers, securities agents and investment adviser representatives. Verify the exact person or firm on <a href={OFFICIAL.verify}>MiCLEAR</a>, <a href={OFFICIAL.iapd}>IAPD</a> or <a href={OFFICIAL.brokercheck}>BrokerCheck</a> as appropriate. Michigan-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>; person CRDs never become firm CRDs. Do not use an adviser-firm count as a count of professionals.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Published enforcement orders</h2><p>The CSCL public index contains {fmt(orders.rows.length)} Michigan Uniform Securities Act-tagged documents under 2022–2026 order-index paths. This is an index-document count, not unique respondents, matters, adverse findings, or a complete disciplinary history. Path year is not presumed to be the order date. Check <a href={OFFICIAL.orders}>Published Enforcement Orders</a>, <a href={OFFICIAL.reports}>Disciplinary Action Reports</a> and MiCLEAR for later action.</p>
      <p>{orders.exactFirmCrdCrosswalks} documents have a single firm CRD in an organization respondent caption that exactly overlaps an accepted IAPD Michigan-lens firm CRD. These are read-only crosswalks; <strong>0 adverse evidence attachments</strong> and <strong>0 name-only joins</strong>.</p>
      <form action="/michigan" className="ith-actions"><label>Exact firm CRD <input name="crd" defaultValue={crd} inputMode="numeric" placeholder="Firm CRD" /></label><button type="submit">Find indexed orders</button></form>
      {crd && <p>Firm CRD {crd}: {exact.length ? `${exact.length} exact-caption crosswalk(s) in this bounded index.` : 'No exact-caption crosswalk in this bounded index. This does not establish a clean history or current registration.'}</p>}
      <form action="/michigan" className="ith-actions"><label>Exact SEC file number <input name="sec" defaultValue={sec} placeholder="801-xxxxx" /></label><button type="submit">Check printed SEC numbers</button></form>
      {sec && <p>SEC file {sec}: {secCandidates.length} printed candidate(s) in the bounded order PDFs; no automatic firm attribution. Verify the document and IAPD identity.</p>}
      {exact.length > 0 && <ul>{exact.map((row) => <li key={row.sourceDocument}><a href={row.sourceDocument}>{row.respondentAsIndexed}</a> · {row.actionLabel} · index year {row.indexYear}</li>)}</ul>}
      <h3>Recent exact-CRD document crosswalks</h3><ul>{latest.map((row) => <li key={row.sourceDocument}><a href={row.sourceDocument}>{row.respondentAsIndexed}</a> · firm CRD {row.exactIapdFirmCrdLink} · {row.actionLabel} · index year {row.indexYear}</li>)}</ul>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>CSCL has an <a href={OFFICIAL.exams}>Investment Adviser Examination Program</a> for state-registered advisers. Provider-level examination outcomes were <strong>NOT_ACQUIRED</strong>; no listed outcome is not proof that a firm was never examined. <a href={OFFICIAL.complaints}>MiCLEAR accepts securities complaints</a>. Provider-level complaint records and outcomes were <strong>NOT_ACQUIRED</strong>; a complaint is not a finding.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>IAPD STATE and SEC compilation source dates: {lenses.stateFeed.sourceAsOf} (SHA-256 recorded separately for each feed); accepted retrieval: {lenses.retrievedAt}. CSCL order index retrieved {orders.retrievedAt}; individual order dates are shown only where parsed from a document. Generated snapshot: {lenses.generatedAt}. There is no universal Michigan investor clock.</p><p>CSCL active-license spreadsheet, BD/agent/IAR bulk rosters, provider-level exam outcomes and complaint cases are NOT_ACQUIRED. New canonical firms: 0. Graph writes: 0. Claim changes: 0. No city routes.</p><p><Link href="/ask?q=Michigan%20state%20registered%20adviser">Ask about Michigan evidence</Link> · <a href={OFFICIAL.division}>Michigan securities regulator</a></p></div></section>
  </main>;
}
