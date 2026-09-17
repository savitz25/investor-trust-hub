import Link from 'next/link';
import {
  PA_PUBLIC_SNAPSHOT,
  paPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = PA_PUBLIC_SNAPSHOT;

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

export function PennsylvaniaStateIntelligence() {
  const overlayCount = paPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Pennsylvania', path: '/pennsylvania' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Pennsylvania Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/pennsylvania',
        description:
          'SEC/IARD Pennsylvania principal-office overlay, IAPD Pennsylvania state-registered investment-adviser firms, Pennsylvania state ERA reporting, and federal-covered notice filings. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Pennsylvania investor state intelligence',
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

      <section className="ith-intel-section" aria-labelledby="pa-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Pennsylvania</p>
          <h1 id="pa-title">Pennsylvania Investment Adviser & Securities Intelligence</h1>
          <p className="ith-lede">
            The Pennsylvania Department of Banking and Securities (DoBS) is the state securities regulator.
            CRD/IARD is the registration infrastructure. IAPD is the public adviser research system. This page
            organizes separate research lenses: state IA, ERA, federal notice, and principal office. Exact CRD
            is the firm identity. DoBS enforcement is separate evidence and is not automatically an adviser
            matter. IARs are people, not adviser firms. There is no combined Pennsylvania adviser total. This
            page does not rank advisers, score firms, or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Pennsylvania-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="pa-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="pa-record-title">Universe · Current · State ERA · Notice · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a Pennsylvania principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region PA = ${overlayCount}. Raw compilation MainAddr=@State=PA = ${snap.nationalOverlay.rawCompilationMainAddrPa} is a different extract.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Pennsylvania state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = PA"
                calculation={`${snap.stateRia.registrationRows} Pennsylvania StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=PA, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Pennsylvania state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="Pennsylvania state ERA reporting firm; ERA/Rgltr/@Cd=PA; distinct firm CRD"
                calculation={`${snap.stateEra.registrationRows} registration rows; ${snap.stateEra.distinctFirmCrd} distinct firm CRDs; ${snap.stateEra.activeDistinctCrd} ACTIVE; overlap with Pennsylvania state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with a Pennsylvania notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=PA and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.stateRia.source}. Retrieval time is not sourceAsOf.</p>
              <Trace
                source="Committed PA-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="pa-rule-title">
        <div className="th-shell">
          <h2 id="pa-rule-title">Pennsylvania DoBS registration context</h2>
          <p>{snap.sosFramework.clientThresholdNote}</p>
          <p>
            Always verify current official records. This is not legal advice and does not determine whether any
            particular adviser must register.
          </p>
          <ul>
            <li>
              <a href={snap.sosFramework.officialHomeUrl}>Pennsylvania DoBS Securities</a>
            </li>
            <li>
              <a href={snap.stateRia.verifyUrl}>IAPD current verification</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="pa-verify-title">
        <div className="th-shell">
          <h2 id="pa-verify-title">Current verification paths</h2>
          <p>
            Current firm status comes from accepted IAPD/SEC data or official current IAPD, BrokerCheck, or
            Pennsylvania DoBS guidance. Interactive search was not enumerated. Search-only is not zero.
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
              <a href={snap.sosFramework.officialRegistrationSearchUrl}>Pennsylvania DoBS Securities Registration Office</a>
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="pa-cases-title">
        <div className="th-shell">
          <h2 id="pa-cases-title">Pennsylvania DoBS enforcement research path</h2>
          <p>{snap.enforcement.caveat}</p>
          <p>
            Coverage: {snap.enforcement.REGULATORY_ACTIVITY_COVERAGE}. Complete securities-only and IA-only
            enforcement counts are unknown — not zero. This ticket attached {snap.enforcement.exactCrdCrosswalks}{' '}
            exact CRD records and opened {snap.enforcement.pdfsDownloaded} PDFs; those are execution counts, not an
            adviser-action census. Name-only is unsafe. Order to Show Cause is not a final finding. Consent is not a
            conviction. No action found is not a clean record.
          </p>
          <p>
            <a href={snap.enforcement.officialIndex}>Pennsylvania DoBS Enforcement Orders</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="pa-not-title">
        <div className="th-shell">
          <h2 id="pa-not-title">What this page does not mean</h2>
          <ul>
            <li>
              {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} Pennsylvania state ERA reporting firms are a
              separate source-defined class from the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              approved Pennsylvania state-registered IA firms. ERA is not an RIA.
            </li>
            <li>It does not say Pennsylvania has one investment-adviser total, and it does not use the mixed DoBS 200,000+ securities-class figure as advisers.</li>
            <li>Philadelphia, Pittsburgh, Allegheny, and Montgomery County are not InvestorTrustHub routes.</li>
            <li>RAUM is not performance. Complaint is not a violation. A DoBS order is not an IA disciplinary census.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
