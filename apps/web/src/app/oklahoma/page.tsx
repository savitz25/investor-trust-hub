import census from '../../../../../data/oklahoma/ok-inv-001/iapd-ok-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');
const state = census.state;
const sec = census.sec;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Oklahoma Investment Adviser and Securities Research',
    description: 'Oklahoma Department of Securities and IAPD evidence, separating state investment adviser registration, SEC notice filings, exempt reporting advisers and office geography.',
    path: '/oklahoma',
    host: await readRequestHost(),
  });
}

export default function OklahomaInvestorPage() {
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Oklahoma</p>
      <h1>Oklahoma investment adviser and securities research</h1>
      <p className="ith-lede">The Oklahoma Department of Securities regulates securities activity in Oklahoma. IAPD firm records identify different registration and filing classes. A reported registration is a source status, not an endorsement or a recommendation. This page does not rank advisers.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://www.securities.ok.gov/">Oklahoma Department of Securities</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate firm lenses</h2>
      <p>These figures use distinct firm CRDs and the September 17, 2026 IAPD compilation. Oklahoma jurisdiction fields determine the three filing classes. Main-office state is geography only. The lenses overlap and must not be added.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ok_state_ia_approved_distinct_crd)}</p><h3>State IA firms, APPROVED</h3><p>{state.ok_state_ia_registration_rows} StateRgstn rows with regulator code OK and status APPROVED. The Oklahoma office address did not select them.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ok_notice_filed_distinct_crd)}</p><h3>SEC notice firms, FILED</h3><p>{sec.ok_notice_rows} Oklahoma NoticeFiled rows. A federal notice filing is not Oklahoma state IA registration. All filed rows in this extract have the source firm type Registered.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ok_state_era_active_distinct_crd)}</p><h3>Exempt reporting adviser firms, ACTIVE</h3><p>{state.ok_state_era_registration_rows} ERA/Rgltr rows with code OK and status ACTIVE. An ERA is not a state registered IA or an SEC registered adviser.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ok_principal_office_distinct_crd)}</p><h3>Oklahoma principal-office firms</h3><p>MainAddr state OK in the SEC compilation. This is office geography, not Oklahoma registration or notice filing.</p></article>
      </div>
      <p>Exact CRD overlap: {census.overlaps.state_ia_approved_and_notice_filed} firm CRD is in both the APPROVED state IA set and the FILED notice set. The firm keeps both source observations. This page did not create a second canonical firm.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>People, broker-dealers and orders</h2><p>Investment adviser representatives, broker-dealer firms and agents require their own person or firm CRD evidence. Oklahoma-only IAR, broker-dealer and agent rosters are <strong>NOT_ACQUIRED</strong>. A person is not a company. <a href="https://brokercheck.finra.org/">BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the named-record research paths.</p><p>An Oklahoma enforcement-order corpus was <strong>NOT_ACQUIRED</strong>. No order was attached to a firm or person by name. Exact canonical attachments: 0. Name-only adverse joins: 0. An examination was not acquired. An enforcement order is separate from a complaint, and a complaint is not a finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and coverage</h2><p><a href={state.url}>State IAPD compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>: source as of {state.sourceAsOf}, retained files examined {state.retainedFileExaminedAt}. The files have separate SHA-256 hashes: state {state.sha256}; SEC {sec.sha256}. No live license status is asserted.</p><p>Existing canonical firm matches were not re-read from production. New entities, evidence attachments and graph writes by this page: 0. Oklahoma Department of Securities bulk registrations beyond these IAPD jurisdiction fields, IAR, broker-dealer and agent rows, complete orders, provider examinations and complaint outcomes: NOT_ACQUIRED. Oklahoma City, Tulsa, Norman, Edmond, Lawton and Broken Arrow are geography only. No city or county pages or ratings are published.</p></div></section>
  </main>;
}
