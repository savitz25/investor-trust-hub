import Link from 'next/link';
import { TN_PUBLIC_SNAPSHOT, tnPrincipalOfficeCountFromNationalRoster } from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = TN_PUBLIC_SNAPSHOT;

const ARCHIVE_LABELS: Record<string, string> = {
  CONSENT_ORDER: 'Consent Order',
  CEASE_AND_DESIST_ORDER: 'Cease and Desist Order',
  FINAL_ADMINISTRATIVE_ORDER: 'Final Administrative Order',
  INITIAL_ORDER: 'Initial Order',
};

type Recent = (typeof snap.enforcement.recent)[number];

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

function OrderList({ rows }: { rows: Recent[] }) {
  return (
    <ul>
      {rows.map((item) => (
        <li key={item.id}>
          {item.caption} · {item.orderDate} ·{' '}
          {item.documents.map((doc, index) => (
            <span key={doc.url}>
              {index ? ' · ' : ''}
              <a href={doc.url}>{index ? 'another copy' : ARCHIVE_LABELS[item.archive]}</a>
            </span>
          ))}
          {item.exactFirmCrds.length ? (
            <>
              {' '}
              · exact firm CRD printed in the order:{' '}
              {item.exactFirmCrds.map((crd) => (
                <a key={crd} href={`https://adviserinfo.sec.gov/firm/summary/${crd}`}>
                  CRD {crd}
                </a>
              ))}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TennesseeStateIntelligence() {
  const overlayCount = tnPrincipalOfficeCountFromNationalRoster();
  const e = snap.enforcement;
  const id = e.identifierPass;
  const consent = e.recent.filter((r) => r.archive === 'CONSENT_ORDER');
  const cd = e.recent.filter((r) => r.archive === 'CEASE_AND_DESIST_ORDER');
  const other = e.recent.filter((r) => r.archive !== 'CONSENT_ORDER' && r.archive !== 'CEASE_AND_DESIST_ORDER');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Tennessee', path: '/tennessee' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Tennessee Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/tennessee',
        description:
          'Tennessee Securities Division, IAPD Tennessee state IA, ERA, notice filings, principal-office overlay, and the Consent Order and Cease and Desist Order archives. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Tennessee investor state intelligence',
        description: 'Separate Tennessee IAPD lenses and Securities Division order archives. Not a combined adviser total.',
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

      <section className="ith-intel-section" aria-labelledby="tn-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Tennessee</p>
          <h1 id="tn-title">Tennessee Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Securities Division of the Tennessee Department of Commerce &amp; Insurance is the state securities regulator
            under the Tennessee Securities Act of 1983. IARD and CRD are filing infrastructure; IAPD and BrokerCheck are
            public research tools. None of them is the regulator. A Tennessee state-registered adviser is not an
            SEC-registered adviser with a Tennessee notice filing, not an exempt reporting adviser, and not simply a firm
            with a Tennessee office. A representative is a person, not a firm. A broker-dealer is not an investment adviser.
            Consent Orders and Cease and Desist Orders are separate archives. There is no combined Tennessee adviser total.
            This page does not rank advisers, give investment advice, or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Tennessee-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="tn-record-title">IAPD Tennessee state IA · ERA · Notice · Principal office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD Tennessee state IA (APPROVED)</h3>
              <p className="ith-kicker">Distinct firm CRDs with StateRgstn/Rgltr/@Cd=TN and status APPROVED.</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = TN"
                calculation={`${snap.stateRia.registrationRows} TN StateRgstn rows: ${snap.stateRia.approvedDistinctCrd} APPROVED, ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST (termination requested), ${snap.stateRia.condrestDistinctCrd} CONDREST. Filter is Rgltr/@Cd=TN, not address; ${snap.stateRia.principalOfficeTnAmongStateIa} of the ${snap.stateRia.distinctFirmCrd} list a Tennessee main office.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>State ERA</h3>
              <p className="ith-kicker">Exempt reporting advisers reporting to Tennessee. Not state-registered IA.</p>
              <Trace
                source={snap.stateEra.source}
                sourceDate={snap.stateEra.sourceAsOf}
                coverage={snap.stateEra.STATE_ERA_REPORTING}
                grain="ERA/Rgltr/@Cd=TN"
                calculation={`${snap.stateEra.distinctFirmCrd} distinct firm CRDs, all ACTIVE; overlap with Tennessee state IA = ${snap.stateEra.overlapWithStateIa}.`}
                caveat={snap.stateEra.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC-registered advisers with a Tennessee notice filing. Not state IA.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=TN and status FILED"
                calculation={`${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs. Exact CRD overlap with APPROVED state IA = ${snap.federalNotice.overlapApprovedStateIa}. ${snap.federalNotice.noticeFiledWithTnPrincipalOffice} notice filers list a Tennessee main office.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Principal office</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a Tennessee principal office. Not registration.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region TN = ${overlayCount}. Raw 2026-09-17 compilation MainAddr/@State=TN = ${snap.nationalOverlay.rawCompilationMainAddrTn}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-classes-title">
        <div className="th-shell">
          <h2 id="tn-classes-title">Representatives, broker-dealers and agents stay separate</h2>
          <p>
            Investment adviser representatives register on Form U4 through Web CRD/IARD. A representative is a person;
            InvestorTrustHub does not publish a Tennessee representative directory, and representatives are never added to
            firm counts. Broker-dealers and their agents are verified through CRD and{' '}
            <a href={snap.brokerDealer.verifyUrl}>BrokerCheck</a>. A Tennessee-only broker-dealer or agent bulk roster was
            not acquired. The Division&apos;s <a href={snap.records.sourceUrl}>Investment Adviser/Broker-Dealer Check</a>{' '}
            points to the same public tools.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-consent-title">
        <div className="th-shell">
          <h2 id="tn-consent-title">Consent Orders</h2>
          <p>
            The Division&apos;s <a href={e.archivePages.CONSENT_ORDER}>Consent Orders archive</a> lists{' '}
            {e.consentOrders.listings} orders from {e.consentOrders.yearsListed?.[0]} to{' '}
            {e.consentOrders.yearsListed?.[1]} ({e.consentOrders.listingsSince2012} since 2012), linking{' '}
            {e.consentOrders.documents} documents; some orders are posted twice (a signed copy and an accessible copy). A
            listing is not a unique matter: the archive prints no docket number. Relief amounts are not totaled.
          </p>
          <h3>2024 to 2026</h3>
          <OrderList rows={consent} />
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-cd-title">
        <div className="th-shell">
          <h2 id="tn-cd-title">Cease and Desist Orders</h2>
          <p>
            The separate <a href={e.archivePages.CEASE_AND_DESIST_ORDER}>Cease and Desist Orders archive</a> lists{' '}
            {e.ceaseAndDesistOrders.listings} orders from {e.ceaseAndDesistOrders.yearsListed?.[0]} to{' '}
            {e.ceaseAndDesistOrders.yearsListed?.[1]} ({e.ceaseAndDesistOrders.listingsSince2012} since 2012). Some are
            ex parte or petition orders. A cease and desist order says what it says; it is not treated here as a final
            finding, and it is not added to Consent Orders.
          </p>
          <h3>2024 to 2026</h3>
          <OrderList rows={cd} />
          <p>
            The Division also publishes {e.finalAdministrativeOrders.listings} Final Administrative Orders and{' '}
            {e.initialOrders.listings} Initial Order as their own archives. They are counted separately and not merged
            with the lists above.
          </p>
          {other.length ? <OrderList rows={other} /> : null}
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-links-title">
        <div className="th-shell">
          <h2 id="tn-links-title">How orders connect to firms</h2>
          <p>
            An order is linked to a firm only when the order itself prints a firm CRD that is a firm in the accepted IAPD
            compilation, and the firm&apos;s IAPD name appears in the order&apos;s caption. The name is a check, never the
            match. For the {id.listingsRead} Consent and Cease and Desist listings from 2024 to 2026, the first posted
            document was read for printed identifiers. {id.listingsWithAnyCrdPrinted} print at least one CRD; most are
            person CRDs or broker-dealer CRDs outside the adviser feeds, which are counted but not published.{' '}
            {id.imageOnlyNotOcrd} are scanned images and were not read. {e.TN_ENFORCEMENT_EXACT_CRD_LINKS} orders link to
            an adviser firm by exact CRD; {id.iapdFirmCrdsPrintedNotRespondent} printed firm CRD belongs to another firm
            named in the order and is not linked. Every other order stands alone. Older orders were not read.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-complaints-title">
        <div className="th-shell">
          <h2 id="tn-complaints-title">Complaints</h2>
          <p>
            The Division takes investor complaints through its{' '}
            <a href={snap.complaints.sourceUrl}>Securities / Investments complaint form</a>. No provider-level complaint
            dataset is published, so this page has no complaint count, and none is derived from the order archives. A
            complaint is not an order or a finding.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tn-not-title">
        <div className="th-shell">
          <h2 id="tn-not-title">What this page does not mean</h2>
          <ul>
            <li>Do not add state IA + ERA + notice + principal office, or advisers + representatives + broker-dealers + agents.</li>
            <li>Consent Orders, Cease and Desist Orders, Final Administrative Orders and Initial Orders are not one violation count.</li>
            <li>Nashville, Memphis, Knoxville and Chattanooga are geography, not InvestorTrustHub intelligence routes.</li>
            <li>Securities offering registrations were not acquired. Missing is not zero.</li>
            <li>No Trust Score. No AggregateRating. No ranking. No investment advice.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
