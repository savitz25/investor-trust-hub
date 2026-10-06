import census from '../../../../../data/arkansas/ar-inv-001/iapd-ar-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');
const state = census.state;
const sec = census.sec;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Arkansas Investment Adviser and Securities Research',
    description: 'Arkansas Securities Department and IAPD evidence, separating state investment adviser registration, SEC notice filings, exempt reporting advisers and office geography.',
    path: '/arkansas',
    host: await readRequestHost(),
  });
}

export default function ArkansasInvestorPage() {
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Arkansas</p>
      <h1>Arkansas investment adviser and securities research</h1>
      <p className="ith-lede">The Arkansas Securities Department regulates securities activity in Arkansas. IAPD firm records identify different registration and filing classes. A reported registration is a source status, not an endorsement or a recommendation.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://securities.arkansas.gov/">Arkansas Securities Department</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate firm lenses</h2>
      <p>These figures use distinct firm CRDs and the September 17, 2026 IAPD compilation. Arkansas jurisdiction fields determine the three filing classes. Main-office state is geography only. The lenses overlap and must not be added.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ar_state_ia_approved_distinct_crd)}</p><h3>State IA firms, APPROVED</h3><p>{state.ar_state_ia_registration_rows} StateRgstn rows with regulator code AR. Only APPROVED rows are included. The Arkansas office address did not select them.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ar_notice_filed_distinct_crd)}</p><h3>SEC notice firms, FILED</h3><p>{sec.ar_notice_rows} Arkansas NoticeFiled rows. A federal notice filing is not Arkansas state IA registration. All filed rows in this extract have the source firm type Registered.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ar_state_era_active_distinct_crd)}</p><h3>Exempt reporting adviser firms, ACTIVE</h3><p>{state.ar_state_era_registration_rows} ERA/Rgltr rows with code AR. An ERA is not a state registered IA or an SEC registered adviser.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ar_principal_office_distinct_crd)}</p><h3>Arkansas principal-office firms</h3><p>MainAddr state AR in the SEC compilation. This is office geography, not Arkansas registration or notice filing.</p></article>
      </div>
      <p>Exact CRD overlap: {census.overlaps.state_ia_approved_and_notice_filed} firm appears in both the APPROVED state IA and FILED notice sets. The firm retains both source observations. No canonical firm was duplicated by this page.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>People, broker-dealers and orders</h2><p>Investment adviser representatives, broker-dealer firms and agents require their own person or firm CRD evidence. Arkansas-only IAR, broker-dealer and agent rosters are <strong>NOT_ACQUIRED</strong>. A person is not a company. <a href="https://brokercheck.finra.org/">BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the named-record research paths.</p><p>An Arkansas Securities Department order corpus was <strong>NOT_ACQUIRED</strong>. No order was attached to a firm or person by name. An enforcement order is separate from a complaint; a complaint is not a finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and coverage</h2><p><a href={state.url}>State IAPD compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>: source as of {state.sourceAsOf}, retained files examined {state.retainedFileExaminedAt}. The files have separate SHA-256 hashes: state {state.sha256}; SEC {sec.sha256}. No live license status is asserted.</p><p>Existing canonical firm matches and net-new entities were not re-read from production. New entities, evidence attachments and graph writes by this page: 0. Arkansas Securities Department bulk registrations, IAR, broker-dealer and agent rows, complete orders, provider examinations and complaint outcomes: NOT_ACQUIRED. Little Rock, Fayetteville, and Fort Smith are geography only. No city or county pages or ratings are published.</p></div></section>
  </main>;
}
