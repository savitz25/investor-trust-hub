import Link from 'next/link';
import { MA_PUBLIC_SNAPSHOT, maPrincipalOfficeCountFromNationalRoster } from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = MA_PUBLIC_SNAPSHOT;

const TYPE_LABELS: Record<string, string> = {
  COMPLAINT: 'Complaint',
  ADMINISTRATIVE_COMPLAINT: 'Administrative Complaint',
  AMENDED_COMPLAINT: 'Amended Complaint',
  CONSENT_ORDER: 'Consent Order',
  ORDER: 'Order',
  CEASE_AND_DESIST_ORDER: 'Cease and Desist Order',
  EX_PARTE_ORDER_TO_CEASE_AND_DESIST: 'Ex Parte Order to Cease and Desist',
  SUSPENSION_ORDER: 'Suspension Order',
  EXHIBITS: 'Exhibits',
  MEMORANDUM: 'Memorandum',
};

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

export function MassachusettsStateIntelligence() {
  const overlayCount = maPrincipalOfficeCountFromNationalRoster();
  const e = snap.enforcement;
  const types = Object.entries(e.documentTypes).sort((a, b) => b[1] - a[1]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Massachusetts', path: '/massachusetts' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Massachusetts Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/massachusetts',
        description:
          'Massachusetts Securities Division, IAPD Massachusetts state IA, ERA, notice filings, principal-office overlay, and the public enforcement archive. A complaint is not a finding. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Massachusetts investor state intelligence',
        description: 'Separate Massachusetts IAPD lenses and Securities Division enforcement documents. Not a combined adviser total.',
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

      <section className="ith-intel-section" aria-labelledby="ma-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Massachusetts</p>
          <h1 id="ma-title">Massachusetts Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Securities Division of the Massachusetts Secretary of the Commonwealth is the state securities regulator
            under the Massachusetts Uniform Securities Act. IARD and CRD are filing infrastructure; IAPD and BrokerCheck
            are public research tools. None of them is the regulator. A Massachusetts state-registered adviser is not an
            SEC-registered adviser with a Massachusetts notice filing, not an exempt reporting adviser, and not simply a
            firm with a Massachusetts office. A representative is a person, not a firm. A broker-dealer is not an
            investment adviser. A Division complaint states allegations; it is not a finding. There is no combined
            Massachusetts adviser total. This page does not rank advisers, give investment advice, or publish a Trust
            Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Massachusetts-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ma-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="ma-record-title">IAPD Massachusetts state IA · ERA · Notice · Principal office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD Massachusetts state IA (APPROVED)</h3>
              <p className="ith-kicker">Distinct firm CRDs with StateRgstn/Rgltr/@Cd=MA and status APPROVED.</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = MA"
                calculation={`${snap.stateRia.registrationRows} MA StateRgstn rows: ${snap.stateRia.approvedDistinctCrd} APPROVED, ${snap.stateRia.condrestDistinctCrd} CONDREST, ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST (termination requested). Filter is Rgltr/@Cd=MA, not address; ${snap.stateRia.principalOfficeMaAmongStateIa} of the ${snap.stateRia.distinctFirmCrd} list a Massachusetts main office.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Exempt reporting advisers reporting to Massachusetts. Not state-registered IA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="ERA/Rgltr/@Cd=MA"
                calculation={`${snap.stateEra.distinctFirmCrd} distinct firm CRDs, all ACTIVE; overlap with Massachusetts state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC-registered advisers with a Massachusetts notice filing. Not state IA.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=MA and status FILED"
                calculation={`${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs. Exact CRD overlap with APPROVED state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Principal office</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a Massachusetts principal office. Not registration.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region MA = ${overlayCount}. Raw 2026-09-17 compilation MainAddr/@State=MA = ${snap.nationalOverlay.rawCompilationMainAddrMa}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ma-classes-title">
        <div className="th-shell">
          <h2 id="ma-classes-title">Representatives, broker-dealers and agents stay separate</h2>
          <p>
            Investment adviser representatives register through IARD/CRD. A representative is a person; InvestorTrustHub
            does not publish a Massachusetts representative directory, and representatives are never added to firm
            counts. Broker-dealers and their agents are verified through CRD and{' '}
            <a href={snap.brokerDealer.verifyUrl}>BrokerCheck</a>. A Massachusetts-only broker-dealer or agent bulk roster
            was not acquired. The Division can provide registration status and disciplinary records for broker-dealers,
            agents, investment advisers and representatives on request.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ma-enf-title">
        <div className="th-shell">
          <h2 id="ma-enf-title">Securities Division enforcement archive, 2012–2026</h2>
          <p>
            The Division&apos;s <a href={e.source}>enforcement actions archive</a> lists {e.announcements} announcements from{' '}
            {e.archiveYears[0]} to {e.archiveYears[1]}, linking {e.observationRows} documents. Each document keeps the type
            the Division gives it. A complaint states allegations; it is not a finding. A consent order or other order is
            kept as listed. Document count is not matter count: only printed docket numbers are deduplicated (
            {e.distinctCaseNumbers} dockets on {e.announcementsWithPrintedDocket} announcements), so no unique-matter total
            is claimed. The linked documents were not parsed here, relief amounts are not totaled, and nothing is attached
            to a firm or person profile by name. For actions before 2012, the Division asks the public to contact it.
          </p>
          <ul>
            {types.map(([type, count]) => (
              <li key={type}>
                {TYPE_LABELS[type] ?? type}: {count}
              </li>
            ))}
          </ul>
          <h3>Most recent announcements</h3>
          <ul>
            {e.recent.map((item) => (
              <li key={item.id}>
                {item.headline} · {item.listingDate ?? 'date not listed'} ·{' '}
                {item.documents.map((doc, index) => (
                  <span key={doc.url}>
                    {index ? ' · ' : ''}
                    <a href={doc.url}>{TYPE_LABELS[doc.type] ?? doc.type}</a>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ma-complaints-title">
        <div className="th-shell">
          <h2 id="ma-complaints-title">Complaints</h2>
          <p>
            The Division&apos;s Enforcement Section investigates investor complaints. No provider-level complaint dataset
            is published, so this page has no complaint count. An investor complaint is not a Division complaint, and
            neither is an order or a finding.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ma-not-title">
        <div className="th-shell">
          <h2 id="ma-not-title">What this page does not mean</h2>
          <ul>
            <li>Do not add state IA + ERA + notice + principal office, or advisers + representatives + broker-dealers + agents.</li>
            <li>Boston and Worcester are geography, not InvestorTrustHub intelligence routes.</li>
            <li>Securities offering registrations and pre-2012 actions were not acquired. Missing is not zero.</li>
            <li>No Trust Score. No AggregateRating. No ranking. No investment advice.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
