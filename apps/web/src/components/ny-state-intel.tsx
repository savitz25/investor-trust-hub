import Link from 'next/link';
import {
  NY_PUBLIC_SNAPSHOT,
  nyPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = NY_PUBLIC_SNAPSHOT;

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

export function NewYorkStateIntelligence() {
  const overlayCount = nyPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'New York', path: '/new-york' },
      ]),
      {
        '@type': 'WebPage',
        name: 'New York Investment Adviser Intelligence',
        url: 'https://www.investortrusthub.com/new-york',
        description:
          'SEC/IARD New York principal-office overlay, IAPD New York state-registered investment-adviser firms, New York state ERA reporting, and federal-covered notice filings. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'New York investor state intelligence',
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

      <section className="ith-intel-section" aria-labelledby="ny-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · New York</p>
          <h1 id="ny-title">New York Investment Adviser Intelligence</h1>
          <p className="ith-lede">
            The Office of the New York Attorney General, Investor Protection Bureau, regulates broker-dealers,
            investment advisers, and related securities actors. This page organizes separate research lenses from
            accepted IAPD compilations and official OAG registration guidance. It does not rank advisers, score
            firms, or publish a Trust Score. A New York principal office is not New York state registration. New
            York registration is not SEC registration. Firm is not individual. New York DFS is not the state
            investment-adviser regulator.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research NY-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ny-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="ny-record-title">Universe · Current · State ERA · Notice · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a New York principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region NY = ${overlayCount}. Raw compilation MainAddr=@State=NY = ${snap.nationalOverlay.rawCompilationMainAddrNy} is a different extract.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">New York state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = NY"
                calculation={`${snap.stateRia.registrationRows} New York StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=NY, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">New York state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="New York state ERA reporting firm; ERA/Rgltr/@Cd=NY; distinct firm CRD"
                calculation={`${snap.stateEra.registrationRows} registration rows; ${snap.stateEra.distinctFirmCrd} distinct firm CRDs; ${snap.stateEra.activeDistinctCrd} ACTIVE; overlap with New York state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with a New York notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=NY and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.nationalOverlay.source}. Retrieval time is not sourceAsOf.</p>
              <Trace
                source="Committed NY-INV-001 public snapshot"
                sourceDate={snap.asOf}
                coverage="Deterministic generator"
                grain="snapshot"
                calculation={`Fingerprint ${snap.fingerprint.slice(0, 16)}…`}
                caveat="Numbers on this page must match the generated snapshot. Retrieval time is not sourceAsOf."
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ny-rule-title">
        <div className="th-shell">
          <h2 id="ny-rule-title">New York OAG registration context</h2>
          <p>{snap.oagFramework.clientThresholdNote}</p>
          <p>
            Always verify current official records. This is not legal advice and does not determine whether any
            particular adviser must register.
          </p>
          <ul>
            <li>
              <a href={snap.oagFramework.officialHomeUrl}>OAG Investments, Registration &amp; Regulation</a>
            </li>
            <li>
              <a href={snap.oagFramework.officialFaqUrl}>OAG Investment Advisers FAQ</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ny-verify-title">
        <div className="th-shell">
          <h2 id="ny-verify-title">Current verification paths</h2>
          <p>
            Current firm status comes from accepted IAPD/SEC data or official current IAPD, BrokerCheck, or OAG
            guidance. Interactive search was not enumerated. Search-only is not zero.
          </p>
          <ul>
            <li>
              <a href={snap.stateRia.iapdUrl}>IAPD</a>
            </li>
            <li>
              <a href={snap.brokerDealer.verifyUrl}>FINRA BrokerCheck</a> (broker-dealer / registered representative,
              not IA)
            </li>
            <li>
              <a href={snap.stateRia.oagInvestorProtectionFaqUrl}>OAG Investor Protection FAQs</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ny-cases-title">
        <div className="th-shell">
          <h2 id="ny-cases-title">OAG Investor Protection research path</h2>
          <p>{snap.enforcement.caveat}</p>
          <p>
            Coverage: {snap.enforcement.result}. Exact CRD crosswalks:{' '}
            {snap.enforcement.exactCrdCrosswalks}. PDFs opened: {snap.enforcement.pdfsDownloaded}. Name-only is
            unsafe.
          </p>
          <p>
            <a href={snap.enforcement.officialIndex}>OAG Advocacy and Enforcement Actions library</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ny-not-title">
        <div className="th-shell">
          <h2 id="ny-not-title">What this page does not mean</h2>
          <ul>
            <li>
              {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} New York state ERA reporting firms are a
              separate source-defined class from the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              approved New York state-registered IA firms. ERA is not an RIA.
            </li>
            <li>It does not say New York has one investment-adviser total.</li>
            <li>New York City is not a separate InvestorTrustHub route.</li>
            <li>RAUM is not performance. Complaint is not a violation. OAG action is not an IA disciplinary census.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
