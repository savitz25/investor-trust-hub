import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";

const description =
  "South Dakota securities regulator source map. State investment advisers, SEC notice filings, exempt reporting advisers, IAR persons, broker-dealers, agents, and enforcement records remain separate populations.";
const sources = [
  ["Division of Insurance - Securities Regulation", "https://dlr.sd.gov/securities"],
  ["Investment adviser licensing", "https://dlr.sd.gov/securities/investment_adviser_licensing.aspx"],
  ["Broker-dealer, agent, adviser, and franchise forms", "https://dlr.sd.gov/securities/forms.aspx"],
  ["Enforcement and investor complaints", "https://dlr.sd.gov/securities/complaints.aspx"],
  ["SEC Investment Adviser Public Disclosure (IAPD)", "https://adviserinfo.sec.gov/"],
  ["FINRA BrokerCheck", "https://brokercheck.finra.org/"],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: "South Dakota Investment Adviser and Securities Evidence",
    description,
    path: "/south-dakota",
    host: await readRequestHost(),
  });
}

export default function SouthDakotaInvestorPage() {
  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="sd-title">
        <div className="th-shell">
          <p className="ith-eyebrow">South Dakota Division of Insurance · Securities Regulation</p>
          <h1 id="sd-title">South Dakota securities registration evidence</h1>
          <p>{description}</p>
          <p>
            Official regulator pages checked October 14, 2026. A current dated South Dakota
            jurisdiction roster was not acquired in this pass: <strong>NOT_ACQUIRED</strong>. This
            does not mean zero registrants.
          </p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="sd-populations">
        <div className="th-shell">
          <h2 id="sd-populations">Regulatory populations stay separate</h2>
          <ul>
            <li>
              <strong>South Dakota state investment adviser firms:</strong> state registration on
              IARD under SDCL 47-31B-406. Registrations expire December 31 unless renewed. Current
              jurisdiction rows NOT_ACQUIRED.
            </li>
            <li>
              <strong>Federal covered advisers and notice filings:</strong> ARSD 20:08:07 is a
              notice-filing class, distinct from state adviser registration.
            </li>
            <li>
              <strong>Exempt reporting advisers:</strong> a separately reported category, not
              presumed state-registered investment advisers.
            </li>
            <li>
              <strong>Investment adviser representatives:</strong> individual persons, distinct from
              firms. Current person rows NOT_ACQUIRED.
            </li>
            <li>
              <strong>Broker-dealers and agents:</strong> ARSD 20:08:03. Firms and agents are
              separate populations.
            </li>
            <li>
              <strong>Franchise and business-opportunity filings:</strong> SDCL chapters 37-5B and
              37-25A. They are not investment-adviser or broker-dealer records.
            </li>
            <li>
              <strong>Orders and complaints:</strong> the Division’s enforcement program is a
              separate clock. No name-only adverse joins.
            </li>
          </ul>
          <p>
            Use regulatory jurisdiction and filing status. Principal-office geography alone does not
            establish South Dakota registration.
          </p>
        </div>
      </section>
      <section className="ith-intel-section" aria-labelledby="sd-sources">
        <div className="th-shell">
          <h2 id="sd-sources">Official sources and clocks</h2>
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
            Division pages and IAPD/BrokerCheck are lookup paths checked October 14, 2026. No dated
            South Dakota jurisdiction extract was acquired. State advisers, federal notice filings,
            ERA, IAR persons, broker-dealers, agents, franchise filings, and orders stay distinct.
          </p>
        </div>
      </section>
    </div>
  );
}
