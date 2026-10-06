import census from '../../../../../data/nebraska/ne-inv-001/iapd-ne-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'Nebraska Investment Adviser and Securities Research',
    description: 'Nebraska Department of Banking and Finance Securities Bureau and IAPD evidence. State IA, federal notice filings, exempt reporting advisers, people, broker-dealers, and office geography stay separate.',
    path: '/nebraska',
    host: await readRequestHost(),
  });
}

export default function NebraskaInvestorPage() {
  const state = census.state;
  const sec = census.sec;
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Nebraska</p>
      <h1>Nebraska investment adviser and securities research</h1>
      <p className="ith-lede">The Nebraska Department of Banking and Finance Securities Bureau regulates securities activity under Nebraska law. The IAPD compilation separates state registration, federal notice filings, and exempt reporting advisers by regulator jurisdiction. A filing is not an endorsement. Omaha and Lincoln are not published as local pages.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a><a className="th-btn-secondary th-btn-hero" href="https://ndbf.nebraska.gov/">Nebraska Department of Banking and Finance</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>IAPD firm populations as of 2026-09-17</h2>
      <p>These distinct firm CRDs come from the September 17, 2026 state and SEC IAPD compilation feeds. Regulator code NE selected the populations. A Nebraska street address was not used. These groups must not be added into one adviser total.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ne_state_ia_distinct_crd)}</p><h3>Nebraska state IA firm CRDs</h3><p>{fmt(state.ne_state_ia_approved_distinct_crd)} report APPROVED, 1 reports CONDREST, and 1 reports TERMREQUEST. Rows equal distinct CRDs. This is regulator code NE, not a Nebraska-address overlay.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(sec.ne_notice_filed_distinct_crd)}</p><h3>Federal adviser Nebraska notice filings</h3><p>SEC compilation rows report FILED under NoticeFiled/States regulator code NE. Source firm type is Registered. A notice filing is not Nebraska state IA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{fmt(state.ne_state_era_active_distinct_crd)}</p><h3>Nebraska ERA firms</h3><p>ERA regulator code NE rows report ACTIVE. An exempt reporting adviser is not a state-registered IA and not an SEC-registered adviser.</p></article>
      </div>
      <p>Exact firm-CRD overlap of APPROVED state IA and FILED notice is {census.overlaps.state_ia_approved_and_notice_filed}. State IA and ERA overlap is {census.overlaps.state_ia_and_state_era}. ERA and notice overlap is {census.overlaps.state_era_and_notice_filed}. Overlap is not a reason to add the populations.</p>
      <p>Office geography is separate. The SEC compilation lists {fmt(sec.ne_principal_office_distinct_crd)} firm CRDs with MainAddr state NE. The state compilation, among the {fmt(state.ne_state_ia_distinct_crd)} state IA CRDs, lists {fmt(state.principal_office_ne_among_state_ia)} with a Nebraska principal office and {fmt(state.principal_office_not_ne_among_state_ia)} with some other principal office. Those two office counts are different feeds and are not added. The state feed also found {state.address_ne_without_ne_jurisdiction} firms with a Nebraska principal office and no Nebraska state-IA or ERA jurisdiction row. That diagnostic zero is a count of that filter, not a claim that no other Nebraska adviser exists.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>June 30, 2024 annual-report clock</h2>
      <p>The <a href="https://ndbf.nebraska.gov/sites/default/files/reports/2024%20Annual%20Report_1.pdf">2024 Department of Banking and Finance annual report</a> prints a registered-stock table for 6/30/2024: broker-dealers 1,336; agents of broker-dealers 144,170; investment advisers 124; federal covered advisers 2,004; investment adviser representatives 4,891. That clock is not the September 17, 2026 IAPD compilation. The 124 investment advisers in the report are not asserted to be the same firms as the IAPD state-IA CRDs. The 2,004 federal covered advisers are not the 2,239 IAPD notice filings.</p>
      <p>A second table on the same page is labeled New Registrations for 6/30/2024: broker-dealers 64; agents of broker-dealers 33,285; investment advisers 28; federal covered advisers 258; investment adviser representatives 1,197. New registrations are not the registered stock.</p>
      <p>Person-level IAR and agent rosters were <strong>NOT_ACQUIRED</strong>. A person is not a firm. Broker-dealer firm rows were not acquired from IAPD. An enforcement and order corpus was <strong>NOT_ACQUIRED</strong>. No adverse record was joined by name. A complaint is not a finding.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Sources and clocks</h2>
      <p><a href={state.url}>IAPD state compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>, both source dated {state.sourceAsOf}; retained files examined {state.retainedFileExaminedAt}. State feed SHA-256 {state.sha256}. SEC feed SHA-256 {sec.sha256}. No firm names are published from those feeds. Graph writes: 0.</p>
      <p><a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the named-record lookups. This page does not rank advisers.</p>
    </div></section>
  </main>;
}
