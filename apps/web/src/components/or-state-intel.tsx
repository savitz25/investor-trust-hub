import Link from 'next/link';
import {
  OR_PUBLIC_SNAPSHOT,
  orPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = OR_PUBLIC_SNAPSHOT;

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

export function OregonStateIntelligence() {
  const overlayCount = orPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Oregon', path: '/oregon' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Oregon Investment Adviser Intelligence',
        url: 'https://www.investortrusthub.com/oregon',
        description:
          'SEC/IARD Oregon principal-office overlay, IAPD Oregon state-registered investment-adviser firms, Oregon state ERA reporting, and federal-covered notice filings. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Oregon investor state intelligence',
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

      <section className="ith-intel-section" aria-labelledby="il-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Oregon</p>
          <h1 id="il-title">Oregon Investment Adviser Intelligence</h1>
          <p className="ith-lede">
            The Oregon Division of Financial Regulation (DFR), regulates securities registration and related
            actors. This page organizes separate research lenses from accepted IAPD compilations and official
            Oregon DFR paths. It does not rank advisers, score firms, or publish a Trust Score. An Oregon
            principal office is not Oregon state registration. Oregon registration is not SEC registration.
            Firm is not individual. Notice filing is not state IA. ERA is not an RIA.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research IL-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="il-record-title">Universe · Current · State ERA · Notice · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD roster firms with an Oregon principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region IL = ${overlayCount}. Raw compilation MainAddr=@State=IL = ${snap.nationalOverlay.rawCompilationMainAddrOr} is a different extract.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Oregon state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = IL"
                calculation={`${snap.stateRia.registrationRows} Oregon StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=OR, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Oregon state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="Oregon state ERA reporting firm; ERA/Rgltr/@Cd=OR; distinct firm CRD"
                calculation={`${snap.stateEra.registrationRows} registration rows; ${snap.stateEra.distinctFirmCrd} distinct firm CRDs; ${snap.stateEra.activeDistinctCrd} ACTIVE; overlap with Oregon state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with an Oregon notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=OR and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.nationalOverlay.source}. Retrieval time is not sourceAsOf.</p>
              <Trace
                source="Committed OR-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="il-rule-title">
        <div className="th-shell">
          <h2 id="il-rule-title">Oregon DFR registration context</h2>
          <p>{snap.sosFramework.clientThresholdNote}</p>
          <p>
            Always verify current official records. This is not legal advice and does not determine whether any
            particular adviser must register.
          </p>
          <ul>
            <li>
              <a href={snap.sosFramework.officialHomeUrl}>Oregon DFR Securities Department</a>
            </li>
            <li>
              <a href={snap.stateRia.verifyUrl}>IAPD current verification</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-verify-title">
        <div className="th-shell">
          <h2 id="il-verify-title">Current verification paths</h2>
          <p>
            Current firm status comes from accepted IAPD/SEC data or official current IAPD, BrokerCheck, or Oregon
            DFR guidance. Interactive search was not enumerated. Search-only is not zero.
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
              <a href={snap.sosFramework.officialRegistrationSearchUrl}>DFR registration search</a> (business
              brokers / loan brokers, not IA)
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-cases-title">
        <div className="th-shell">
          <h2 id="il-cases-title">Oregon DFR enforcement research path</h2>
          <p>{snap.enforcement.caveat}</p>
          <p>
            Coverage: {snap.enforcement.REGULATORY_ACTIVITY_COVERAGE}. Complete DFR regulatory-activity count is
            unknown — not zero. This ticket attached {snap.enforcement.exactCrdCrosswalks} exact CRD records and
            opened {snap.enforcement.pdfsDownloaded} PDFs; those are execution counts, not an DFR action census.
            Name-only is unsafe. No action found is not a clean record.
          </p>
          <p>
            <a href={snap.enforcement.officialIndex}>Oregon DFR Administrative Actions</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-not-title">
        <div className="th-shell">
          <h2 id="il-not-title">What this page does not mean</h2>
          <ul>
            <li>
              {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} Oregon state ERA reporting firms are a
              separate source-defined class from the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              approved Oregon state-registered IA firms. ERA is not an RIA.
            </li>
            <li>It does not say Oregon has one investment-adviser total.</li>
            <li>Portland and Multnomah County are not InvestorTrustHub routes.</li>
            <li>RAUM is not performance. Complaint is not a violation. DFR action is not an IA disciplinary census.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
