import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';

const description =
  'New Hampshire Bureau of Securities Regulation registration source map. State investment advisers, federal notice filings, exempt reporting advisers, investment adviser representatives, broker-dealers, agents, branches, and enforcement records remain separate populations.';

const sources = [
  ['New Hampshire Bureau of Securities Regulation', 'https://www.sos.nh.gov/securities-regulation'],
  ['Firms and industry professionals', 'https://www.sos.nh.gov/securities-regulation/firms-and-industry-professionals'],
  ['State investment advisers and agents', 'https://www.sos.nh.gov/state-investment-advisers-and-agents'],
  ['Federal investment advisers and agents', 'https://www.sos.nh.gov/federal-investment-advisers-and-agents'],
  ['Bureau of Securities enforcement actions', 'https://www.sos.nh.gov/bureau-securities-enforcement-actions'],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: 'New Hampshire Investment Adviser & Securities Evidence',
    description,
    path: '/new-hampshire',
    host: await readRequestHost(),
  });
}

export default function NewHampshirePage() {
  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="nh-title">
        <div className="th-shell">
          <p className="ith-eyebrow">New Hampshire Bureau of Securities Regulation</p>
          <h1 id="nh-title">New Hampshire securities registration evidence</h1>
          <p>{description}</p>
          <p>
            Official source map checked October 12, 2026. Current dated IARD/CRD snapshots and
            reconciled New Hampshire jurisdiction rows have not been acquired for publication in
            this pass: <strong>NOT_ACQUIRED</strong>. That status is not zero and does not imply no
            registrants.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nh-populations">
        <div className="th-shell">
          <h2 id="nh-populations">Regulatory populations stay separate</h2>
          <ul>
            <li><strong>New Hampshire state investment adviser:</strong> state firm license population.</li>
            <li>
              <strong>Federal covered adviser / notice filing:</strong> distinct SEC registration
              and state notice jurisdiction; not a state-registered IA.
            </li>
            <li>
              <strong>Exempt reporting adviser (ERA):</strong> separate reporting status; not an
              SEC-registered investment adviser.
            </li>
            <li>
              <strong>Investment adviser representative (IAR):</strong> person population, distinct
              from adviser firms.
            </li>
            <li><strong>Broker-dealer:</strong> firm population, distinct from agents.</li>
            <li><strong>Agent:</strong> person population filed through CRD, distinct from firms.</li>
            <li><strong>Branch office:</strong> office filing, not a firm or person.</li>
            <li>
              <strong>Orders and enforcement:</strong> distinct dated proceedings; no adverse
              identity join by name alone.
            </li>
          </ul>
          <p>
            Registration is based on regulator jurisdiction and filing status. Principal-office
            geography alone does not establish New Hampshire registration. No combined total or
            rating is published.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nh-sources">
        <div className="th-shell">
          <h2 id="nh-sources">Regulator and verification sources</h2>
          <ul>
            {sources.map(([label, href]) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
          <p>
            For public identity research, use{' '}
            <a href="https://adviserinfo.sec.gov/">SEC Investment Adviser Public Disclosure (IAPD)</a>{' '}
            and <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a>. These systems are
            useful for identity verification but do not replace a dated New Hampshire registration
            snapshot.
          </p>
        </div>
      </section>
    </div>
  );
}
