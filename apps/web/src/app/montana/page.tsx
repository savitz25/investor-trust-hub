import Link from "next/link";
import { MT_INVESTOR_INTEL as intel } from "@ith/domain/mt-public-intel";
import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";
import "../new-jersey/new-jersey-intel.css";

const fmt = (n: number) => n.toLocaleString("en-US");

export async function generateMetadata() {
  return pageMetadata({
    title: "Montana Investment Adviser & Securities Intelligence",
    description:
      "Montana CSI and IAPD jurisdiction evidence for state advisers, federal notice filings, ERAs, IAR persons, and broker-dealer summary data. Separate source grains; no rating.",
    path: "/montana",
    host: await readRequestHost(),
  });
}

export default function MontanaInvestorPage() {
  return (
    <main className="ith-intel">
      <section className="ith-intel-section">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Montana</p>
          <h1>Montana Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Montana Commissioner of Securities and Insurance administers
            state investment-adviser and representative registration and federal
            notice filings through IARD. The adviser, notice-filing, exempt
            reporting adviser, individual representative, broker-dealer, agent,
            and enforcement populations have different grains. Registration
            status is not an endorsement or a trust rating.
          </p>
          <div className="ith-actions">
            <a
              className="th-btn-primary th-btn-hero"
              href={intel.regulator.adviser}
            >
              Montana adviser and IAR requirements
            </a>
            <a
              className="th-btn-secondary th-btn-hero"
              href={intel.regulator.iapd}
            >
              Research on IAPD
            </a>
          </div>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Current IAPD jurisdiction counts</h2>
          <p>
            Counts below use Montana regulator jurisdiction fields in official
            IAPD compilation feeds dated {intel.sourceDate}, retrieved{" "}
            {intel.retrievedAt}. They do not use principal-office location. A
            firm CRD is separate from a person CRD, and credential populations
            are not added together.
          </p>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(intel.stateIa.approvedFirmCrd)}
              </p>
              <h3>State IA firms, APPROVED</h3>
              <p>
                Montana StateRgstn/Rgltr jurisdiction MT:{" "}
                {fmt(intel.stateIa.rows)} registration rows for{" "}
                {fmt(intel.stateIa.distinctFirmCrd)} distinct firm CRDs. Status
                rows include {intel.stateIa.termRequestRows} TERMREQUEST; the
                published APPROVED count excludes it.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(intel.notice.distinctFiledFirmCrd)}
              </p>
              <h3>Federal notice filings, FILED</h3>
              <p>
                NoticeFiled jurisdiction MT, status FILED:{" "}
                {fmt(intel.notice.rows)} rows and distinct firm CRDs. A notice
                filing is not Montana state IA registration.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(intel.era.activeFirmCrd)}
              </p>
              <h3>State ERA firms, ACTIVE</h3>
              <p>
                Montana ERA/Rgltr jurisdiction MT: {fmt(intel.era.rows)} rows
                and distinct firm CRDs, all status ACTIVE. An ERA is a separate
                reporting category.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(intel.iar.distinctApprovedPersonCrd)}
              </p>
              <h3>IAR persons, APPROVED</h3>
              <p>
                Individual-feed current-registration jurisdiction MT:{" "}
                {fmt(intel.iar.registrationRows)} rows and{" "}
                {fmt(intel.iar.distinctApprovedPersonCrd)} distinct person CRDs.
                Person records are not firms and are not added to firm counts.
              </p>
            </article>
          </div>
          <p>
            Exact firm-CRD intersections in the same October 14 feeds: APPROVED
            state IA ∩ FILED notice{" "}
            {intel.intersections.approvedIaAndFiledNotice}; ACTIVE ERA ∩ FILED
            notice {intel.intersections.activeEraAndFiledNotice}; APPROVED state
            IA ∩ ACTIVE ERA {intel.intersections.approvedIaAndActiveEra}.
            Intersections describe shared CRDs across distinct regulatory
            classifications, not extra entities.
          </p>
          <p>
            <a href={intel.feeds.state.url}>IAPD state feed</a> ·{" "}
            <a href={intel.feeds.sec.url}>IAPD SEC feed</a> ·{" "}
            <a href={intel.feeds.iar.url}>IAPD individual feed</a>. SHA-256
            values are retained with the Montana source recount artifact.
          </p>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Broker-dealers, agents, and securities actions</h2>
          <p>
            The Montana CSI securities summary reports{" "}
            <strong>
              {fmt(intel.brokerDealerSummary.firms)} broker-dealer firms
              licensed
            </strong>{" "}
            as of {intel.brokerDealerSummary.asOf}. This is a dated summary
            metric, not a row-level roster or a current recount. Montana
            broker-dealer firm roster rows and broker-dealer agent rows are{" "}
            <strong>{intel.limits.brokerDealerRows}</strong>. They remain
            separate from IAPD adviser firm and IAR person counts. FINRA{" "}
            <a href={intel.regulator.brokerCheck}>BrokerCheck</a> provides a
            public research path.
          </p>
          <p>
            Montana securities orders and enforcement rows are{" "}
            <strong>{intel.limits.orders}</strong> in this publication. No
            respondent was joined by name alone. A missing action extract is not
            evidence that no orders exist.
          </p>
          <p>
            Existing canonical firm-spine matches are{" "}
            <strong>{intel.limits.existingCanonicalMatches}</strong>; the feed
            CRDs have not been reconciled against that spine. No canonical
            entities were inserted from this recount, so net-new entity writes
            are none.
          </p>
        </div>
      </section>
      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Montana sources and limits</h2>
          <p>
            The{" "}
            <a href={intel.regulator.securities}>
              Montana CSI securities program
            </a>{" "}
            and <a href={intel.regulator.fees}>registration-fee guidance</a>{" "}
            describe state registration and notice filing routes. IARD is the
            filing system; it is not the state regulator. Montana jurisdiction
            counts above come from registration and notice fields, not office
            geography.
          </p>
          <p>
            Feed SHA-256: state {intel.feeds.state.sha256}; SEC{" "}
            {intel.feeds.sec.sha256}; individual {intel.feeds.iar.sha256}.
            Broker-dealer row-level population, agent population, and action
            corpus remain NOT_ACQUIRED. This statewide page does not rank firms
            or assign a Trust Score.
          </p>
          <p>
            <Link href="/ask?q=Montana%20investment%20adviser%20registration">
              Ask about Montana evidence
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
