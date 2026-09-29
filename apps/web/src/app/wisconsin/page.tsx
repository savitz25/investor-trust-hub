import Link from 'next/link';
import { WI_REGISTRATION_LENSES as registration, WI_SECURITIES_ORDERS as orders } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const SOURCE = {
  dfi: 'https://dfi.wi.gov/Pages/Securities/RegistrationOfProfessionals/GeneralInformation.aspx',
  adviser: 'https://dfi.wi.gov/Pages/Securities/RegistrationOfProfessionals/InvestmentAdviser.aspx',
  verify: 'https://dfi.wi.gov/Pages/Securities/InvestorResources/VerifyAdviserInvestment.aspx',
  orders: orders.indexUrl,
  exams: 'https://dfi.wi.gov/Pages/Securities/RegistrationOfProfessionals/InvestmentAdviserIAGuideExaminations.aspx',
  complaints: 'https://dfi.wi.gov/Pages/Securities/InvestorResources/FileAComplaint.aspx',
  iapd: 'https://adviserinfo.sec.gov/',
  brokercheck: 'https://brokercheck.finra.org/',
};

export async function generateMetadata() {
  return pageMetadata({
    title: 'Wisconsin Investment Adviser & Securities Intelligence',
    description: 'Wisconsin DFI Securities registration verification, separate adviser lenses, 2022–2026 administrative orders, examination and complaint capabilities. No rankings.',
    path: '/wisconsin',
    host: await readRequestHost(),
  });
}

