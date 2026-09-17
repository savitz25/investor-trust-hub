import Link from 'next/link';
import {
  NC_PUBLIC_SNAPSHOT,
  ncPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = NC_PUBLIC_SNAPSHOT;

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

export function NorthCarolinaStateIntelligence() {
  const overlayCount = ncPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'North Carolina', path: '/north-carolina' },
      ]),
      {
        '@type': 'WebPage',
        name: 'North Carolina Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/north-carolina',
        description:
          'NC SOS IA/IAR/BD/AG registers, IAPD North Carolina state IA, ERA, notice filings, and principal-office overlay. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'North Carolina investor state intelligence',
        description: snap.sosRegisters.do_not_add_classes
          ? 'Separate NC SOS and IAPD lenses. Not a combined adviser total.'
          : 'North Carolina investor state intelligence',
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

      <section className="ith-intel-section" aria-labelledby="nc-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · North Carolina</p>
          <h1 id="nc-title">North Carolina Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The North Carolina Secretary of State Securities Division is the state securities regulator. IARD is
            filing infrastructure. IAPD is public adviser research. Official NC registers cover investment advisers
            (IA), investment adviser representatives (IAR), broker-dealers (BD), and securities agents (AG — not the
            Attorney General). Firm is not person. State IA is not ERA, not a federal notice filing, and not a
            principal office. CRD is the core identity. A summary cease and desist is not a final finding. A charge is
            not a conviction. Missing is not zero. There is no combined North Carolina adviser total. This page does
            not rank advisers or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research North Carolina-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nc-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="nc-record-title">NC SOS IA register · IAPD state IA · ERA · Notice · Principal office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">
                {snap.sosRegisters.NC_SOS_IA_DISTINCT_CRDS.toLocaleString('en-US')}
              </p>
              <h3>Current NC state IA register — distinct firm CRDs</h3>
              <p className="ith-kicker">
                Official Register of NC IAs, current as of {snap.sosRegisters.NC_SOS_REGISTER_SOURCE_AS_OF}. Not IARs,
                BDs, or agents.
              </p>
              <Trace
                source={snap.stateRia.sosRegistersUrl}
                sourceDate={snap.sosRegisters.NC_SOS_REGISTER_SOURCE_AS_OF}
                coverage="Official NC SOS downloadable IA register"
                grain="firm CRD on the Register of NC IAs"
                calculation={`${snap.sosRegisters.NC_SOS_IA_ROWS} line-start CRD rows; ${snap.sosRegisters.NC_SOS_IA_DISTINCT_CRDS} distinct firm CRDs; missing CRD ${snap.sosRegisters.NC_SOS_IA_MISSING_CRD}.`}
                caveat="May 20, 2026 page copy is superseded. Live PDFs say 6/30/26. Retrieval is not sourceAsOf."
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD NC state IA (APPROVED)</h3>
              <p className="ith-kicker">Complementary IARD/IAPD lens. Different clock from the SOS register.</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = NC"
                calculation={`${snap.stateRia.registrationRows} NC StateRgstn rows; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=NC, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">North Carolina state ERA reporting firms. ERA is not an RIA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="ERA/Rgltr/@Cd=NC"
                calculation={`${snap.stateEra.distinctFirmCrd} distinct firm CRDs; overlap with NC state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">Federal-covered notice filings in North Carolina. Not state IA.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=NC and status FILED"
                calculation={`${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Principal office</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a North Carolina principal office. Not registration.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region NC = ${overlayCount}. Raw compilation MainAddr=@State=NC = ${snap.nationalOverlay.rawCompilationMainAddrNc}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nc-recon-title">
        <div className="th-shell">
          <h2 id="nc-recon-title">NC SOS IA register vs IAPD — exact CRD</h2>
          <p>
            Exact CRD overlap {snap.reconciliation.EXACT_NC_SOS_IA_TO_IAPD_CRDS.toLocaleString('en-US')}. SOS-only{' '}
            {snap.reconciliation.NC_SOS_ONLY_CRDS}. IAPD-only {snap.reconciliation.IAPD_NC_STATE_IA_ONLY_CRDS}.{' '}
            {snap.reconciliation.clockNote} Do not add the populations.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nc-classes-title">
        <div className="th-shell">
          <h2 id="nc-classes-title">IAR, broker-dealer, and AG stay separate</h2>
          <p>
            Register of NC IARs: {snap.sosRegisters.NC_SOS_IAR_DISTINCT_CRDS.toLocaleString('en-US')} person CRDs. IAR
            is not an IA firm. Register of NC BDs: {snap.sosRegisters.NC_SOS_BD_DISTINCT_CRDS.toLocaleString('en-US')}{' '}
            firm CRDs — not investment advisers. Register of NC AGs:{' '}
            {snap.sosRegisters.NC_SOS_AG_DISTINCT_CRDS.toLocaleString('en-US')} securities-agent person CRDs — not the
            Attorney General and not BD companies.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nc-enf-title">
        <div className="th-shell">
          <h2 id="nc-enf-title">Criminal enforcement and administrative actions</h2>
          <p>
            NC SOS publishes a year-navigated catalog ({snap.enforcement.NC_SECURITIES_ENFORCEMENT_YEAR_MIN}–
            {snap.enforcement.NC_SECURITIES_ENFORCEMENT_YEAR_MAX} populated; {snap.enforcement.NC_SECURITIES_ENFORCEMENT_DOCUMENTS}{' '}
            HTML entries). It is mixed securities-class, not an IA census. A summary cease and desist is issued before
            respondents answer; it is not a final finding. A later final order may confirm allegations if no hearing is
            requested. Administrative orders are not criminal convictions. Charge, indictment, plea, and conviction are
            different stages. Exact CRD attachments in this freeze:{' '}
            {snap.enforcement.NC_ENFORCEMENT_EXACT_CRD_ATTACHMENTS}. Name-only is unsafe. Unique matter IDs are unknown
            — not zero.
          </p>
          <p>
            <a href={snap.sosFramework.enforcementUrl}>NC SOS Criminal Enforcement &amp; Administrative Actions</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nc-not-title">
        <div className="th-shell">
          <h2 id="nc-not-title">What this page does not mean</h2>
          <ul>
            <li>Do not add IA + IAR + BD + AG, or state IA + ERA + notice + principal office.</li>
            <li>Charlotte and Raleigh are not InvestorTrustHub intelligence routes.</li>
            <li>Complaint intake is not a complaint census. Exam guidance is not exam-result counts.</li>
            <li>Search-only is not zero. No Trust Score. No ranking.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
