import Link from 'next/link';
import {
  VA_PUBLIC_SNAPSHOT,
  vaPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = VA_PUBLIC_SNAPSHOT;

function Trace({
  source,
  sourceDate,
  coverage,
  grain,
  calculation,
  caveat,
}: {
  source: string;
  sourceDate: string;
  coverage: string;
  grain: string;
  calculation: string;
  caveat: string;
}) {
  return (
    <details className="ith-disclose">
      <summary>Trace this number</summary>
      <p>
        <strong>Source.</strong> {source}
      </p>
      <p>
        <strong>Source date.</strong> {sourceDate}
      </p>
      <p>
        <strong>Coverage.</strong> {coverage}
      </p>
      <p>
        <strong>Grain.</strong> {grain}
      </p>
      <p>
        <strong>Calculation.</strong> {calculation}
      </p>
      <p>
        <strong>Caveat.</strong> {caveat}
      </p>
    </details>
  );
}

export function VirginiaStateIntelligence() {
  const overlayCount = vaPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Virginia', path: '/virginia' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Virginia Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/virginia',
        description:
          'SEC/IARD Virginia principal-office overlay, IAPD Virginia state-registered investment-adviser firms, SCC 2025 activity aggregates, and SCC regulatory-activity observations. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Virginia investor state intelligence',
        description: snap.nationalOverlay.caveat,
        license: 'https://www.investortrusthub.com/methodology',
      },
      {
        '@type': 'Organization',
        name: 'InvestorTrustHub',
        url: 'https://www.investortrusthub.com/',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="va-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Virginia</p>
          <h1 id="va-title">Virginia Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            Virginia SCC Division of Securities and Retail Franchising regulates broker-dealers, agents, investment
            advisers, and investment adviser representatives, subject to statutory exemptions. This page organizes
            separate research lenses from accepted IAPD compilations and official SCC publications. It does not rank
            advisers, score firms, or publish a Trust Score. A Virginia principal office is not Virginia state
            registration. Virginia registration is not SEC registration. Firm is not individual.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research VA-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="va-record-title">Universe · Current · State ERA · Notice · Activity · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a Virginia principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region VA = ${overlayCount}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Virginia state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = VA"
                calculation={`${snap.stateRia.registrationRows} Virginia StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=VA, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Virginia state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="Virginia state ERA reporting firm; ERA/Rgltr/@Cd=VA; distinct firm CRD"
                calculation={`${snap.stateEra.registrationRows} registration rows; ${snap.stateEra.distinctFirmCrd} distinct firm CRDs; ${snap.stateEra.activeDistinctCrd} ACTIVE; overlap with Virginia state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with a Virginia notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=VA and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.sccAnnualReport.headline.investment_advisor_audits_completed.toLocaleString('en-US')}</p>
              <h3>2025 audits</h3>
              <p className="ith-kicker">SCC investment adviser audits completed in 2025. Activity, not discipline.</p>
              <Trace
                source={snap.sccAnnualReport.sourceUrl}
                sourceDate="2025"
                coverage="SCC SRF annual report"
                grain="2025 activity process count"
                calculation={`${snap.sccAnnualReport.headline.investment_advisor_audits_completed} investment adviser audits completed; ${snap.sccAnnualReport.headline.audit_violation_deficiencies_resolved} audit violation deficiencies resolved.`}
                caveat={snap.sccAnnualReport.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.nationalOverlay.source}. SCC 2025 report year is 2025, not current 2026 status.</p>
              <Trace
                source="Committed VA-INV-001 public snapshot"
                sourceDate={snap.asOf}
                coverage="Deterministic generator"
                grain="snapshot"
                calculation={`Fingerprint ${snap.fingerprint.slice(0, 16)}…`}
                caveat="Numbers on this page must match the generated snapshot. Retrieval time is not sourceAsOf. 2025 activity counts are not 2026 current registrations."
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-verify-title">
        <div className="th-shell">
          <h2 id="va-verify-title">Current verification paths</h2>
          <p>
            Current firm status comes from accepted IAPD/SEC data or official current SCC/IARD verification. SCC
            Examination/Registration Search is OPEN_SEARCH_ONLY — it was not enumerated. Search-only is not zero.
          </p>
          <ul>
            <li>
              <a href={snap.stateRia.iapdUrl}>IAPD</a>
            </li>
            <li>
              <a href={snap.stateRia.sccHomeUrl}>Virginia SCC Securities &amp; Retail Franchising</a>
            </li>
            <li>
              <a href={snap.enforcement.officialIndex}>SCC Regulatory Activity</a>
            </li>
            <li>
              <a href={snap.brokerDealer.verifyUrl}>FINRA BrokerCheck</a> (broker-dealer / agent, not IA)
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-scc-title">
        <div className="th-shell">
          <h2 id="va-scc-title">2025 SCC regulatory activity aggregates</h2>
          <p>{snap.sccAnnualReport.caveat}</p>
          <ul>
            <li>
              {snap.sccAnnualReport.headline.broker_dealer_registrations_and_renewals_approved.toLocaleString('en-US')}{' '}
              broker-dealer registrations and renewals approved
            </li>
            <li>
              {snap.sccAnnualReport.headline.broker_dealer_agent_registrations_and_renewals_approved.toLocaleString('en-US')}{' '}
              broker-dealer agent registrations and renewals approved
            </li>
            <li>
              {snap.sccAnnualReport.headline.investment_advisor_registrations_renewals_and_amendments_approved.toLocaleString('en-US')}{' '}
              investment adviser registrations, renewals, and amendments approved — not 4,481 firms
            </li>
            <li>
              {snap.sccAnnualReport.headline.investment_advisor_representative_registrations_and_renewals_approved.toLocaleString('en-US')}{' '}
              investment adviser representative registrations and renewals approved — not unique people
            </li>
            <li>
              {snap.sccAnnualReport.headline.investment_advisor_eras_approved.toLocaleString('en-US')} investment
              advisor eras approved
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-cases-title">
        <div className="th-shell">
          <h2 id="va-cases-title">SCC Securities &amp; Retail Franchising regulatory activity</h2>
          <p>{snap.enforcement.caveat}</p>
          <p>
            {snap.enforcement.observationRows.toLocaleString('en-US')} observation rows ·{' '}
            {snap.enforcement.distinctCaseNumbers.toLocaleString('en-US')} distinct case numbers · dates{' '}
            {snap.enforcement.dateMin} to {snap.enforcement.dateMax}. Exact CRD crosswalks:{' '}
            {snap.enforcement.exactCrdCrosswalks}. PDFs opened: {snap.enforcement.pdfsDownloaded}. Name-only is unsafe.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-complaints-title">
        <div className="th-shell">
          <h2 id="va-complaints-title">Complaint / investigation aggregates</h2>
          <p>{snap.complaints.caveat}</p>
          <ul>
            {snap.complaints.categories.map((row: { label: string; count: number }) => (
              <li key={row.label}>
                {row.count.toLocaleString('en-US')} {row.label}
              </li>
            ))}
            <li>{snap.complaints.investigationsCompleted.toLocaleString('en-US')} investigations completed</li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="va-not-title">
        <div className="th-shell">
          <h2 id="va-not-title">What this page does not mean</h2>
          <ul>
            <li>
              {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} Virginia state ERA reporting firms are a
              separate source-defined class from the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              approved Virginia state-registered IA firms. ERA is not an RIA.
            </li>
            <li>It does not say Virginia has one investment-adviser total.</li>
            <li>4,481 2025 approvals/renewals/amendments are not current firms.</li>
            <li>IAR registration/renewal activity is person grain, not firms.</li>
            <li>RAUM is not performance. Complaint is not a violation. Audit is not discipline.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
