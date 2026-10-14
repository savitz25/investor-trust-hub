import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DCCA = 'https://www.cca.hawaii.gov/sec/';
const BRANCH = 'https://www.cca.hawaii.gov/sec/securities-compliance-branch/';
const ENFORCEMENT = 'https://cca.hawaii.gov/sec/enforcement-actions-and-orders/';
const IAPD = 'https://adviserinfo.sec.gov/';
const BROKERCHECK = 'https://brokercheck.finra.org/';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Hawaii Securities Registration and Enforcement Evidence',
    description: 'Hawaii DCCA Securities Compliance Branch and official IARD, IAPD, and CRD lookup paths. Registration classes and enforcement remain separate.',
    path: '/hawaii', host: await readRequestHost(),
  });
}

const populations = [
  ['Hawaii state-registered investment adviser firms', 'DCCA says Hawaii adviser registration is filed through IARD, then reviewed by the Securities Compliance Branch. Current Hawaii-jurisdiction firm population: NOT_ACQUIRED.'],
  ['Federal covered adviser notice filings', 'A federal-covered notice filing is a separate regulatory status from Hawaii state registration. Hawaii-specific notice population: NOT_ACQUIRED.'],
  ['Exempt reporting advisers', 'ERA status and filings are maintained as a separate IARD population. Hawaii state regulatory jurisdiction was not independently reconciled here: NOT_ACQUIRED.'],
  ['Investment adviser representatives', 'IARs are people associated with advisers, not firms. Hawaii registration requires IARD filing; current people population and exact CRD reconciliation: NOT_ACQUIRED.'],
  ['Broker-dealers and securities agents', 'DCCA separately regulates broker-dealers and securities agents. Firm, branch, and individual agent records must not be added together. Current population: NOT_ACQUIRED.'],
  ['Examinations and enforcement orders', 'DCCA describes field examinations and publishes an enforcement-actions-and-orders resource. Examination observations and orders are separate from registrations; no adverse identity join was made.'],
] as const;

export default function HawaiiPage() {
  return <main className="page-shell class-research-page">
    <p className="eyebrow">Hawaii securities oversight</p>
    <h1>Hawaii securities registration evidence</h1>
    <p>Hawaii DCCA's Business Registration Division includes the Securities Compliance and Securities Enforcement branches. The Compliance Branch handles investment advisers, investment adviser representatives, broker-dealers and securities agents. Hawaii requires investment adviser applicants to file through IARD and undergo state review. A principal office location alone does not establish Hawaii registration.</p>
    <section aria-labelledby="populations"><h2 id="populations">Separate regulatory populations</h2><div style={{overflowX:'auto'}}><table><caption>Hawaii securities classes and publication status</caption><thead><tr><th>Population</th><th>Evidence status</th></tr></thead><tbody>{populations.map(([name,status])=><tr key={name}><th scope="row">{name}</th><td>{status}</td></tr>)}</tbody></table></div></section>
    <section aria-labelledby="lookup"><h2 id="lookup">Official verification paths</h2><ul><li><a href={DCCA}>Hawaii DCCA Securities branches</a></li><li><a href={BRANCH}>Securities Compliance Branch and IARD registration process</a></li><li><a href={ENFORCEMENT}>Securities Enforcement Branch orders and actions</a></li><li><a href={IAPD}>SEC/IAPD adviser search</a></li><li><a href={BROKERCHECK}>FINRA BrokerCheck</a></li></ul><p>Search results and filing statuses are source records, not an independently reconciled Hawaii census. State registration, SEC registration or notice, ERA reporting, IAR person registrations, broker-dealers, agents, examinations, and orders remain separate. No counts, rankings, Trust Score, or name-only adverse join are asserted.</p></section>
    <section><h2>Source clock and limits</h2><p>Sources reviewed October 14, 2026. Current source-native Hawaii jurisdiction rows, exact firm and person matches, and evidence attachments were NOT_ACQUIRED. DCCA advises applicants to use IARD; individually querying records is not represented as a complete population. Use the regulator and IAPD/CRD lookup links to verify a specific record.</p></section>
    <p><Link href="/">InvestorTrustHub home</Link></p>
  </main>;
}
