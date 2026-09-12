import Link from 'next/link';
import {
  IL_PUBLIC_SNAPSHOT,
  ilPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = IL_PUBLIC_SNAPSHOT;

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

export function IllinoisStateIntelligence() {
  const overlayCount = ilPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Illinois', path: '/illinois' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Illinois Investment Adviser Intelligence',
        url: 'https://www.investortrusthub.com/illinois',
        description:
          'SEC/IARD Illinois principal-office overlay, IAPD Illinois state-registered investment-adviser firms, Illinois state ERA reporting, and federal-covered notice filings. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Illinois investor state intelligence',
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
          <p className="ith-eyebrow">InvestorTrustHub · Illinois</p>
          <h1 id="il-title">Illinois Investment Adviser Intelligence</h1>
          <p className="ith-lede">
            The Illinois Secretary of State, Securities Department, regulates securities registration and related
            actors. This page organizes separate research lenses from accepted IAPD compilations and official
            Illinois SOS paths. It does not rank advisers, score firms, or publish a Trust Score. An Illinois
            principal office is not Illinois state registration. Illinois registration is not SEC registration.
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
              <p className="ith-kicker">SEC/IARD roster firms with an Illinois principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region IL = ${overlayCount}. Raw compilation MainAddr=@State=IL = ${snap.nationalOverlay.rawCompilationMainAddrIl} is a different extract.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Illinois state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = IL"
                calculation={`${snap.stateRia.registrationRows} Illinois StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=IL, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Illinois state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="Illinois state ERA reporting firm; ERA/Rgltr/@Cd=IL; distinct firm CRD"
                calculation={`${snap.stateEra.registrationRows} registration rows; ${snap.stateEra.distinctFirmCrd} distinct firm CRDs; ${snap.stateEra.activeDistinctCrd} ACTIVE; overlap with Illinois state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with an Illinois notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=IL and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.nationalOverlay.source}. Retrieval time is not sourceAsOf.</p>
              <Trace
                source="Committed IL-INV-001 public snapshot"
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
          <h2 id="il-rule-title">Illinois SOS registration context</h2>
          <p>{snap.sosFramework.clientThresholdNote}</p>
          <p>
            Always verify current official records. This is not legal advice and does not determine whether any
            particular adviser must register.
          </p>
          <ul>
            <li>
              <a href={snap.sosFramework.officialHomeUrl}>Illinois SOS Securities Department</a>
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
            Current firm status comes from accepted IAPD/SEC data or official current IAPD, BrokerCheck, or Illinois
            SOS guidance. Interactive search was not enumerated. Search-only is not zero.
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
              <a href={snap.sosFramework.officialRegistrationSearchUrl}>ILSOS registration search</a> (business
              brokers / loan brokers, not IA)
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-cases-title">
        <div className="th-shell">
          <h2 id="il-cases-title">Illinois SOS enforcement research path</h2>
          <p>{snap.enforcement.caveat}</p>
          <p>
            Coverage: {snap.enforcement.REGULATORY_ACTIVITY_COVERAGE}. Complete SOS regulatory-activity count is
            unknown — not zero. This ticket attached {snap.enforcement.exactCrdCrosswalks} exact CRD records and
            opened {snap.enforcement.pdfsDownloaded} PDFs; those are execution counts, not an SOS action census.
            Name-only is unsafe. No action found is not a clean record.
          </p>
          <p>
            <a href={snap.enforcement.officialIndex}>Illinois SOS Administrative Actions</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="il-not-title">
        <div className="th-shell">
          <h2 id="il-not-title">What this page does not mean</h2>
          <ul>
            <li>
              {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} Illinois state ERA reporting firms are a
              separate source-defined class from the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              approved Illinois state-registered IA firms. ERA is not an RIA.
            </li>
            <li>It does not say Illinois has one investment-adviser total.</li>
            <li>Chicago and Cook County are not InvestorTrustHub routes.</li>
            <li>RAUM is not performance. Complaint is not a violation. SOS action is not an IA disciplinary census.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
