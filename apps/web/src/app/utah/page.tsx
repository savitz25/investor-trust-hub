import census from '../../../../../data/utah/ut-inv-001/iapd-ut-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Utah Investment Adviser and Securities Research',
    description: 'Utah Division of Securities and IAPD evidence, separating Utah state investment adviser registration, SEC notice filings, exempt reporting advisers, people, broker-dealers, and office geography.',
    path: '/utah',
    host: await readRequestHost(),
  });
}

export default function UtahInvestorPage() {
  const state = census.state;
  const sec = census.sec;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Utah</p>
      <h1>Utah investment adviser and securities research</h1>
      <p className="ith-lede">The Utah Division of Securities regulates securities activity under Utah law. The IAPD compilation separates state registration, federal notice filings, and exempt reporting advisers by regulator jurisdiction. A source-reported filing is not an endorsement or a recommendation.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://securities.utah.gov/">Utah Division of Securities</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Separate IAPD firm populations</h2>
      <p>These distinct firm CRDs come from the September 17, 2026 state and SEC IAPD compilation feeds. Regulator jurisdiction fields selected the populations; Utah principal-office geography was not used. Credential groups overlap and must not be added into one Utah adviser total.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.state_ia_distinct_crd)}</p><h3>Utah state IA firms</h3><p>{fmt(state.state_ia_status.APPROVED)} source rows report APPROVED and {fmt(state.state_ia_status.CONDREST)} report CONDREST. This is the state regulator code UT, not a Utah-address overlay.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ut_notice_filed_distinct_crd)}</p><h3>Federal adviser Utah notice filings</h3><p>SEC compilation rows report FILED under NoticeFiled/States regulator code UT; source firm type is Registered. A notice filing is separate from Utah state IA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.state_era_distinct_crd)}</p><h3>Utah ERA firms</h3><p>ERA/Rgltr code UT rows report ACTIVE. An exempt reporting adviser is not a state registered IA or an SEC registered adviser.</p></article>
      </div>
      <p>Exact firm CRD overlap: {census.overlaps.state_ia_approved_and_notice_filed_exact_crd} appears in both the APPROVED state IA and FILED SEC notice sets. The source observations remain separate. State IA and ERA sets have {census.overlaps.state_ia_and_era_exact_crd} exact CRD overlap; ERA and notice sets have {census.overlaps.state_era_and_notice_filed_exact_crd}.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Other Utah regulatory records</h2>
      <p>Utah Department of Financial Institutions and Utah Division of Real Estate authority is separate from the Division of Securities. Mortgage companies, lenders, brokers, servicers, branches, MLO people, DFI-regulated classes, DRE-regulated classes, NMLS identities, and HMDA activity are not merged into these IAPD counts. Their rosters were <strong>NOT_ACQUIRED</strong>. <a href="https://dfi.utah.gov/">Utah DFI</a>, <a href="https://realestate.utah.gov/">Utah DRE</a>, and <a href="https://mortgage.nationwidelicensingsystem.org/">NMLS</a> are distinct research paths. HMDA describes market activity, not licensing.</p>
      <p>Utah IAR person rosters, broker-dealer firm and agent rosters, and a complete Division of Securities enforcement/order corpus are <strong>NOT_ACQUIRED</strong>. A person is not a firm. <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> support named-record research. No adverse record was attached by name; a complaint is not a violation finding.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Sources and clocks</h2>
      <p><a href={state.url}>IAPD state compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>, both source dated {state.sourceAsOf}; retained files examined {state.retainedFileExaminedAt}. State feed SHA-256: {state.sha256}. SEC feed SHA-256: {sec.sha256}. Raw source values and compressed feeds are retained with this snapshot. This is compilation evidence, not a live license check.</p>
      <p>Existing canonical firm matches were not re-read from production; new entities, evidence attachments and graph writes by this page: 0. No city or county pages, rankings, ratings, or adviser recommendations are published.</p>
    </div></section>
  </main>;
}
