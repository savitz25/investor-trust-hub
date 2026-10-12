import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';

const description =
  'Maine Office of Securities licensing and registration source map. State investment advisers, federal covered advisers, investment adviser representatives, broker-dealers, agents, branch offices, and enforcement records remain separate populations. No combined count or score.';

const sources = [
  [
    'Maine Office of Securities: Licensing & Registration',
    'https://www.maine.gov/pfr/securities/licensing/',
  ],
  ['Maine Office of Securities: Check a License', 'https://www.maine.gov/pfr/securities/license_info.htm'],
  [
    'Investment adviser licensing instructions',
    'https://www.maine.gov/pfr/securities/licensing/index.htm',
  ],
  [
    'Broker-dealer and agent licensing instructions',
    'https://www.maine.gov/pfr/securities/licensing/broker_dealer_instructions.htm',
  ],
  ['Branch office licensing', 'https://www.maine.gov/pfr/securities/licensing/branchoffice.htm'],
  ['Enforcement actions and consent agreements', 'https://www.maine.gov/pfr/securities/enforcement.shtml'],
  ['Administrative orders by date', 'https://www.maine.gov/pfr/securities/adminorders/date_list.shtml'],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: 'Maine Investment Adviser & Securities Evidence',
    description,
    path: '/maine',
    host: await readRequestHost(),
  });
}

export default function MainePage() {
  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="maine-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Maine Office of Securities</p>
          <h1 id="maine-title">Maine securities registration evidence</h1>
          <p>{description}</p>
          <p>
            Official source map checked October 12, 2026. Current dated IARD/CRD snapshots and
            reconciled source rows have not been acquired for publication in this pass:{' '}
            <strong>NOT_ACQUIRED</strong>. That status is not zero and does not imply no registrants.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="maine-populations">
        <div className="th-shell">
          <h2 id="maine-populations">Regulatory populations stay separate</h2>
          <ul>
            <li><strong>Maine state investment adviser:</strong> state firm license population.</li>
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
            <li>
              <strong>Agent:</strong> person population filed through CRD, distinct from
              broker-dealer firms.
            </li>
            <li><strong>Branch office:</strong> office filing, not a firm or person.</li>
            <li>
              <strong>Orders and enforcement:</strong> distinct dated proceedings; an order or
              consent agreement is not joined by name alone to a licensee.
            </li>
          </ul>
          <p>
            Maine says BD and agent applications are filed through CRD; adviser applications use
            Form ADV/IARD. Principal-office geography alone does not establish Maine jurisdiction.
            No combined total or rating is published.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="maine-sources">
        <div className="th-shell">
          <h2 id="maine-sources">Regulator and verification sources</h2>
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
            and <a href="https://brokercheck.finra.org/">FINRA BrokerCheck</a>. These federal
            systems are not substitutes for a dated Maine state registration snapshot.
          </p>
        </div>
      </section>
    </div>
  );
}
