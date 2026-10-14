import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';

const description = 'Alaska securities regulator source map. State investment advisers, SEC notice filings, exempt reporting advisers, IAR persons, broker-dealers, agents, and enforcement records remain separate populations.';
const sources = [
  ['Alaska Division of Banking and Securities: securities', 'https://www.commerce.alaska.gov/web/dbs/Securities'],
  ['State investment adviser compliance and IARD/IAPD', 'https://www.commerce.alaska.gov/web/dbs/Securities/ComplianceforStateInvestmentAdvisers.aspx'],
  ['Alaska de minimis rules and jurisdiction', 'https://www.commerce.alaska.gov/web/dbs/Securities/DeMinimisRules.aspx'],
  ['Division enforcement orders', 'https://www.commerce.alaska.gov/web/dbs/EnforcementOrders'],
  ['SEC Investment Adviser Public Disclosure (IAPD)', 'https://adviserinfo.sec.gov/'],
  ['FINRA BrokerCheck', 'https://brokercheck.finra.org/'],
] as const;

export async function generateMetadata() {
  return pageMetadata({ title: 'Alaska Investment Adviser and Securities Evidence', description, path: '/alaska', host: await readRequestHost() });
}

export default function AlaskaInvestorPage() {
  return <div className="ith-intel">
    <section className="ith-intel-section" aria-labelledby="ak-title"><div className="th-shell"><p className="ith-eyebrow">Alaska Division of Banking and Securities</p><h1 id="ak-title">Alaska securities registration evidence</h1><p>{description}</p><p>Official source pages checked October 14, 2026. The state regulator describes adviser and securities licensing through IARD/CRD and public lookup. A current dated Alaska-jurisdiction roster was not acquired in this pass: <strong>NOT_ACQUIRED</strong>. This is not zero and does not imply no registrants.</p></div></section>
    <section className="ith-intel-section" aria-labelledby="ak-populations"><div className="th-shell"><h2 id="ak-populations">Regulatory populations stay separate</h2><ul><li><strong>Alaska state investment adviser firms:</strong> state firm-license population; current dated Alaska-jurisdiction rows NOT_ACQUIRED.</li><li><strong>Federal covered advisers / notice filings:</strong> distinct SEC registration and state notice status, not state-registered IAs.</li><li><strong>Exempt reporting advisers:</strong> separate reporting category, not interchangeable with registered advisers.</li><li><strong>Investment adviser representatives:</strong> individual persons, distinct from adviser firms.</li><li><strong>Broker-dealers:</strong> firm registrations; separate from agents, who are persons.</li><li><strong>Branch/offices:</strong> office records are not firms or people.</li><li><strong>Orders and enforcement:</strong> dated proceedings; regulator orders are not joined to registrants by name alone.</li></ul><p>Jurisdiction is determined by regulator registration/notice status and applicable law. Principal-office geography alone is not evidence of Alaska registration.</p></div></section>
    <section className="ith-intel-section" aria-labelledby="ak-sources"><div className="th-shell"><h2 id="ak-sources">Official sources and clocks</h2><ul>{sources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}</ul><p>Alaska securities regulator and IAPD/CRD pages are live lookup sources, checked October 14, 2026; no date-stamped bulk state-jurisdiction extract was acquired. The Alaska enforcement archive includes multiple Division programs and must be filtered by securities program and order type.</p></div></section>
  </div>;
}
