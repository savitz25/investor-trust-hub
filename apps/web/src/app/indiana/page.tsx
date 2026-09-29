import Link from 'next/link';
import { IN_IAPD_LENSES as lenses, IN_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  division: 'https://securities.sos.in.gov/',
  adviser: 'https://securities.sos.in.gov/general-information/investment-adviser/',
  brokerDealer: 'https://securities.sos.in.gov/general-information/broker-dealer/',
  notice: 'https://securities.sos.in.gov/federal-covered-advisers',
  search: 'https://securities.sos.in.gov/public-portfolio-search/',
  orders: orders.indexUrl,
  exams: 'https://securities.sos.in.gov/ia-exam-process/',
  questionnaire: 'https://securities.sos.in.gov/annual-questionnaire/',
  complaints: 'https://securities.sos.in.gov/general-information/file-a-complaint/',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Indiana Investment Adviser & Securities Intelligence',
    description: 'Indiana Securities Division research: separate IAPD state IA, federal notice, ERA and principal-office lenses; 2022–2026 administrative actions; examination and complaint capabilities. No rankings.',
    path: '/indiana',
    host: await readRequestHost(),
  });
}

export default function IndianaPage() {
  const overlap = lenses.exactCrdIntersections;
  const linked = orders.rows.filter((row) => row.exactIapdFirmCrdLinks.length);
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Indiana</p>
      <h1>Indiana Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Indiana Secretary of State, Securities Division registers investment advisers and their representatives, broker-dealers and their agents, receives federal-covered adviser notice filings, examines advisers and issues administrative actions. Registration is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.adviser}>Indiana adviser registration</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Verify on IAPD</a></div>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate Indiana adviser lenses</h2>
      <p>These are distinct firm-CRD sets partitioned from the accepted IAPD compilations dated {lenses.stateFeed.sourceAsOf}; no national population was re-ingested. They must not be added into an “Indiana advisers” total. <a href={SOURCE.adviser}>The Division explains</a> that advisers under the SEC threshold register with Indiana, while SEC-registered advisers make a <a href={SOURCE.notice}>notice filing</a>.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.stateIa.approvedDistinctFirmCrd)}</p><h3>Indiana state IA firm CRDs, APPROVED</h3><p>{lenses.stateIa.filter}. {fmt(lenses.stateIa.principalOfficeIn)} of them report an Indiana main office. APPROVED is IAPD status text, not a quality judgment.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.federalNotice.filedDistinctFirmCrd)}</p><h3>Federal-covered notice filings (FILED)</h3><p>{lenses.federalNotice.filter}. SEC-registered firms; a notice is not Indiana state IA registration or an Indiana office.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.era.activeDistinctFirmCrd)}</p><h3>Active exempt reporting adviser CRDs</h3><p>{lenses.era.filter}. ERA reporting is not state IA or SEC registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(lenses.principalOffice.distinctFirmCrd)}</p><h3>SEC-compilation Indiana principal-office firm CRDs</h3><p>{lenses.principalOffice.filter}. Office geography does not prove state registration, notice filing or ERA status.</p></article>
      </div>
      <p>Exact firm-CRD intersections: state IA (approved) ∩ notice {overlap.stateIaApprovedAndNoticeFiled.length}; state IA ∩ ERA {overlap.stateIaAndEra.length}; ERA ∩ notice {overlap.eraAndNoticeFiled.length}; principal office ∩ notice {overlap.principalAndNoticeFiled.length}. Exact SEC-file intersections were not separately computed. <a href={lenses.stateFeed.url}>IAPD state compilation</a> · <a href={lenses.secFeed.url}>IAPD SEC compilation</a></p>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p>Indiana registers <a href={SOURCE.brokerDealer}>broker-dealers and broker-dealer agents</a> and <a href={SOURCE.adviser}>investment adviser representatives</a> as separate firm and person classes. The Division’s <a href={SOURCE.search}>Registration Search</a> covers other registration types, says it is not an exhaustive list, and points to <a href={SOURCE.brokercheck}>BrokerCheck</a> for broker-dealer and adviser firms and individuals. Indiana-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>; verification capability is <strong>KNOWN</strong>. A person CRD is never a firm CRD, and no firm profile is built from a person registration.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>2022–2026 administrative actions</h2>
      <p>The Division’s <a href={SOURCE.orders}>Administrative Action Search</a> held {fmt(orders.indexRowsAtRetrieval)} actions at retrieval. <strong>{orders.rowCount} rows</strong> dated 2022–2026 are securities matters: {orders.entityTagCounts.securities_investment} tagged Securities/Investment plus {orders.entityTagCounts.loan_broker_iusa_cited} tagged Loan Broker whose orders cite only the Uniform Securities Act. Index labels: {orders.actionLabelCounts['final order']} final order, {orders.actionLabelCounts['consent agreement']} consent agreement, {orders.actionLabelCounts['cease and desist']} cease and desist, {orders.actionLabelCounts.bar} bar and {orders.actionLabelCounts['revocation order']} revocation (a row can carry several). A cease-and-desist or summary order can precede a hearing; do not read it as a final finding.</p>
      <p>{orders.rowsWithTextLayer} order PDFs have a text layer and {orders.scannedRowsIdentifiersNotAcquired} are scanned images, so printed identifiers for scanned orders are <strong>NOT_ACQUIRED</strong>. {orders.rowsWithPrintedCrdCandidates} text orders print CRD numbers, which can belong to firms or people. A CRD is linked only when it is an IAPD firm CRD and that firm’s IAPD name appears in the respondent caption: <strong>{orders.exactFirmCrdLinks} exact firm-CRD links</strong>, {orders.exactSecFileLinks} exact SEC-file links. These are read-only crosswalks: <strong>exact adverse attachments 0; name-only adverse joins 0</strong>. The Division says the index is not exhaustive.</p>
      <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm"><caption className="text-left font-semibold py-2">Rows with an exact IAPD firm-CRD link</caption><thead><tr><th>Index date</th><th>Respondent as indexed</th><th>Index label</th><th>Cause</th><th>Firm CRD</th></tr></thead><tbody>{linked.map((row) => <tr key={row.indexId}><td className="py-2 pr-3 whitespace-nowrap">{row.issuanceDate}</td><td className="pr-3">{row.respondentAsIndexed}</td><td className="pr-3">{row.actionTypesAsIndexed.join(', ')}</td><td className="pr-3 whitespace-nowrap">{row.causeAsIndexed}</td><td className="whitespace-nowrap">{row.exactIapdFirmCrdLinks.join(', ')}</td></tr>)}</tbody></table></div>
      <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm"><caption className="text-left font-semibold py-2">All {orders.rowCount} index rows (newest first)</caption><thead><tr><th>Index date</th><th>Respondent as indexed</th><th>Index label</th><th>Cause</th></tr></thead><tbody>{orders.rows.map((row) => <tr key={row.indexId}><td className="py-2 pr-3 whitespace-nowrap">{row.issuanceDate}</td><td className="pr-3">{row.respondentAsIndexed}</td><td className="pr-3">{row.actionTypesAsIndexed.join(', ')}</td><td className="pr-3 whitespace-nowrap">{row.causeAsIndexed}</td></tr>)}</tbody></table></div>
    </div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>The Division publishes its <a href={SOURCE.exams}>investment adviser examination process and procedures</a> (routine examinations of Indiana-registered advisers) and requires Indiana-domiciled advisers to complete an <a href={SOURCE.questionnaire}>annual questionnaire</a> (2026 due March 31). Examination capability is <strong>KNOWN</strong>; provider-level exam rows and outcomes are <strong>NOT_ACQUIRED</strong>. The Division <a href={SOURCE.complaints}>accepts investor complaints</a> through its portal or on paper. Complaint intake is <strong>KNOWN</strong>; provider complaint rows are <strong>NOT_ACQUIRED</strong> and outcomes are <strong>REQUEST_ONLY / NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>

    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>IAPD STATE and SEC compilation source date {lenses.stateFeed.sourceAsOf} (each feed SHA-256 pinned); lenses generated {lenses.generatedAt}. Indiana Registration Search: capability reviewed 2026-09-29, no bulk rows. Administrative-action index retrieved {orders.retrievedAt}; each row keeps its own Division index date. Examination resources reviewed 2026-09-29. There is no universal Indiana investor clock.</p><p>Indiana BD/agent/IAR bulk rosters, identifiers in scanned orders, provider-level exam outcomes and complaint cases are NOT_ACQUIRED. New canonical firms: 0. Graph writes: 0. Claim changes: 0. Indianapolis, Fort Wayne, Evansville and South Bend are geography only; no city routes, scores or adviser ranking.</p><p><Link href="/ask?q=Indiana%20state%20registered%20adviser">Ask about Indiana evidence</Link> · <a href={SOURCE.division}>Indiana Securities Division</a></p></div></section>
  </main>;
}
