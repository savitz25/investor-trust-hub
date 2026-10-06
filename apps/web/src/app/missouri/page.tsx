import census from '../../../../../data/missouri/mo-inv-001/iapd-mo-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');
const state = census.state;
const sec = census.sec;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Missouri Investment Adviser and Securities Research',
    description: 'Missouri Securities Division and IAPD evidence, separating state investment adviser registration, SEC notice filings, exempt reporting advisers and office geography.',
    path: '/missouri',
    host: await readRequestHost(),
  });
}

export default function MissouriInvestorPage() {
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Missouri</p>
      <h1>Missouri investment adviser and securities research</h1>
      <p className="ith-lede">The Missouri Secretary of State Securities Division regulates securities activity in Missouri. IAPD firm records identify different registration and filing classes. A reported registration is a source status, not an endorsement or a recommendation.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://www.sos.mo.gov/securities/orders">Missouri securities orders</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate firm lenses</h2>
      <p>These figures use distinct firm CRDs and the September 17, 2026 IAPD compilation. Missouri jurisdiction fields determine the three filing classes. Main-office state is geography only. The lenses overlap and must not be added.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.mo_state_ia_approved_distinct_crd)}</p><h3>State IA firms, APPROVED</h3><p>{state.mo_state_ia_registration_rows} StateRgstn rows with regulator code MO. Only APPROVED rows are included. The Missouri office address did not select them.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.mo_notice_filed_distinct_crd)}</p><h3>SEC notice firms, FILED</h3><p>{sec.mo_notice_rows} Missouri NoticeFiled rows. A federal notice filing is not Missouri state IA registration. All filed rows in this extract have the source firm type Registered.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.mo_state_era_active_distinct_crd)}</p><h3>Exempt reporting adviser firms, ACTIVE</h3><p>{state.mo_state_era_registration_rows} ERA/Rgltr rows with code MO. An ERA is not a state registered IA or an SEC registered adviser.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.mo_principal_office_distinct_crd)}</p><h3>Missouri principal-office firms</h3><p>MainAddr state MO in the SEC compilation. This is office geography, not Missouri registration or notice filing.</p></article>
      </div>
      <p>Exact CRD overlap: {census.overlaps.state_ia_approved_and_notice_filed} firm appears in both the APPROVED state IA and FILED notice sets. The firm retains both source observations. No canonical firm was duplicated by this page.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>People, broker-dealers and orders</h2><p>Investment adviser representatives, broker-dealer firms and agents require their own person or firm CRD evidence. Missouri-only IAR, broker-dealer and agent rosters are <strong>NOT_ACQUIRED</strong>. A person is not a company. <a href="https://brokercheck.finra.org/">BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the named-record research paths.</p><p>The <a href="https://www.sos.mo.gov/securities/orders">Missouri Securities Division orders index</a> was reviewed October 6, 2026. Order rows were not acquired as a complete corpus and no order was attached to a firm or person by name. An enforcement order is separate from a complaint; a complaint is not a finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and coverage</h2><p><a href={state.url}>State IAPD compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>: source as of {state.sourceAsOf}, retained files examined {state.retainedFileExaminedAt}. The files have separate SHA-256 hashes: state {state.sha256}; SEC {sec.sha256}. No live license status is asserted.</p><p>Existing canonical firm matches and net-new entities were not re-read from production. New entities, evidence attachments and graph writes by this page: 0. Missouri Secretary of State bulk registrations, IAR, broker-dealer and agent rows, complete orders, provider examinations and complaint outcomes: NOT_ACQUIRED. No city or county pages or ratings are published.</p></div></section>
  </main>;
}
