import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";

const description =
  "Vermont securities regulator source map. State investment advisers, SEC notice filings, exempt reporting advisers, IAR persons, broker-dealers, agents, and enforcement records remain separate populations.";
const sources = [
  ["Vermont DFR Securities Division", "https://dfr.vermont.gov/securities"],
  [
    "Vermont investment adviser registration",
    "https://dfr.vermont.gov/securities/investment-advisers",
  ],
  [
    "Vermont broker-dealer agents and investment adviser representatives",
    "https://dfr.vermont.gov/securities/agents-and-advisers",
  ],
  [
    "Vermont securities branch-office registration",
    "https://dfr.vermont.gov/securities/branch-offices",
  ],
  [
    "DFR license verification",
    "https://dfr.vermont.gov/consumers/verify-license",
  ],
  [
    "SEC Investment Adviser Public Disclosure (IAPD)",
    "https://adviserinfo.sec.gov/",
  ],
  ["FINRA BrokerCheck", "https://brokercheck.finra.org/"],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: "Vermont Investment Adviser and Securities Evidence",
    description,
    path: "/vermont",
    host: await readRequestHost(),
  });
}

export default function VermontInvestorPage() {
  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="vt-title">
        <div className="th-shell">
          <p className="ith-eyebrow">
            Vermont Department of Financial Regulation
          </p>
          <h1 id="vt-title">Vermont securities registration evidence</h1>
          <p>{description}</p>
          <p>
            Official regulator and lookup sources checked October 14, 2026. A
            current dated Vermont-jurisdiction roster was not acquired in this
            pass: <strong>NOT_ACQUIRED</strong>. This does not mean zero
            registrants.
          </p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="vt-populations">
        <div className="th-shell">
          <h2 id="vt-populations">Regulatory populations stay separate</h2>
          <ul>
            <li>
              <strong>Vermont state investment adviser firms:</strong> state
              registration cohort; dated jurisdiction-based rows NOT_ACQUIRED.
            </li>
            <li>
              <strong>Federal covered advisers and notice filings:</strong>{" "}
              distinct SEC registration and state notice status.
            </li>
            <li>
              <strong>Exempt reporting advisers:</strong> separately reported
              category.
            </li>
            <li>
              <strong>Investment adviser representatives:</strong> individual
              persons, distinct from firms.
            </li>
            <li>
              <strong>Broker-dealers:</strong> firms; agents are persons and
              remain separate.
            </li>
            <li>
              <strong>Orders and enforcement:</strong> dated proceedings,
              classified by regulator program; no name-only adverse joins.
            </li>
          </ul>
          <p>
            Use regulatory jurisdiction and filing status. Principal-office
            geography alone does not establish Vermont registration.
          </p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="vt-sources">
        <div className="th-shell">
          <h2 id="vt-sources">Official sources and clocks</h2>
          <ul>
            {sources.map(([label, href]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            DFR and IAPD/CRD pages are live lookup sources checked October 14,
            2026; no dated bulk Vermont-jurisdiction extract was acquired.
            Federal notice filings, state adviser registrations, IAR persons,
            broker-dealers, and agents are distinct populations.
          </p>
        </div>
      </section>
    </div>
  );
}
