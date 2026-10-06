import census from '../../../../../data/west-virginia/wv-inv-001/iapd-wv-census.json';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateMetadata() {
  return pageMetadata({
    title: 'West Virginia Investment Adviser and Securities Research',
    description:
      'West Virginia State Auditor Securities Commission and IAPD evidence. State IA firms, federal notice filings, exempt reporting advisers, people, broker-dealers, and office geography stay separate.',
    path: '/west-virginia',
    host: await readRequestHost(),
  });
}

export default function WestVirginiaInvestorPage() {
  const state = census.state;
  const sec = census.sec;
  return (
    <main className="ith-intel">
      <section className="ith-intel-section">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · West Virginia</p>
          <h1>West Virginia investment adviser and securities research</h1>
          <p className="ith-lede">
            The West Virginia State Auditor is the Securities Commissioner. The IAPD compilation separates state registration, federal notice filings, and exempt reporting advisers by regulator code WV. A filing is not an endorsement. Charleston, Morgantown, and Huntington are not published as local pages.
          </p>
          <div className="ith-actions">
            <a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">Research a firm on IAPD</a>
            <a className="th-btn-secondary th-btn-hero" href="https://www.wvsao.gov/securities/">West Virginia Securities Commission</a>
          </div>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>IAPD firm populations as of {state.sourceAsOf}</h2>
          <p>
            These distinct firm CRDs come from the September 17, 2026 state and SEC IAPD compilation feeds. Regulator code WV selected the populations. A West Virginia street address was not used. These groups are not added into one adviser total.
          </p>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(state.wv_state_ia_distinct_crd)}</p>
              <h3>West Virginia state IA firm CRDs</h3>
              <p>{fmt(state.wv_state_ia_approved_distinct_crd)} report APPROVED and {fmt(state.wv_state_ia_condrest_distinct_crd)} reports CONDREST. TERMREQUEST is {fmt(state.wv_state_ia_termrequest_distinct_crd)}. Rows equal distinct CRDs. This is regulator code WV, not a West Virginia-address overlay.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(sec.wv_notice_filed_distinct_crd)}</p>
              <h3>Federal adviser West Virginia notice filings</h3>
              <p>SEC compilation rows report {sec.notice_status} under NoticeFiled/States regulator code WV. Source firm type is {sec.wv_notice_filed_firm_type}. A notice filing is not West Virginia state IA registration.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(state.wv_state_era_active_distinct_crd)}</p>
              <h3>West Virginia ERA firms</h3>
              <p>The state compilation returned {fmt(state.wv_state_era_registration_rows)} ERA jurisdiction rows for regulator code WV. That zero is the filter result. An exempt reporting adviser is not a state-registered IA and not an SEC-registered adviser.</p>
            </article>
          </div>
          <p>
            Exact firm-CRD overlap of APPROVED state IA and FILED notice is {census.overlaps.state_ia_approved_and_notice_filed}. State IA and ERA overlap is {census.overlaps.state_ia_and_state_era}. ERA and notice overlap is {census.overlaps.state_era_and_notice_filed}. Overlap is not a reason to add the populations.
          </p>
          <p>
            Office geography is separate. The SEC compilation lists {fmt(sec.wv_principal_office_distinct_crd)} firm CRDs with MainAddr state WV. All {fmt(sec.principal_and_notice_filed)} of those also have a FILED notice, and {fmt(sec.principal_not_notice_filed)} principal-office CRDs lack that notice. The state compilation, among the {fmt(state.wv_state_ia_distinct_crd)} state IA CRDs, lists {fmt(state.principal_office_wv_among_state_ia)} with a West Virginia principal office and {fmt(state.principal_office_not_wv_among_state_ia)} with some other principal office. Those office counts are a split of the state IA rows. They are not added to the notice filings. The state feed also found {state.address_wv_without_wv_jurisdiction} firms with a West Virginia principal office and no West Virginia state-IA or ERA jurisdiction row. That diagnostic zero is a count of that filter, not a claim that no other West Virginia adviser exists.
          </p>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Populations that were not acquired</h2>
          <p>
            Investment adviser representatives were <strong>{census.notAcquired.iarPersons}</strong>. A person is not a firm. Broker-dealer firms were <strong>{census.notAcquired.brokerDealerRoster}</strong>. Agents were <strong>{census.notAcquired.agentRoster}</strong>. Examinations were <strong>{census.notAcquired.examinations}</strong>. The securities order corpus was <strong>{census.notAcquired.ordersCorpus}</strong>. No adverse record was joined by name. A complaint is not a finding.
          </p>
          <p>
            A State Auditor annual-report registration stock was <strong>{census.notAcquired.auditorAnnualReportStock}</strong>. That clock is not these IAPD feeds. Missing is not zero.
          </p>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Sources and clocks</h2>
          <p>
            <a href={state.url}>IAPD state compilation</a> and <a href={sec.url}>SEC IAPD compilation</a>, both source dated {state.sourceAsOf}; retained files examined {state.retainedFileExaminedAt}. State feed SHA-256 {state.sha256}. SEC feed SHA-256 {sec.sha256}. No firm names are published from those feeds. Graph writes: {census.graphWrites}.
          </p>
          <p>
            <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the named-record lookups. This page does not rank advisers.
          </p>
        </div>
      </section>
    </main>
  );
}
