import Link from 'next/link';
import { CT_REGISTRATION_LENSES as registration, CT_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://portal.ct.gov/dob/securities-division-administration/securities-division/securities-and-business-investments-division',
  lists: registration.regulatorListPage,
  verify: 'https://portal.ct.gov/dob/about-dob/index-pages/verify-a-license',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
  orders: 'https://portal.ct.gov/dob/enforcement/administrative-orders-index-pages',
  iaExams: 'https://portal.ct.gov/dob/securities-division-administration/securities-examination-program/investment-adviser-examination-program-in-connecticut',
  bdExams: 'https://portal.ct.gov/dob/securities-division-administration/securities-examination-program/broker-dealer-examination-program-in-connecticut',
  complaints: 'https://portal.ct.gov/dob/consumer/consumer-complaints/securities-bd-ia',
};

const fmt = (n: number) => n.toLocaleString('en-US');
const iapd = registration.iapd;
const dob = registration.regulatorLists;
const intersections = iapd.exactCrdIntersections;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Connecticut Investment Adviser & Securities Intelligence',
    description: 'Connecticut Department of Banking adviser lists, distinct IAPD registration lenses, securities orders, verification and examination capability. No rankings.',
    path: '/connecticut',
    host: await readRequestHost(),
  });
}

type Search = { crd?: string; sec?: string };

