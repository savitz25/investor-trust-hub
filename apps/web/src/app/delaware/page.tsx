import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';

const description = 'Delaware Department of Justice Securities Division registration source map. State investment advisers, federal notice filings, exempt reporting advisers, investment adviser representatives, broker-dealers, agents, branches, and enforcement records are separate populations.';
const sources = [
  ['Delaware DOJ Investor Protection Unit', 'https://attorneygeneral.delaware.gov/fraud/ipu/'],
  ['Delaware DOJ industry-professional registration guidance', 'https://attorneygeneral.delaware.gov/fraud/ipu/industry-professionals/'],
  ['Delaware Securities Act, Title 6 Chapter 73', 'https://delcode.delaware.gov/title6/c073/'],
  ['Delaware registration requirements for investment advisers', 'https://attorneygeneral.delaware.gov/wp-content/uploads/sites/50/2022/06/9.13.2021-Registration-Requirements.pdf'],
  ['SEC Investment Adviser Public Disclosure (IAPD)', 'https://adviserinfo.sec.gov/'],
  ['FINRA BrokerCheck', 'https://brokercheck.finra.org/'],
] as const;

export async function generateMetadata() {
  return pageMetadata({ title: 'Delaware Investment Adviser & Securities Evidence', description, path: '/delaware', host: await readRequestHost() });
}

export default function DelawarePage() {
  return <div className="ith-intel">
    <section className="ith-intel-section" aria-labelledby="de-title"><div className="th-shell"><p className="ith-eyebrow">Delaware Securities Division</p><h1 id="de-title">Delaware securities registration evidence</h1><p>{description}</p><p>Official source map checked October 12, 2026. Current dated IARD/CRD Delaware jurisdiction snapshots and reconciled rows were not acquired for this publication: <strong>NOT_ACQUIRED</strong>. This is not zero and does not imply no registrants.</p></div></section>
    <section className="ith-intel-section" aria-labelledby="de-populations"><div className="th-shell"><h2 id="de-populations">Regulatory populations stay separate</h2><ul><li><strong>Delaware state investment adviser:</strong> firm registration under state jurisdiction.</li><li><strong>Federal covered adviser / notice filing:</strong> SEC registration and state notice filing are separate from state adviser registration.</li><li><strong>Exempt reporting adviser:</strong> reporting status, not SEC-registered IA status or state registration by itself.</li><li><strong>Investment adviser representative:</strong> person population, distinct from adviser firms.</li><li><strong>Broker-dealer:</strong> firm population, distinct from agents.</li><li><strong>Agent:</strong> person registration, not a broker-dealer firm.</li><li><strong>Branch offices:</strong> separate office filings where source-defined; not firm or person counts.</li><li><strong>Orders and enforcement:</strong> dated proceedings; no adverse identity join by name alone.</li></ul><p>Registration depends on regulator jurisdiction and filing status. Principal-office location alone does not establish Delaware registration. No combined securities census or rating is published.</p></div></section>
    <section className="ith-intel-section" aria-labelledby="de-sources"><div className="th-shell"><h2 id="de-sources">Regulator and verification sources</h2><ul>{sources.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul><p>The Delaware Securities Act identifies distinct adviser, federal covered adviser, broker-dealer, agent, and representative filing classes. IAPD and BrokerCheck assist with identity review but do not replace a dated Delaware jurisdiction snapshot. Current row counts and source clock for jurisdiction data: NOT_ACQUIRED.</p></div></section>
  </div>;
}
