import Link from 'next/link';
import { MN_PUBLIC_SNAPSHOT, mnPrincipalOfficeCountFromNationalRoster } from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = MN_PUBLIC_SNAPSHOT;

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

export function MinnesotaStateIntelligence() {
  const overlayCount = mnPrincipalOfficeCountFromNationalRoster();
  const ia = snap.stateRia;
  const era = snap.stateEra;
  const notice = snap.federalNotice;
  const e = snap.enforcement;
  const fw = snap.divisionFramework;
  const years = Object.entries(e.securitiesScopeByYear)
    .map(([y, v]) => `${y}: ${v}`)
    .join(' · ');
  const textLayerOrders = e.actions.filter((a) => a.orderDocumentTextLayer);
  const textLayerDocument = textLayerOrders.length === 1 ? textLayerOrders[0]!.document : null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Minnesota', path: '/minnesota' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Minnesota Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/minnesota',
        description:
          'Minnesota Department of Commerce Securities Unit, IAPD Minnesota state IA, ERA, notice filings, principal-office overlay and CARDS securities actions. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Minnesota investor state intelligence',
        description: 'Separate Minnesota IAPD lenses and Commerce securities actions on their own source dates. Not a combined adviser total.',
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

      <section className="ith-intel-section" aria-labelledby="mn-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Minnesota</p>
          <h1 id="mn-title">Minnesota Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Securities Unit of the Minnesota Department of Commerce is the state securities regulator under the
            Minnesota Uniform Securities Act (Minn. Stat. ch. 80A). IARD and CRD are filing infrastructure; IAPD and
            BrokerCheck are public research tools. None of them is the regulator. A Minnesota state investment adviser is not
            an SEC-registered adviser with a Minnesota notice filing, not an exempt reporting adviser, and not simply a firm
            with a Minnesota office. A representative or agent is a person, not a firm. A broker-dealer is not an investment
            adviser. There is no combined Minnesota adviser total. This page does not rank advisers, give investment advice,
            or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Minnesota-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={ia.verifyUrl}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-ia-title">
        <div className="th-shell">
          <h2 id="mn-ia-title">Minnesota State Investment Advisers</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{ia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>IAPD Minnesota state IA (APPROVED)</h3>
              <p className="ith-kicker">Distinct firm CRDs with StateRgstn/Rgltr/@Cd=MN and status APPROVED.</p>
              <Trace
                source={ia.officialUrl}
                sourceDate={ia.sourceAsOf}
                coverage={ia.STATE_RIA_BULK_ROSTER}
                grain="state investment adviser firm; registration jurisdiction = MN"
                calculation={`${ia.registrationRows} MN StateRgstn rows: ${ia.approvedDistinctCrd} APPROVED, ${ia.termrequestDistinctCrd} TERMREQUEST (termination requested), ${ia.condrestDistinctCrd} CONDREST. Filter is Rgltr/@Cd=MN, not address; ${ia.principalOfficeMnAmongStateIa} of the ${ia.distinctFirmCrd} list a Minnesota main office.`}
                caveat={ia.caveat}
              />
            </article>
          </div>
          <p>
            Minnesota registers investment advisers under Minn. Stat. 80A.58; firms file Form ADV on IARD. IAPD records the
            credential with the status text APPROVED, which is not an endorsement. The {ia.termrequestDistinctCrd} firms with
            termination requested are reported separately and not counted as current.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-era-title">
        <div className="th-shell">
          <h2 id="mn-era-title">Exempt Reporting Advisers</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{era.activeDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Minnesota exempt reporting advisers</h3>
              <p className="ith-kicker">ERA/Rgltr/@Cd=MN, ACTIVE. Not a Minnesota-registered IA and not an SEC RIA.</p>
              <Trace
                source={era.source}
                sourceDate={era.sourceAsOf}
                coverage={era.STATE_ERA_REPORTING}
                grain={era.filter}
                calculation={`${era.distinctFirmCrd} distinct firm CRDs, all ACTIVE; overlap with Minnesota state IA = ${era.overlapWithStateIa}.`}
                caveat={`${era.caveat} ${era.statute}; reporting is not registration.`}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-notice-title">
        <div className="th-shell">
          <h2 id="mn-notice-title">Federal Notice Filings</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{notice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>SEC-registered advisers with a Minnesota notice filing</h3>
              <p className="ith-kicker">NoticeFiled/States/@RgltrCd=MN, FILED. Not Minnesota state IA.</p>
              <Trace
                source={notice.officialUrl}
                sourceDate={notice.sourceAsOf}
                coverage={notice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain={`${notice.filter} and status FILED`}
                calculation={`${notice.noticeFiledDistinctCrd} distinct CRDs, all SEC-registered. ${notice.noticeFiledWithMnPrincipalOffice} notice filers list a Minnesota main office. Exact CRD intersection with APPROVED state IA = ${notice.overlapApprovedStateIa} (${notice.overlapApprovedStateIaCrds.join(', ')}). That intersection is a cross-clock comparison of ${ia.sourceAsOf} and ${notice.sourceAsOf}, not a combined total.`}
                caveat={`${notice.caveat} ${notice.acceptedFeedNote}`}
              />
            </article>
          </div>
          <p>
            This count comes from the {notice.sourceAsOf} SEC compilation ({notice.statute}); the state IA and ERA counts come
            from the {ia.sourceAsOf} state compilation. They are different source dates and are never added.
          </p>
          <p>
            {notice.overlapApprovedStateIa} exact firm CRDs ({notice.overlapApprovedStateIaCrds.join(', ')}) appear in both
            the {ia.sourceAsOf} Minnesota APPROVED state-IA set and the {notice.sourceAsOf} Minnesota FILED federal-notice
            set. This is an exact CRD intersection and a cross-clock comparison. It is not a deduped Minnesota adviser total.
            Do not add these {notice.overlapApprovedStateIa} CRDs to, or subtract them from, the{' '}
            {ia.approvedDistinctCrd.toLocaleString('en-US')} or the {notice.noticeFiledDistinctCrd.toLocaleString('en-US')} to
            manufacture another denominator.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-po-title">
        <div className="th-shell">
          <h2 id="mn-po-title">Principal Office</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>SEC/IARD roster firms with a Minnesota principal office</h3>
              <p className="ith-kicker">Geography only. Not Minnesota registration and not a notice filing.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region MN = ${overlayCount}. Raw ${notice.sourceAsOf} compilation MainAddr/@State=MN = ${snap.nationalOverlay.rawCompilationMainAddrMn}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-iar-title">
        <div className="th-shell">
          <h2 id="mn-iar-title">IAR</h2>
          <p>
            An investment adviser representative registers with Commerce by filing Form U4 on CRD (Minn. Stat. 80A.58 and
            80A.61). A representative is a person with a person CRD, which is never a firm CRD. InvestorTrustHub does not
            publish a Minnesota representative directory, and representatives are never added to firm counts. Verify a
            representative on <a href={snap.iar.verifyUrl}>IAPD</a>.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-bd-title">
        <div className="th-shell">
          <h2 id="mn-bd-title">Broker-Dealers / Agents</h2>
          <p>
            Broker-dealers and their agents must be registered or exempt under Minn. Stat. 80A.56 and 80A.57 and apply through
            CRD. A broker-dealer is a firm and is not an investment adviser; an agent is a person and is not an investment
            adviser representative. Verify either on <a href={snap.brokerDealer.verifyUrl}>BrokerCheck</a>. A Minnesota-only
            broker-dealer or agent bulk roster was not acquired, so this page has no broker-dealer or agent count.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-unit-title">
        <div className="th-shell">
          <h2 id="mn-unit-title">Minnesota Commerce Securities Unit</h2>
          <p>
            The {fw.regulator} administers <a href={fw.statuteUrl}>{fw.statute}</a> and{' '}
            <a href={fw.rules.url}>{fw.rules.name}</a> for the {fw.administrator}. Its programs include investment advisers
            and representatives, broker-dealers and agents, securities offerings, franchises, subdivided land and timeshares,
            and MNvest. FINRA operates CRD and IARD; it is not the Minnesota regulator. Statute retrieved{' '}
            {fw.statuteRetrievedAt.slice(0, 10)}. Minnesota&apos;s Safe Senior Financial Protection Act is regulatory context
            only; referrals are not counted as enforcement.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-enforcement-title">
        <div className="th-shell">
          <h2 id="mn-enforcement-title">Enforcement</h2>
          <p>
            From Commerce&apos;s <a href={e.cardsHome}>CARDS</a> index, industry type Securities, signed {e.firstSignedDate}{' '}
            through {e.lastSignedDate} (retrieved {e.retrievedAt.slice(0, 10)}; PARTIAL): {e.rows} actions. {e.securitiesScopeRows}{' '}
            are securities matters ({years}); {e.otherSecuritiesUnitProgramRows} belong to other Securities Unit programs
            (subdivided land, timeshares) or a lending licence and are labelled, not counted as securities. Action types are
            shown as Commerce lists them; a consent order is a settlement and is not by itself an adjudicated finding. Each
            row is one Commerce document, not a unique matter. {e.orderDocumentsWithoutTextLayer} of {e.rows} order PDFs have
            no usable text layer. The remaining text-layer PDF{textLayerDocument ? ` (${textLayerDocument})` : ''} was not read.
            OCR was not run, so identifiers inside the order documents were not acquired.{' '}
            {e.MN_ENFORCEMENT_EXACT_CRD_LINKS} rows print a firm CRD that matches an IAPD
            firm; nothing is attached to a firm or person by name. Mortgage, insurance, banking, Attorney General, and court
            actions are not substituted.
          </p>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Minnesota Commerce securities actions">
            <table className="ith-table">
              <caption>Commerce CARDS, industry type Securities. Respondents as listed; not findings unless the order says so.</caption>
              <thead>
                <tr>
                  <th scope="col">Signed</th>
                  <th scope="col">Respondent (as listed)</th>
                  <th scope="col">Action type</th>
                  <th scope="col">Allegation (as listed)</th>
                  <th scope="col">Document</th>
                </tr>
              </thead>
              <tbody>
                {e.actions.map((a) => (
                  <tr key={a.document}>
                    <td>{a.signedDate}</td>
                    <th scope="row">
                      {a.respondentAsListed}
                      {a.scope !== 'securities' ? <span className="ith-kicker"> · {a.scopeNote}</span> : null}
                    </th>
                    <td>{a.actionTypeAsListed}</td>
                    <td>{a.allegationAsListed.replace(/ \|\| /g, '; ')}</td>
                    <td>
                      <a href={a.documentUrl}>{a.document}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-complaints-title">
        <div className="th-shell">
          <h2 id="mn-complaints-title">Complaints</h2>
          <p>
            Commerce takes investor complaints; its <a href={snap.complaints.intakeUrl}>complaint form</a> lists Securities as
            a complaint type. No provider-level complaint dataset is published, so this page has no complaint count, and
            complaint outcomes are not public in bulk. A complaint is not an order or a finding.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="mn-limits-title">
        <div className="th-shell">
          <h2 id="mn-limits-title">Limitations</h2>
          <ul>
            <li>Do not add state IA + ERA + notice + principal office, or advisers + representatives + broker-dealers + agents.</li>
            <li>
              The {notice.overlapApprovedStateIa} exact-CRD cross-clock overlap is a relationship between the {ia.sourceAsOf}{' '}
              state-IA lens and the {notice.sourceAsOf} notice lens. It is not another census.
            </li>
            <li>There is no single Minnesota source date: state IA and ERA {ia.sourceAsOf}, notice {notice.sourceAsOf}, principal-office roster {snap.nationalOverlay.sourceAsOf}, Commerce actions by signed date.</li>
            <li>CARDS actions before 2022, order text, and other industry types were not acquired. Missing is not zero, and not a clean record.</li>
            <li>Minneapolis, St. Paul, Rochester, Duluth and other cities are geography, not InvestorTrustHub intelligence routes.</li>
            <li>Securities offering registrations, MNvest, franchises and subdivided land were not acquired as rosters.</li>
            <li>No Trust Score. No AggregateRating. No ranking. No investment advice.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