export default async function ConnecticutPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const crd = typeof params.crd === 'string' && /^\d{1,10}$/.test(params.crd) ? params.crd : '';
  const sec = typeof params.sec === 'string' && /^80[12]-\d{1,8}$/i.test(params.sec) ? params.sec.toUpperCase() : '';
  const crdRows = crd ? orders.rows.filter((row) => row.exactIapdFirmCrdCrosswalk === crd) : [];
  const secRows = sec ? orders.rows.filter((row) => row.printedSecFile === sec) : [];

  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Connecticut</p>
      <h1>Connecticut Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Connecticut Department of Banking, Securities and Business Investments Division registers investment advisers, broker-dealers and their separate agent classes. A state-registered adviser firm, federal notice filer, exempt reporting adviser, broker-dealer, representative, Form ADV filing and Connecticut principal office are not interchangeable.</p>
      <p className="ith-kicker">Regulator evidence, separated by grain. No adviser ranking.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.verify}>Verify with Connecticut</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Check IAPD</a></div>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>Connecticut regulator lists and current-source lenses</h2>
      <p><a href={SOURCE.lists}>Connecticut publishes three statewide downloadable adviser lists</a>, each marked updated {dob.stateIa.sourceUpdated}. The lists retain distinct state IA, SEC notice and ERA classes; these dated snapshots are not live status. The separate accepted IAPD firm compilations below are dated {iapd.sourceAsOf}. Neither source is a combined “Connecticut advisers” census.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(iapd.stateIa.approvedFirmCrds)}</p><h3>State IA firm CRDs, APPROVED</h3><p>IAPD {iapd.stateIa.filter}; {fmt(iapd.stateIa.rows)} state registration rows across statuses. Approved is registration status, not investment-quality approval. DOB&apos;s older list has {fmt(dob.stateIa.rows)} rows, including pending and termination-requested statuses.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(iapd.federalNotice.filedFirmCrds)}</p><h3>Federal-covered notice firm CRDs, FILED</h3><p>IAPD {iapd.federalNotice.filter}. A notice is not state IA registration or a Connecticut office. DOB&apos;s dated list has {fmt(dob.federalNotice.rows)} rows.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(iapd.era.activeFirmCrds)}</p><h3>Active ERA firm CRDs</h3><p>IAPD {iapd.era.filter}. An exempt reporting adviser is not a state IA or SEC-registered RIA. DOB&apos;s dated ERA list has {fmt(dob.era.rows)} rows.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(iapd.principalOffice.firmCrds)}</p><h3>SEC-compilation Connecticut principal offices</h3><p>{iapd.principalOffice.filter}. Office geography is not registration or authority to serve a client.</p></article>
      </div>
      <p>Exact firm-CRD intersections: approved state IA ∩ filed notice <strong>{intersections.stateIaApprovedAndNoticeFiled.length}</strong>; state IA ∩ ERA <strong>{intersections.stateIaAndEra.length}</strong>; ERA ∩ notice <strong>{intersections.eraAndNoticeFiled.length}</strong>; principal office ∩ notice <strong>{intersections.principalAndNoticeFiled.length}</strong>. Connecticut&apos;s older regulator lists exactly overlap the later IAPD lenses by CRD for {dob.exactCrdIntersectionsWithIapd.stateIaApproved} state IA, {dob.exactCrdIntersectionsWithIapd.noticeFiled} notice and {dob.exactCrdIntersectionsWithIapd.eraActive} ERA firm CRDs. Overlap is identity comparison, not an additive total.</p>
      <p><a href={dob.stateIa.url}>DOB state IA list</a> · <a href={dob.federalNotice.url}>DOB notice list</a> · <a href={dob.era.url}>DOB ERA list</a> · <a href={iapd.stateFeed.url}>IAPD state compilation</a> · <a href={iapd.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers and people are separate</h2><p>The division registers broker-dealers, securities agents and investment adviser agents. <a href={SOURCE.verify}>Connecticut verification</a>, <a href={SOURCE.brokercheck}>BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> support exact firm/person checks as appropriate. A Connecticut-only bulk broker-dealer, agent or representative roster was <strong>NOT_ACQUIRED</strong>. Person CRDs are never promoted into firm profiles.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>2022–2026 securities order index</h2><p>{fmt(orders.rows.length)} PDF document links were captured from Connecticut&apos;s annual <a href={SOURCE.orders}>Securities Division administrative-order and settlement indexes</a>; {fmt(orders.pdfsChecked)} PDFs were checked. This is a document-index count, not unique matters, firms, final adverse findings or a comprehensive disciplinary history. Some indexed documents state allegations that may be contested.</p><p>{fmt(orders.exactFirmCrdCrosswalks)} documents print a single organization-caption CRD exactly overlapping an accepted IAPD Connecticut lens. Those are read-only document crosswalks. <strong>0 adverse profile attachments; 0 name-only joins.</strong> Verify the document and live registration before relying on it.</p>
      <form action="/connecticut" className="ith-actions"><label>Exact firm CRD <input name="crd" defaultValue={crd} inputMode="numeric" placeholder="Firm CRD" /></label><button type="submit">Find indexed documents</button></form>
      {crd && <p>CRD {crd}: {crdRows.length} exact-caption crosswalk(s) in this bounded index. No result does not imply a clean history.</p>}
      {crdRows.length > 0 && <ul>{crdRows.map((row) => <li key={row.sourceDocument}><a href={row.sourceDocument}>{row.respondentAsIndexed}</a> · {row.actionLabelFromFilename} · {row.actionDateFromIndex ?? `index year ${row.indexYear}`}</li>)}</ul>}
      <form action="/connecticut" className="ith-actions"><label>Exact SEC file <input name="sec" defaultValue={sec} placeholder="801-xxxxx" /></label><button type="submit">Check printed file numbers</button></form>
      {sec && <p>SEC file {sec}: {secRows.length} printed single-file document candidate(s). A printed file number alone is not an adverse attachment.</p>}
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>Connecticut describes <a href={SOURCE.iaExams}>investment adviser examinations</a> and <a href={SOURCE.bdExams}>broker-dealer examinations</a>, including offices inside and outside Connecticut. Examination capability is <strong>KNOWN</strong>; provider-level outcomes are <strong>NOT_ACQUIRED</strong>. The department accepts <a href={SOURCE.complaints}>securities complaints</a> with a Connecticut nexus. Complaint intake is <strong>KNOWN</strong>; public provider-level complaint rows and outcomes are <strong>NOT_ACQUIRED</strong>. A complaint is not a finding, and missing evidence is not a clean record.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and limits</h2><p>DOB workbook update: {dob.stateIa.sourceUpdated}; separate retrieval clocks: state IA {dob.stateIa.retrievedAt}, notice {dob.federalNotice.retrievedAt}, ERA {dob.era.retrievedAt}. IAPD STATE and SEC feed source date: {iapd.sourceAsOf}; accepted retrieval: {iapd.acceptedRetrievedAt}. Securities-order index retrieved: {orders.retrievedAt}; order dates above are index labels, not independently adjudicated finality dates. Generated snapshot: {registration.generatedAt}. There is no universal Connecticut securities clock.</p><p>Connecticut-only broker-dealer/person rosters, provider-level examinations and complaints: <strong>NOT_ACQUIRED</strong>. New canonical firms: 0. Graph writes: 0. Claim changes: 0. No combined state adviser total or city pages.</p><p><Link href="/ask?q=Connecticut%20state%20registered%20investment%20adviser">Ask about Connecticut evidence</Link> · <a href={SOURCE.division}>Connecticut securities regulator</a></p></div></section>
  </main>;
}
