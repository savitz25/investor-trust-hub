import census from '../../../../../data/new-mexico/nm-inv-001/iapd-nm-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'New Mexico Investment Adviser and Securities Research',
    description: 'New Mexico Regulation and Licensing Department, Securities Division and IAPD evidence, separating New Mexico state investment adviser registration, SEC notice filings, exempt reporting advisers, people, broker-dealers, and office geography.',
    path: '/new-mexico',
    host: await readRequestHost(),
  });
}

export default function NewMexicoInvestorPage() {
  const state = census.state;
  const sec = census.sec;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · New Mexico</p>
      <h1>New Mexico investment adviser and securities research</h1>
      <p className="ith-lede">The New Mexico Regulation and Licensing Department, Securities Division regulates securities activity under New Mexico law. The IAPD compilation separates state registration, federal notice filings, and exempt reporting advisers by regulator jurisdiction code NM. A source-reported filing is not an endorsement or a recommendation.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://www.rld.nm.gov/securities-division/">New Mexico Securities Division</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Separate IAPD firm populations</h2>
      <p>These distinct firm CRDs come from the September 17, 2026 state and SEC IAPD compilation feeds. Regulator jurisdiction fields selected the populations; New Mexico principal-office geography was not used. Credential groups overlap and must not be added into one New Mexico adviser total.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.nm_state_ia_approved_distinct_crd)}</p><h3>New Mexico state IA firms</h3><p>{fmt(state.nm_state_ia_registration_rows)} StateRgstn rows report APPROVED under regulator code NM. Rows equal distinct firm CRDs. This is jurisdiction code NM, not a New Mexico-address overlay.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.nm_notice_filed_distinct_crd)}</p><h3>Federal adviser New Mexico notice filings</h3><p>{fmt(sec.nm_notice_rows)} NoticeFiled rows report FILED under regulator code NM. Source firm type is Registered. ERA notice rows for NM: {fmt(sec.nm_notice_era_any_status)}. A notice filing is separate from New Mexico state IA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.nm_state_era_active_distinct_crd)}</p><h3>New Mexico ERA firms</h3><p>{fmt(state.nm_state_era_registration_rows)} ERA/Rgltr code NM rows report ACTIVE. An exempt reporting adviser is not a state registered IA or an SEC registered adviser.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.nm_principal_office_distinct_crd)}</p><h3>New Mexico principal-office firms</h3><p>MainAddr state NM in the SEC compilation. This is office geography only, not New Mexico registration or notice filing.</p></article>
      </div>
      <p>Exact firm CRD overlap: {fmt(census.overlaps.state_ia_approved_and_notice_filed)} firm CRDs are in both sets. Both observations stay. This page does not subtract that overlap from either count and does not create a second canonical firm. State IA and ERA sets have {fmt(census.overlaps.state_ia_and_state_era)} exact CRD overlap; ERA and notice sets have {fmt(census.overlaps.state_era_and_notice_filed)}.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Other New Mexico regulatory records</h2>
      <p>New Mexico IAR person rosters, broker-dealer firms, and agents are <strong>NOT_ACQUIRED</strong>. Examinations are <strong>NOT_ACQUIRED</strong>. Enforcement orders are <strong>NOT_ACQUIRED</strong>. A person is not a firm. <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> support named-record research. Name-only adverse joins: 0. Exact canonical attachments: 0. A complaint is not a violation finding.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Sources and clocks</h2>
      <p><a href={state.url}>IAPD state compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>, both source dated {state.sourceAsOf}; retained files examined {state.retainedFileExaminedAt}. State feed SHA-256: {state.sha256}. SEC feed SHA-256: {sec.sha256}. Registration evidence is IAPD jurisdiction code NM. This is compilation evidence, not a live license check.</p>
      <p>Existing canonical firm matches were not re-read from production. New entities: 0. Evidence attachments: 0. Graph writes: 0. Albuquerque, Santa Fe, Las Cruces, Rio Rancho, Roswell, and Farmington are geography only. No city or county pages, rankings, ratings, or adviser recommendations are published.</p>
    </div></section>
  </main>;
}
