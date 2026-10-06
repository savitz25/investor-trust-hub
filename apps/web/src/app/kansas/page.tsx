import census from "../../../../../data/kansas/ks-inv-001/iapd-ks-census.json";
import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";
import "../new-jersey/new-jersey-intel.css";

const fmt = (n: number) => n.toLocaleString("en-US");
const state = census.state;
const sec = census.sec;
const iar = census.iar;

export async function generateMetadata() {
  return pageMetadata({
    title: "Kansas Investment Adviser and Securities Research",
    description:
      "Kansas Securities Commissioner and IAPD jurisdiction evidence, with state IA, SEC notice filings, ERAs, and IAR persons kept separate.",
    path: "/kansas",
    host: await readRequestHost(),
  });
}

export default function KansasInvestorPage() {
  return (
    <main className="ith-intel">
      <section className="ith-intel-section">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Kansas</p>
          <h1>Kansas investment adviser and securities research</h1>
          <p className="ith-lede">
            The Office of the Kansas Securities Commissioner, within the Kansas
            Department of Insurance, administers the Kansas Uniform Securities
            Act. IAPD regulator-jurisdiction filings are separated below. Kansas
            principal-office geography does not establish Kansas registration. A
            filing is not an endorsement or recommendation.
          </p>
          <div className="ith-actions">
            <a
              className="th-btn-primary th-btn-hero"
              href="https://adviserinfo.sec.gov/"
            >
              Research a firm on IAPD
            </a>
            <a
              className="th-btn-secondary th-btn-hero"
              href="https://www.insurance.kansas.gov/securities/"
            >
              Kansas Securities Commissioner
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Separate IAPD firm filing classes</h2>
          <p>
            Current IAPD compilation feeds dated {state.sourceAsOf} were
            filtered by regulator jurisdiction and source filing status. Counts
            are distinct firm CRDs within each class. Overlapping classes remain
            separate observations; they are not added into one Kansas adviser
            number.
          </p>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(state.ks_state_ia_approved_distinct_crd)}
              </p>
              <h3>Kansas state-registered IA firms</h3>
              <p>
                StateRgstn with regulator code KS and source status APPROVED.
                This is jurisdiction evidence, not an address filter.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(sec.ks_notice_filed_distinct_crd)}
              </p>
              <h3>Federal covered adviser notice filings</h3>
              <p>
                SEC NoticeFiled/States with regulator code KS and status FILED.
                A federal notice filing is separate from Kansas state IA
                registration.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(state.ks_state_era_active_distinct_crd)}
              </p>
              <h3>Exempt reporting advisers</h3>
              <p>
                ERA regulator code KS and source status ACTIVE. An ERA is not a
                state-registered IA or an SEC-registered adviser.
              </p>
            </article>
          </div>
          <p>
            Exact firm-CRD overlap between APPROVED state IA and FILED notice
            classes: {census.overlaps.approved_state_ia_and_sec_notice_filed}.
            State IA/ERA overlap:{" "}
            {census.overlaps.approved_state_ia_and_active_era}. ERA/notice
            overlap: {census.overlaps.active_era_and_sec_notice_filed}. Shared
            firms keep both source classifications; they are not duplicated as
            canonical firms.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>IAR person registrations</h2>
          <p>
            The separate IAPD Individual feed has{" "}
            {fmt(iar.registration_observations)} approved person registration
            observations under regulator code KS and registration category RA,
            representing {fmt(iar.distinct_iar_person_ids)} distinct IAR person
            IDs. Those records link to{" "}
            {fmt(iar.distinct_current_employer_firm_crds)} distinct
            current-employer firm CRDs in the person feed. A person or person
            registration is not a firm license, and these counts are not added
            to firm populations. Individual names and IDs are not published.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Proceedings index and other securities classes</h2>
          <p>
            The Kansas Securities Commissioner’s FY2023 and FY2024{" "}
            <a href={census.proceedingsIndex.url}>
              Securities Legal Proceedings index
            </a>{" "}
            displays{" "}
            {fmt(census.proceedingsIndex.listed_proceeding_observations)} docket
            observations; 8 index entries print CRD references across 5 distinct
            CRDs. This is an index-only observation, not a disposition or
            finding. The proceedings and printed CRDs are not attached to
            canonical firms or people here. Case documents, examination
            evidence, broker-dealer firms, and agents:{" "}
            <strong>NOT_ACQUIRED</strong>. No adverse record was joined by name.
          </p>
          <p>
            <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a> and{" "}
            <a href="https://adviserinfo.sec.gov/">IAPD</a> are the named-record
            research paths. HMDA is market activity and is not securities
            licensing.
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Sources, clocks, and reconciliation</h2>
          <p>
            <a href={state.url}>IAPD state firm compilation</a> (
            {state.feedName}) and{" "}
            <a href={sec.url}>IAPD SEC firm compilation</a> ({sec.feedName}),
            both dated {state.sourceAsOf}. SHA-256: state {state.sha256}; SEC{" "}
            {sec.sha256}. The <a href={iar.url}>IAPD individual compilation</a>{" "}
            ({iar.feedName}) has SHA-256 {iar.sha256}. Retained files were
            examined {state.retainedFileExaminedAt}. No current license status
            beyond the feed status fields is implied.
          </p>
          <p>
            Existing canonical firm matches and entity-level net-new counts were
            not re-read from production. This publication creates no firms,
            evidence attachments, or graph writes. Office geography is not used
            to infer jurisdiction. No city routes or ratings are published.
          </p>
        </div>
      </section>
    </main>
  );
}
