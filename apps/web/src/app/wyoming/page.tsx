import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";

const description =
  "Wyoming securities regulator source map. State investment advisers, SEC notice filings, exempt reporting advisers, IAR persons, broker-dealers, agents, and enforcement records remain separate populations.";
const sources = [
  ["Wyoming Secretary of State Compliance Division", "https://sos.wyo.gov/Investing/"],
  ["Investment advisers and representatives", "https://sos.wyo.gov/Investing/InvestmentAdvisers.aspx"],
  ["Broker-dealers and agents", "https://sos.wyo.gov/Investing/BrokerDealerAgent.aspx"],
  ["SEC Investment Adviser Public Disclosure (IAPD)", "https://adviserinfo.sec.gov/"],
  ["FINRA BrokerCheck", "https://brokercheck.finra.org/"],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: "Wyoming Investment Adviser and Securities Evidence",
    description,
    path: "/wyoming",
    host: await readRequestHost(),
  });
}

export default function WyomingInvestorPage() {
  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="wy-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Wyoming Secretary of State · Compliance Division</p>
          <h1 id="wy-title">Wyoming securities registration evidence</h1>
          <p>{description}</p>
          <p>
            Official regulator and lookup sources checked October 14, 2026. A current dated
            Wyoming-jurisdiction roster was not acquired in this pass: <strong>NOT_ACQUIRED</strong>.
            This does not mean zero registrants.
          </p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="wy-populations">
        <div className="th-shell">
          <h2 id="wy-populations">Regulatory populations stay separate</h2>
          <ul>
            <li><strong>Wyoming state investment adviser firms:</strong> state registration cohort; current jurisdiction-based rows NOT_ACQUIRED.</li>
            <li><strong>Federal covered advisers and notice filings:</strong> distinct SEC registration and state notice status.</li>
            <li><strong>Exempt reporting advisers:</strong> separately reported category, not presumed state-registered investment advisers.</li>
            <li><strong>Investment adviser representatives:</strong> individual persons, distinct from firms.</li>
            <li><strong>Broker-dealers:</strong> firms; agents are persons and remain separate.</li>
            <li><strong>Orders and enforcement:</strong> dated proceedings, classified by regulator program; no name-only adverse joins.</li>
          </ul>
          <p>Use regulatory jurisdiction and filing status. Principal-office geography alone does not establish Wyoming registration.</p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="wy-sources">
        <div className="th-shell">
          <h2 id="wy-sources">Official sources and clocks</h2>
          <ul>
            {sources.map(([label, href]) => (
              <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>
            ))}
          </ul>
          <p>
            Wyoming SOS and IAPD/CRD-related sources are live lookup paths checked October 14,
            2026; no dated Wyoming-jurisdiction roster extract was acquired. State advisers, federal
            notice filings, ERA, IAR persons, broker-dealers, agents, and orders are distinct
            populations.
          </p>
        </div>
      </section>
    </div>
  );
}
