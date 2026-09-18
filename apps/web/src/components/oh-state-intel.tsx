import Link from 'next/link';
import {
  OH_PUBLIC_SNAPSHOT,
  ohPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = OH_PUBLIC_SNAPSHOT;

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

export function OhioStateIntelligence() {
  const overlayCount = ohPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Ohio', path: '/ohio' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Ohio Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/ohio',
        description:
          'Ohio Division of Securities, IAPD Ohio state IA, ERA, notice filings, and principal-office overlay. NOH is not a final order. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Ohio investor state intelligence',
        description: 'Separate Ohio IAPD lenses. Not a combined adviser total.',
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

      <section className="ith-intel-section" aria-labelledby="oh-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Ohio</p>
          <h1 id="oh-title">Ohio Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Ohio Department of Commerce Division of Securities is the state securities regulator under the Ohio
            Securities Act (Chapter 1707). IARD is filing infrastructure. IAPD is public adviser research. Ohio
            separately licenses investment adviser firms and investment adviser representative persons. State IA is not
            a federal-covered notice filing, not ERA, and not a principal office. Dealer is not IA. Salesperson is not
            IAR. A Notice of Opportunity for Hearing is not a final order. The Division warns its online final-order
            search may not retrieve all responsive documents. Complaint intake is not a complaint census. Missing is not
            zero. There is no combined Ohio adviser total. This page does not rank advisers or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Ohio-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="oh-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="oh-record-title">IAPD Ohio state IA · ERA · Notice · Principal office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD Ohio state IA (APPROVED)</h3>
              <p className="ith-kicker">Hero grain: distinct firm CRDs with StateRgstn/Rgltr/@Cd=OH and status APPROVED.</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = OH"
                calculation={`${snap.stateRia.registrationRows} OH StateRgstn rows; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=OH, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Ohio state ERA reporting firms. ERA is not an Ohio licensed state IA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="ERA/Rgltr/@Cd=OH"
                calculation={`${snap.stateEra.distinctFirmCrd} distinct firm CRDs; overlap with Ohio state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">Federal-covered notice filings in Ohio. Not state IA.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=OH and status FILED"
                calculation={`${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Principal office</h3>
              <p className="ith-kicker">SEC/IARD roster firms with an Ohio principal office. Not registration.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region OH = ${overlayCount}. Raw compilation MainAddr=@State=OH = ${snap.nationalOverlay.rawCompilationMainAddrOh}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="oh-star-title">
        <div className="th-shell">
          <h2 id="oh-star-title">STAR Filing Search is not an IA census</h2>
          <p>
            Ohio STAR / ERNIE Filing Search covers securities offering registration, exemption, and notice filings. That
            is not a complete investment-adviser or IAR license roster. Records-request forms prove dealer, salesperson,
            IA, and IAR files exist; they do not create a machine-readable public bulk universe. STAR IA roster status:{' '}
            {snap.star.OH_STAR_IA_ROSTER_STATUS}. Search-only is not zero.
          </p>
          <p>
            <a href={snap.divisionFramework.starUrl}>STAR / ERNIE portal</a>
            {' · '}
            <a href={snap.divisionFramework.recordsRequestUrl}>Records request</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="oh-classes-title">
        <div className="th-shell">
          <h2 id="oh-classes-title">IAR, dealer, and salesperson stay separate</h2>
          <p>
            IAR is a person class ({snap.iar.OH_IAR_ROSTER_STATUS}). Dealer firms ({snap.brokerDealer.OH_DEALER_ROSTER_STATUS})
            are not investment advisers. Salespersons ({snap.brokerDealer.OH_SALESPERSON_ROSTER_STATUS}) are not IARs. Do
            not add these classes to the {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')} APPROVED state-IA
            firm CRDs.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="oh-enf-title">
        <div className="th-shell">
          <h2 id="oh-enf-title">Division Orders: NOH is not a final finding</h2>
          <p>
            The Division Orders system distinguishes a Notice of Opportunity for Hearing from a Final Order. NOH is an
            allegation / opportunity for hearing. It is not a final determination. A Final Order is the Division&apos;s
            final disposition of the administrative matter. The Division warns that its current online order search may
            not retrieve all responsive documents, so an online result count is not a complete historical enforcement
            census. Monthly Enforcement Actions and Securities Bulletins may summarize the same Order Number — do not
            double-count. All Ohio securities orders are mixed-class and are not an IA discipline census. Exact CRD
            attachments in this freeze: {snap.enforcement.OH_ENFORCEMENT_EXACT_CRD_ATTACHMENTS}. Name-only is unsafe. A
            charge is not a conviction. An administrative final order is not a criminal conviction. Unique matter IDs are
            unknown — not zero.
          </p>
          <p>
            <a href={snap.divisionFramework.ordersUrl}>Ohio Division Orders</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="oh-not-title">
        <div className="th-shell">
          <h2 id="oh-not-title">What this page does not mean</h2>
          <ul>
            <li>Do not add state IA + ERA + notice + principal office, or IA + IAR + dealer + salesperson.</li>
            <li>Columbus and Cleveland are not InvestorTrustHub intelligence routes.</li>
            <li>Complaint intake is not a complaint census. Historical orders do not override current IAPD status.</li>
            <li>Search-only is not zero. No Trust Score. No AggregateRating. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
