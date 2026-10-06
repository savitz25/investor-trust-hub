import census from '../../../../../data/iowa/ia-inv-001/iapd-ia-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');
const state = census.state;
const sec = census.sec;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Iowa Investment Adviser and Securities Research',
    description: 'Iowa Insurance Division and IAPD evidence separating state investment adviser registration, SEC notice filings, exempt reporting advisers and office geography.',
    path: '/iowa',
    host: await readRequestHost(),
  });
}

export default function IowaInvestorPage() {
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Iowa</p>
      <h1>Iowa investment adviser and securities research</h1>
      <p className="ith-lede">The Iowa Insurance Division regulates securities activity in Iowa. IAPD firm records distinguish state adviser registration, SEC notice filing and exempt reporting. Reported status is not an endorsement or an investment recommendation.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://iid.iowa.gov/legal-resources/legal-information/enforcement-orders-actions">Iowa enforcement orders</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Separate firm filings</h2>
      <p>These are distinct firm CRDs in the September 17, 2026 IAPD compilation. Iowa jurisdiction fields select the filing classes. Main-office state is geography only. The classes can overlap and must not be added.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ia_state_ia_approved_distinct_crd)}</p><h3>State IA firms, APPROVED</h3><p>{fmt(state.ia_state_ia_registration_rows)} StateRgstn rows with regulator code IA; {state.ia_state_ia_termrequest_distinct_crd} TERMREQUEST CRDs are outside the approved count.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ia_notice_filed_distinct_crd)}</p><h3>SEC notice firms, FILED</h3><p>{fmt(sec.ia_notice_rows)} Iowa NoticeFiled rows. Federal notice filing does not mean Iowa state IA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ia_state_era_active_distinct_crd)}</p><h3>Exempt reporting advisers, ACTIVE</h3><p>{state.ia_state_era_registration_rows} ERA/Rgltr rows with Iowa jurisdiction. ERA is not a registered IA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ia_principal_office_distinct_crd)}</p><h3>Iowa principal-office firms</h3><p>MainAddr state IA in the SEC compilation. Office geography is not Iowa registration.</p></article>
      </div>
      <p>{census.overlaps.state_ia_approved_and_notice_filed} exact firm CRDs appear in both the approved state IA and filed notice sets. Both observations are retained; no firm is duplicated by this page.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>People, broker-dealers and orders</h2><p><a href="https://iid.iowa.gov/regulated-individuals/agents-advisers/investment-adviser">Investment adviser representatives</a> are people. Broker-dealer firms and securities agents have different registration grains. Iowa-only IAR, broker-dealer and agent populations are NOT_ACQUIRED here. <a href="https://brokercheck.finra.org/">BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> are the named-record research paths.</p><p>The <a href="https://iid.iowa.gov/legal-resources/legal-information/enforcement-orders-actions">Iowa Insurance Division orders</a> are case evidence, separate from registration and complaints. A complaint is not a finding. No adverse order was joined to a person or firm by name.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and coverage</h2><p><a href={state.url}>State IAPD compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>: source as of {state.sourceAsOf}; retained files examined {state.retainedFileExaminedAt}. SHA-256 state {state.sha256}; SEC {sec.sha256}. <a href="https://iid.iowa.gov/regulated-entities/securities-investments/investment-advisers">Iowa adviser filing rules</a> were checked October 6, 2026. Live current status must be rechecked by CRD.</p><p>Existing canonical matches: NOT_ACQUIRED. New canonical entities, record-level evidence attachments and graph writes: 0. Complete Iowa IAR, broker-dealer, agent, order and complaint outcomes remain NOT_ACQUIRED.</p></div></section>
  </main>;
}
