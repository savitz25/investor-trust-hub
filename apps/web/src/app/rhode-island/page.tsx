import Link from 'next/link';
import { RI_REGISTRATION_LENSES as registration, RI_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://dbr.ri.gov/banking-securities-and-charitable-organizations/securities-and-charities',
  lists: 'https://www.elicensing.ri.gov/',
  lookup: 'https://dbr.ri.gov/about-dbr/lookup-license',
  iapd: 'https://adviserinfo.sec.gov/',
  stateFeed: registration.stateFeed.url,
  secFeed: registration.secFeed.url,
  brokercheck: 'https://brokercheck.finra.org/',
  orders: orders.source.url,
  initial: 'https://dbr.ri.gov/about-dbr/i-need-initial-license',
};
const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Rhode Island Investment Adviser & Securities Intelligence',
    description: 'Rhode Island DBR securities authority, distinct IAPD registration lenses, source-linked securities orders and lookup paths. No combined totals or rankings.',
    path: '/rhode-island',
    host: await readRequestHost(),
  });
}

export default function RhodeIslandPage() {
  const latestOrders = orders.rows.slice(0, 12);
  const intersections = registration.exactFirmCrdIntersections;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Rhode Island</p>
      <h1>Rhode Island Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Rhode Island Department of Business Regulation Securities Division administers state securities law and registers or licenses certain investment advisers, investment adviser representatives, broker-dealers and sales representatives. State IA, federal notice filing, ERA, IAR, broker-dealer, agent and order records are separate regulatory grains.</p>
      <p className="ith-kicker">Source-linked regulatory evidence. No adviser ranking.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.lookup}>Verify with Rhode Island DBR</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Check IAPD</a></div>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>Distinct firm registration lenses</h2>
      <p>The official IAPD STATE and SEC firm compilations are dated <strong>{registration.sourceAsOf}</strong>; retrieved {registration.retrievedAt}. Counts below are firm CRDs filtered by regulator jurisdiction or SEC notice status. They are not live DBR status and are not additive.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.stateIa.approvedFirmCrds)}</p><h3>State IA firm CRDs, APPROVED</h3><p>{fmt(registration.stateIa.registrationRows)} state IA registration observations across statuses; {fmt(registration.stateIa.distinctFirmCrds)} distinct firm CRDs. Approved is a registration status, not an endorsement.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.federalNotice.filedFirmCrds)}</p><h3>Federal notice firm CRDs, FILED</h3><p>IAPD notice jurisdiction RI, status FILED. This is not a state-IA registration or a Rhode Island principal office.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.era.activeFirmCrds)}</p><h3>ERA firm CRDs, ACTIVE</h3><p>{fmt(registration.era.registrationRows)} ERA registration observations across statuses; {fmt(registration.era.distinctFirmCrds)} distinct CRDs. An ERA is not a state IA or SEC-registered RIA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(registration.principalOffice.distinctFirmCrds)}</p><h3>SEC compilation firms with RI principal office</h3><p>Address geography only. A principal office is not a Rhode Island registration or permission to serve clients.</p></article>
      </div>
      <p>Exact firm-CRD intersections: approved state IA ∩ filed federal notice <strong>{intersections.approvedStateIaAndFiledFederalNotice.length}</strong>; state IA ∩ active ERA <strong>{intersections.stateIaAndActiveEra.length}</strong>; active ERA ∩ filed notice <strong>{intersections.activeEraAndFiledFederalNotice.length}</strong>; principal office ∩ filed notice <strong>{intersections.principalOfficeAndFiledFederalNotice.length}</strong>. An intersection describes identity overlap and does not create another population.</p>
      <p><a href={SOURCE.stateFeed}>IAPD state compilation</a> · <a href={SOURCE.secFeed}>IAPD SEC compilation</a> · <a href={SOURCE.initial}>DBR registration and filing guidance</a> · <a href={SOURCE.lists}>DBR eLicensing portal</a></p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>People, broker-dealers and agents stay separate</h2>
      <p>Rhode Island identifies IARD as the filing system for investment advisers and IARs, and CRD for broker-dealers and sales representatives. Provider-level RI IAR, broker-dealer and sales-agent bulk rows were <strong>NOT_ACQUIRED</strong>. Use exact-name or CRD lookups in <a href={SOURCE.lookup}>DBR eLicensing</a>, <a href={SOURCE.iapd}>IAPD</a> and <a href={SOURCE.brokercheck}>FINRA BrokerCheck</a>. Person CRDs are not firm records.</p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>DBR Securities Division action documents</h2>
      <p>The DBR page listed {fmt(orders.documentRows)} linked securities action documents when retrieved {orders.source.retrievedAt}. This is a document-row count, not unique people, firms, final findings or a complete disciplinary history. Each document needs its own review; no name-only joins or adverse profile attachments are made.</p>
      <ul>{latestOrders.map((row) => <li key={row.sourceDocument}><a href={row.sourceDocument}>{row.respondentAsIndexed}</a> · {row.actionType} · {row.dateAsIndexed}</li>)}</ul>
      <p><a href={SOURCE.orders}>View the complete DBR securities action index</a>. An order or consent agreement may describe allegations, agreements or findings with different procedural status.</p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>Source clocks and limits</h2>
      <p>IAPD firm feeds: source date {registration.sourceAsOf}; retrieved {registration.retrievedAt}. DBR action index: retrieved {orders.source.retrievedAt}. The DBR portal describes live lookup and roster tools, but its downloadable provider-level export was not acquired for this publication. Broker-dealer, agent and provider-level IAR rosters remain <strong>NOT_ACQUIRED</strong>.</p>
      <p>There is no combined adviser total. HMDA is not securities licensing. No provider-level adverse records are attached by name. <Link href="/ask?q=Rhode%20Island%20securities%20evidence">Ask about Rhode Island securities evidence</Link>.</p>
    </div></section>
  </main>;
}