export default function WisconsinPage() {
  return <main className="ith-intel">
    <section className="ith-intel-section"><div className="th-shell">
      <p className="ith-eyebrow">InvestorTrustHub · Wisconsin</p>
      <h1>Wisconsin Investment Adviser &amp; Securities Intelligence</h1>
      <p className="ith-lede">The Wisconsin Department of Financial Institutions (DFI), Division of Securities, handles state adviser and securities-professional registration and publishes administrative orders. Registration is reported source status, never an endorsement.</p>
      <div className="ith-actions"><a className="th-btn-primary th-btn-hero" href={SOURCE.verify}>Verify with Wisconsin DFI</a><a className="th-btn-secondary th-btn-hero" href={SOURCE.iapd}>Research on IAPD</a></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell">
      <h2>Four separate adviser lenses</h2>
      <p><a href={SOURCE.adviser}>DFI explains state adviser registration and federal-covered notice filing</a>. State IA, federal notice, ERA and principal-office geography are distinct firm-CRD lenses. They cannot be summed. A clean Wisconsin DFI bulk roster was <strong>NOT_ACQUIRED</strong>; present status requires an exact DFI or IAPD check.</p>
      <div className="ith-metric-rail">
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>Wisconsin state IA firm CRDs</h3><p>NOT_ACQUIRED. A Wisconsin office alone does not establish state registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>Federal notice firm CRDs</h3><p>NOT_ACQUIRED. Notice filing is not Wisconsin state IA registration.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">—</p><h3>Active ERA firm CRDs</h3><p>NOT_ACQUIRED. An exempt reporting adviser is not an SEC-registered RIA.</p></article>
        <article className="ith-metric"><p className="ith-metric__value">{registration.principalOffice.count}</p><h3>Wisconsin principal-office firms</h3><p>Accepted SEC/IARD roster, {registration.principalOffice.sourceAsOf}. Office geography is not Wisconsin registration or notice filing.</p></article>
      </div>
      <p>The accepted national IAPD compilation is dated {registration.acceptedIapdSourceDate}; its source feeds returned 403 during this acquisition, so Wisconsin registration filters and exact CRD intersections were not rerun. The older accepted national roster supports only the {registration.principalOffice.count} principal-office count. Exact SEC-file intersections: <strong>NOT_ACQUIRED</strong>. No national adviser population was duplicated.</p>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Broker-dealers, agents and adviser representatives</h2><p><a href={SOURCE.dfi}>DFI describes separate professional registrations</a> and <a href={SOURCE.verify}>offers exact verification</a>; <a href={SOURCE.brokercheck}>FINRA BrokerCheck</a> and <a href={SOURCE.iapd}>IAPD</a> provide additional firm or person research. Wisconsin-only bulk broker-dealer, agent and IAR rosters are <strong>NOT_ACQUIRED</strong>. A person CRD is not a firm CRD.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>2022–2026 DFI administrative orders</h2><p>The <a href={SOURCE.orders}>DFI administrative-order index</a> supplies <strong>{orders.rowCount} dated rows</strong> in the bounded window: {orders.proceduralCounts.summary} summary, {orders.proceduralCounts.consent} consent, {orders.proceduralCounts.final} final, and {orders.proceduralCounts.settlement} settlement entries. All {orders.rowCount} rows include official PDF paths. The index has CRD-column text on {orders.rowsWithCrdColumn} rows, but a combined respondent caption can mix firms and people. No index CRD was assigned to a canonical firm or person without confirming that grain.</p><p>These are index rows, not a unique-respondent count or complete enforcement history. Summary orders can contain proposed relief; do not read it as a final finding or completed payment. <strong>Exact adverse attachments: 0; name-only adverse joins: 0.</strong></p>
      <div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm"><caption className="text-left font-semibold py-2">Recent DFI index entries</caption><thead><tr><th>Date</th><th>Respondent as indexed</th><th>Action label</th><th>Case</th><th>Source</th></tr></thead><tbody>{orders.rows.slice(0, 10).map((row) => <tr key={`${row.issuanceDate}-${row.documentTitleAsIndexed}`}><td className="py-2 pr-3 whitespace-nowrap">{row.issuanceDate}</td><td className="pr-3">{row.respondentAsIndexed}</td><td className="pr-3">{row.actionTypeAsIndexed}</td><td className="pr-3 whitespace-nowrap">{row.caseNumberAsIndexed ?? 'Not printed'}</td><td><a href={row.sourceDocument ?? SOURCE.orders}>DFI PDF</a></td></tr>)}</tbody></table></div>
    </div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Examinations and complaints</h2><p>DFI describes a <a href={SOURCE.exams}>periodic investment-adviser examination program</a>. Examination capability is <strong>KNOWN</strong>; provider-level exam rows and outcomes are <strong>NOT_ACQUIRED</strong>. The division <a href={SOURCE.complaints}>accepts securities complaints</a> and can investigate alleged violations. Complaint intake is <strong>KNOWN</strong>; provider complaint rows are <strong>NOT_ACQUIRED</strong> and outcomes are <strong>REQUEST_ONLY / NOT_ACQUIRED</strong>. A complaint is not an enforcement finding.</p></div></section>
    <section className="ith-intel-section"><div className="th-shell"><h2>Source clocks and gaps</h2><p>Accepted national principal-office roster: {registration.principalOffice.sourceAsOf}, retrieved {registration.principalOffice.retrievedAt}. Later IAPD compilation source date: {registration.acceptedIapdSourceDate}; Wisconsin registration status date: unavailable. DFI order index retrieved {orders.retrievedAt}; each row retains its own issuance date and procedural label. Snapshot generated {registration.generatedAt}. There is no universal Wisconsin securities as-of date.</p><p>Wisconsin state IA, notice and ERA counts, exact CRD/SEC intersections, DFI bulk registration, BD and person rosters, provider exam rows and complaint outcomes: <strong>NOT_ACQUIRED</strong>. New canonical firms: 0. Graph writes: 0. Claim eligibility changes: 0. No city pages, scores or adviser ranking.</p><p><Link href="/ask?q=investment%20adviser%20Wisconsin">Ask about Wisconsin evidence</Link> · <a href={SOURCE.dfi}>Wisconsin DFI Securities</a></p></div></section>
  </main>;
}
