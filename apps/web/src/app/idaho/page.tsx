import census from "../../../../../data/idaho/id-inv-001/iapd-id-census.json";
import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";
import "../new-jersey/new-jersey-intel.css";

const fmt = (n: number) => n.toLocaleString("en-US");
const state = census.state;
const sec = census.sec;

export async function generateMetadata() {
  return pageMetadata({
    title: "Idaho Investment Adviser and Securities Research",
    description:
      "Idaho Department of Finance Securities Bureau and IAPD jurisdiction evidence. State IA, SEC notice filings, ERAs, and principal-office geography stay separate.",
    path: "/idaho",
    host: await readRequestHost(),
  });
}

export default function IdahoInvestorPage() {
  return (
    <main className="ith-intel">
      <section className="ith-intel-section">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Idaho</p>
          <h1>Idaho investment adviser and securities research</h1>
          <p className="ith-lede">
            The Idaho Department of Finance, Securities Bureau registers
            investment advisers and oversees related securities filings. IAPD
            regulator-jurisdiction counts below use regulator code ID. An Idaho
            principal office does not establish Idaho registration. This page
            does not rank advisers and does not publish one combined Idaho
            adviser total.
          </p>
          <div className="ith-actions">
            <a className="th-btn-primary th-btn-hero" href="https://adviserinfo.sec.gov/">
              Research a firm on IAPD
            </a>
            <a className="th-btn-secondary th-btn-hero" href="https://www.finance.idaho.gov/securities-bureau/">
              Idaho Securities Bureau
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Separate IAPD firm filing classes</h2>
          <p>
            Compilation feeds dated {state.sourceAsOf}, examined{" "}
            {state.retainedFileExaminedAt}. Counts are distinct firm CRDs inside
            each class. Classes are not added.
          </p>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(state.id_state_ia_approved_distinct_crd)}</p>
              <h3>Idaho state-registered IA firms</h3>
              <p>
                StateRgstn regulator code ID and status APPROVED. The same feed
                also has {state.id_state_ia_termrequest_distinct_crd} TERMREQUEST
                firm CRD. That request is not added to the approved count.
                Registration rows and distinct CRDs are both{" "}
                {state.id_state_ia_distinct_crd}.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(sec.id_notice_filed_distinct_crd)}</p>
              <h3>Federal covered adviser notice filings</h3>
              <p>
                SEC NoticeFiled regulator code ID and status FILED. Every filed
                notice in this slice is a Registered firm. ERA notices are{" "}
                {sec.id_notice_era}. A notice is not Idaho state IA registration.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{fmt(state.id_state_era_active_distinct_crd)}</p>
              <h3>Exempt reporting advisers</h3>
              <p>
                ERA regulator code ID and status ACTIVE. An ERA is not a
                state-registered IA and is not an SEC notice filing.
              </p>
            </article>
          </div>
          <p>
            Exact CRD overlap of APPROVED state IA and FILED notice:{" "}
            {census.overlaps.state_ia_approved_and_notice_filed}. Any-status
            state IA and FILED notice overlap:{" "}
            {census.overlaps.state_ia_and_notice_filed}, and that one firm is the
            TERMREQUEST record, kept in both classes and not subtracted. State
            IA and ERA overlap: {census.overlaps.state_ia_and_state_era}. ERA and
            notice overlap: {census.overlaps.state_era_and_notice_filed}.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Principal office is geography</h2>
          <p>
            The SEC feed lists {sec.id_principal_office_distinct_crd} firm CRDs
            with a principal office in Idaho. {sec.principal_and_notice_filed} of
            those also have a FILED Idaho notice, and{" "}
            {sec.principal_not_notice_filed} do not. Inside the state feed,{" "}
            {state.principal_office_id_among_state_ia} of the{" "}
            {state.id_state_ia_distinct_crd} state IA CRDs have an Idaho office
            and {state.principal_office_not_id_among_state_ia} do not. The
            state-IA set and the SEC principal-office set overlap by{" "}
            {census.overlaps.state_ia_and_principal_office}. One additional SEC
            firm has an Idaho address and no Idaho IA or ERA row. That firm is
            not added to the {state.id_state_ia_approved_distinct_crd} approved
            state IA firms.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Persons, broker-dealers, and orders</h2>
          <p>
            Investment adviser representatives, broker-dealers, and securities
            salespersons were <strong>{census.notAcquired.iarPersons}</strong> as
            separate person and firm rosters. Examinations were{" "}
            <strong>{census.notAcquired.examinations}</strong>. Enforcement
            orders were <strong>{census.notAcquired.orders}</strong>. No order
            was joined by name. Graph writes: {census.graphWrites}. Net-new
            canonical firms: {census.newCanonicalFirms}.
          </p>
          <p>
            Boise is geography only. This page publishes no city route.{" "}
            <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and{" "}
            <a href="https://adviserinfo.sec.gov/">IAPD</a> remain the
            named-record research paths.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Sources and clocks</h2>
          <p>
            <a href={state.url}>{state.filename}</a>, {fmt(state.bytes)} bytes,
            SHA-256 {state.sha256}. <a href={sec.url}>{sec.filename}</a>,{" "}
            {fmt(sec.bytes)} bytes, SHA-256 {sec.sha256}. Both feeds are dated{" "}
            {state.sourceAsOf}. The feed date is the population clock.
          </p>
        </div>
      </section>
    </main>
  );
}
