import Link from 'next/link';
import { NV_PUBLIC_SNAPSHOT, nvPrincipalOfficeCountFromNationalRoster } from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = NV_PUBLIC_SNAPSHOT;

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

export function NevadaStateIntelligence() {
  const overlayCount = nvPrincipalOfficeCountFromNationalRoster();
  const ia = snap.stateRia;
  const era = snap.stateEra;
  const notice = snap.federalNotice;
  const e = snap.enforcement;
  const fw = snap.divisionFramework;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Nevada', path: '/nevada' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Nevada Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/nevada',
        description:
          'Nevada Secretary of State Securities Division, IAPD Nevada state IA, ERA, notice filings and principal-office overlay. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Nevada investor state intelligence',
        description: 'Separate Nevada IAPD lenses on their own source dates. Not a combined adviser total.',
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

      <section className="ith-intel-section" aria-labelledby="nv-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Nevada</p>
          <h1 id="nv-title">Nevada Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Securities Division of the Nevada Secretary of State is the state securities regulator under the Nevada
            Uniform Securities Act (NRS Chapter 90). IARD and CRD are filing infrastructure; IAPD and BrokerCheck are public
            research tools. None of them is the regulator. A Nevada state investment adviser is not an SEC-registered adviser
            with a Nevada notice filing, not an exempt reporting adviser, and not simply a firm with a Nevada office. A
            representative is a person, not a firm. A broker-dealer is not an investment adviser. There is no combined
            Nevada adviser total. This page does not rank advisers, give investment advice, or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Nevada-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={ia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-ia-title">
        <div className="th-shell">
          <h2 id="nv-ia-title">State Investment Advisers</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{ia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD Nevada state IA (APPROVED)</h3>
              <p className="ith-kicker">Distinct firm CRDs with StateRgstn/Rgltr/@Cd=NV and status APPROVED.</p>
              <Trace
                source={ia.officialUrl}
                sourceDate={ia.sourceAsOf}
                coverage={ia.STATE_RIA_BULK_ROSTER}
                grain="state investment adviser firm; registration jurisdiction = NV"
                calculation={`${ia.registrationRows} NV StateRgstn rows: ${ia.approvedDistinctCrd} APPROVED, ${ia.termrequestDistinctCrd} TERMREQUEST (termination requested), ${ia.condrestDistinctCrd} CONDREST. Filter is Rgltr/@Cd=NV, not address; ${ia.principalOfficeNvAmongStateIa} of the ${ia.distinctFirmCrd} list a Nevada main office.`}
                caveat={ia.caveat}
              />
            </article>
          </div>
          <p>
            Nevada law says an investment adviser is <em>licensed</em> (NRS 90.330); IAPD records the same credential as a
            state registration with the status text APPROVED. Neither word is an endorsement. The{' '}
            {ia.termrequestDistinctCrd} firms with termination requested are reported separately and not counted as current.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-era-title">
        <div className="th-shell">
          <h2 id="nv-era-title">ERA</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{era.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Nevada exempt reporting advisers</h3>
              <p className="ith-kicker">ERA/Rgltr/@Cd=NV, ACTIVE. Not a Nevada-licensed IA and not an SEC RIA.</p>
              <Trace
                source={era.source}
                sourceDate={era.sourceAsOf}
                coverage={era.STATE_ERA_REPORTING}
                grain={era.filter}
                calculation={`${era.distinctFirmCrd} distinct firm CRDs, all ACTIVE; overlap with Nevada state IA = ${era.overlapWithStateIa}.`}
                caveat={`${era.caveat} ${era.statute}; reporting is not licensing.`}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-notice-title">
        <div className="th-shell">
          <h2 id="nv-notice-title">Federal Notice Filings</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{notice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>SEC-registered advisers with a Nevada notice filing</h3>
              <p className="ith-kicker">NoticeFiled/States/@RgltrCd=NV, FILED. Not Nevada state IA.</p>
              <Trace
                source={notice.officialUrl}
                sourceDate={notice.sourceAsOf}
                coverage={notice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain={`${notice.filter} and status FILED`}
                calculation={`${notice.noticeFiledDistinctCrd} distinct CRDs, all SEC-registered. ${notice.noticeFiledWithNvPrincipalOffice} notice filers list a Nevada main office.`}
                caveat={`${notice.caveat} ${notice.acceptedFeedNote}`}
              />
            </article>
          </div>
          <p>
            This count comes from the {notice.sourceAsOf} SEC compilation; the state IA and ERA counts come from the{' '}
            {ia.sourceAsOf} state compilation. They are different source dates and are never added.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-po-title">
        <div className="th-shell">
          <h2 id="nv-po-title">Principal Office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>SEC/IARD roster firms with a Nevada principal office</h3>
              <p className="ith-kicker">Geography only. Not Nevada licensing and not a notice filing.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region NV = ${overlayCount}. Raw ${notice.sourceAsOf} compilation MainAddr/@State=NV = ${snap.nationalOverlay.rawCompilationMainAddrNv}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-classes-title">
        <div className="th-shell">
          <h2 id="nv-classes-title">IAR / Broker-Dealer</h2>
          <p>
            Nevada licenses investment adviser representatives under NRS 90.330 and broker-dealers and sales representatives
            under NRS 90.310, through Web CRD/IARD. A representative is a person; InvestorTrustHub does not publish a Nevada
            representative directory, and representatives are never added to firm counts. Verify a representative or adviser
            on <a href={snap.iar.verifyUrl}>IAPD</a> and a broker-dealer or sales representative on{' '}
            <a href={snap.brokerDealer.verifyUrl}>BrokerCheck</a>. A Nevada-only broker-dealer or sales-representative bulk
            roster was not acquired. Transfer agents and athlete agents are separate Securities Division classes and are not
            counted here.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-division-title">
        <div className="th-shell">
          <h2 id="nv-division-title">Securities Division</h2>
          <p>
            Under <a href={fw.statuteUrl}>NRS Chapter 90</a>, the Division is {fw.division.replace(' (NRS 90.230)', '')}{' '}
            (NRS 90.230), and the Administrator is {fw.administrator.replace(' (NRS 90.215)', '')} (NRS 90.215). The
            Division licenses and examines firms and individuals, investigates possible violations and takes investor
            complaints. FINRA operates CRD and IARD; it is not the Nevada regulator. Statute retrieved{' '}
            {fw.statuteRetrievedAt.slice(0, 10)}.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-enforcement-title">
        <div className="th-shell">
          <h2 id="nv-enforcement-title">Enforcement</h2>
          <p>
            NRS 90.620 and 90.630 give the Administrator investigation and order powers, including consent orders and
            summary orders to cease and desist. The Division&apos;s <a href={e.divisionHome}>website</a> rejected automated
            access and a normal browser session on {e.accessCheckedAt.slice(0, 10)}, so no Nevada order listing was
            acquired. This page shows no Nevada order count, and nothing is attached to any firm or person, by CRD or by
            name. Orders from other Nevada agencies (Financial Institutions, Mortgage Lending, Gaming Control, the Attorney
            General) are not substituted. Regulatory disclosures, including state actions, appear on each firm and person
            record on IAPD and BrokerCheck.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-complaints-title">
        <div className="th-shell">
          <h2 id="nv-complaints-title">Complaints</h2>
          <p>
            The Division investigates written investor complaints. No provider-level complaint dataset is published, so this
            page has no complaint count, and complaint outcomes are not public in bulk. A complaint is not an order or a
            finding.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nv-limits-title">
        <div className="th-shell">
          <h2 id="nv-limits-title">Limitations</h2>
          <ul>
            <li>Do not add state IA + ERA + notice + principal office, or advisers + representatives + broker-dealers.</li>
            <li>There is no single Nevada source date: state IA and ERA {ia.sourceAsOf}, notice {notice.sourceAsOf}, principal-office roster {snap.nationalOverlay.sourceAsOf}.</li>
            <li>Securities Division orders were not acquired. Missing is not zero, and not a clean record.</li>
            <li>Las Vegas, Reno, Henderson and other cities are geography, not InvestorTrustHub intelligence routes.</li>
            <li>Securities offering registrations, exemptions and crowdfunding were not acquired.</li>
            <li>No Trust Score. No AggregateRating. No ranking. No investment advice.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
