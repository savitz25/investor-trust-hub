import Link from 'next/link';
import {
  CO_PUBLIC_SNAPSHOT,
  coPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = CO_PUBLIC_SNAPSHOT;

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

export function ColoradoStateIntelligence() {
  const overlayCount = coPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Colorado', path: '/colorado' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Colorado Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/colorado',
        description:
          'SEC/IARD Colorado principal-office overlay, IAPD Colorado state-registered investment-adviser firms, and Colorado Division of Securities verification paths. Not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Colorado investor state intelligence',
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

      <section className="ith-intel-section" aria-labelledby="co-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Colorado</p>
          <h1 id="co-title">Colorado Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            This page organizes separate Colorado research lenses: SEC/IARD firms with a Colorado principal office,
            Colorado state-registered investment-adviser firms from the IAPD state compilation, federal-covered
            Colorado notice filings, and official Colorado Division of Securities verification paths. It does not rank
            advisers, score firms, or publish a Trust Score. A Colorado principal office is not Colorado state
            registration.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research CO-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify a license
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="co-record-title">Universe · Current · Notice · Observations · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD roster firms with a Colorado principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation / reconciled roster geography"
                sourceDate={snap.nationalOverlay.sourceAsOf}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region CO = ${overlayCount}. Same-source national roster = ${snap.nationalOverlay.universe.toLocaleString('en-US')}; resolved geography = ${snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}; unresolved = ${snap.nationalOverlay.unresolvedPrincipalOfficeRegions.toLocaleString('en-US')}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Colorado state-registered investment-adviser firms (IAPD state compilation, APPROVED).</p>
              <Trace
                source={snap.stateRia.officialUrl}
                sourceDate={snap.stateRia.sourceAsOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered investment adviser firm; registration jurisdiction = CO"
                calculation={`${snap.stateRia.registrationRows} Colorado StateRgstn rows; ${snap.stateRia.distinctFirmCrd} distinct firm CRDs; ${snap.stateRia.approvedDistinctCrd} APPROVED; ${snap.stateRia.termrequestDistinctCrd} TERMREQUEST. Filter is Rgltr/@Cd=CO, not address.`}
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</p>
              <h3>Notice</h3>
              <p className="ith-kicker">SEC/IARD firms with a Colorado notice filing. Not state-RIA licensure.</p>
              <Trace
                source={snap.federalNotice.source}
                sourceDate={snap.federalNotice.sourceAsOf}
                coverage={snap.federalNotice.FEDERAL_COVERED_NOTICE_ROSTER}
                grain="NoticeFiled/States/@RgltrCd=CO and status FILED"
                calculation={`${snap.federalNotice.noticeRows} notice rows; ${snap.federalNotice.noticeFiledDistinctCrd} distinct CRDs with status FILED. Overlap with approved state IA = ${snap.federalNotice.overlapApprovedStateIa}.`}
                caveat={snap.federalNotice.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.enforcement.sanctionsNarrativeEntries.toLocaleString('en-US')}</p>
              <h3>Observations</h3>
              <p className="ith-kicker">Sanctions narrative entries profiled. Name-only. Not attached to firm profiles.</p>
              <Trace
                source={snap.enforcement.sanctionsUrl}
                sourceDate={snap.enforcement.retrievedAt ?? snap.asOf}
                coverage={snap.enforcement.result}
                grain="dated narrative sanction entry"
                calculation={`${snap.enforcement.sanctionsNarrativeEntries} dated entries; CRDs in static HTML = ${snap.enforcement.rowsWithCrdInRespondentText}; name-only = ${snap.enforcement.rowsNameOnly}. Enforcement table rows extracted = ${snap.enforcement.indexRowsExtracted}. PDFs downloaded = 0.`}
                caveat={snap.enforcement.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceAsOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">IAPD compilations {snap.nationalOverlay.source}. Web indexes retrieved {snap.enforcement.retrievedAt}.</p>
              <Trace
                source="Committed CO-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="co-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="co-findings-title">Colorado evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">FEDERAL GEOGRAPHY</p>
              <h3>
                {overlayCount.toLocaleString('en-US')} SEC/IARD roster firms report a Colorado principal office
              </h3>
              <p>
                That is {snap.nationalOverlay.shareOfResolvedRegionsPct}% of roster firms with a resolved
                principal-office region ({snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}).
                It is not Colorado licensed advisers and not net-new companies.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">STATE RIA LAYER</p>
              <h3>
                {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')} Colorado state-registered
                investment-adviser firms
              </h3>
              <p>
                Selected by IAPD registration jurisdiction CO, not address. {snap.stateRia.registrationRows}{' '}
                registration rows and {snap.stateRia.distinctFirmCrd} distinct firm CRDs stay separate fields.{' '}
                {snap.stateRia.termrequestDistinctCrd} TERMREQUEST row is not counted as approved current. This is not
                the {overlayCount.toLocaleString('en-US')} principal-office overlay.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">CLASS SEPARATION</p>
              <h3>
                National roster: {snap.riaEra.nationalRiaFacts.toLocaleString('en-US')} RIA facts and{' '}
                {snap.riaEra.nationalEraFacts.toLocaleString('en-US')} ERA facts. Colorado state ERA reporting:{' '}
                {snap.stateEra.activeDistinctCrd.toLocaleString('en-US')} firms
              </h3>
              <p>{snap.riaEra.caveat} State ERA reporting is not state RIA.</p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">NOTICE FILING</p>
              <h3>
                {snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')} SEC/IARD firms with a Colorado
                notice filing
              </h3>
              <p>
                Notice-filed is not Colorado state licensure. The credential classes are separate but the source
                populations are not perfectly disjoint; {snap.federalNotice.overlapApprovedStateIa} firm CRDs appear in
                both source-defined sets in the 2026-08-27 compilations.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENFORCEMENT IDENTITY</p>
              <h3>
                {snap.enforcement.sanctionsNarrativeEntries.toLocaleString('en-US')} sanctions narrative entries;{' '}
                {snap.enforcement.rowsNameOnly.toLocaleString('en-US')} are name-only
              </h3>
              <p>
                The enforcement-actions table is JS-rendered and was not extracted. Name-only attachment is unsafe.
                Native action class is not on the static page. PDFs were not downloaded. Action count is not quality.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENTITY GROWTH</p>
              <h3>This ticket adds intelligence, not new canonical firms</h3>
              <p>
                Expansion ledger: net-new canonical organizations {snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS};
                net-new public profiles {snap.expansionLedger.NET_NEW_PUBLIC_INVESTOR_PROFILES}; new state identities{' '}
                {snap.expansionLedger.NEW_STATE_IDENTITIES}; existing organizations enriched{' '}
                {snap.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED}; state registration rows{' '}
                {snap.expansionLedger.NEW_STATE_REGISTRATION_ROWS}; federal notice-filing rows{' '}
                {snap.expansionLedger.NEW_FEDERAL_NOTICE_FILING_ROWS}; exact adverse attachments{' '}
                {snap.expansionLedger.EXACT_ADVERSE_PROFILE_ATTACHMENTS}; rejected unsafe joins{' '}
                {snap.expansionLedger.REJECTED_UNSAFE_JOINS}. Federal overlay is not entity growth.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-find-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Find advisers</p>
          <h2 id="co-find-title">Federal research, state registration, and notice filing stay separate</h2>
          <ul className="ith-plain">
            <li>
              Federal SEC/IARD research:{' '}
              <Link href={snap.nationalOverlay.searchHref}>firms reporting a CO principal office</Link> or{' '}
              <Link href="/firms">any SEC/IARD firm</Link>. Identity is CRD / SEC file number. This list is not the
              Colorado state-registered adviser roster.
            </li>
            <li>
              Colorado state-registered investment-adviser firms: {snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}{' '}
              APPROVED firms in the IAPD state compilation with jurisdiction CO. Verify a named firm on{' '}
              <a href={snap.stateRia.iapdUrl}>SEC IAPD</a> or{' '}
              <a href={snap.stateRia.verifyUrl}>NASAA Verify a License</a>. Do not scrape those search tools.
            </li>
            <li>
              Federal-covered notice filing is a different credential from state licensure. Official Colorado IA/IAR
              path: <a href={snap.stateRia.iaRegistrationUrl}>IA and IAR licensing</a>.
            </li>
            <li>
              Investment adviser representative verification remains person-grain on IAPD. IAR is not the firm. IAR is
              not a salesperson. Search V1 does not resolve person CRD as firm CRD.
            </li>
            <li>
              Broker-dealer / salesperson research remains on{' '}
              <a href={snap.brokerDealer.verifyUrl}>FINRA BrokerCheck</a>. Broker-dealer is not an investment adviser.
              BrokerCheck is not scraped here.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-matrix-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Regulator map</p>
          <h2 id="co-matrix-title">What each credential proves</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Colorado credential matrix">
            <table className="ith-table">
              <caption>SEC RIA is not a state RIA. CRD identity is not current Colorado authority.</caption>
              <thead>
                <tr>
                  <th scope="col">Credential</th>
                  <th scope="col">Regulator</th>
                  <th scope="col">What it proves</th>
                  <th scope="col">What it does not prove</th>
                </tr>
              </thead>
              <tbody>
                {snap.regulatorMatrix.map((row) => (
                  <tr key={row.credential}>
                    <th scope="row">{row.credential}</th>
                    <td>{row.regulator}</td>
                    <td>{row.proves}</td>
                    <td>{row.doesNotProve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-framework-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Registration framework</p>
          <h2 id="co-framework-title">SEC, Colorado Division of Securities, IAR, and broker-dealer stay on separate paths</h2>
          <p>
            This is consumer orientation, not legal advice, and not a calculation of any firm&apos;s registration
            eligibility. {snap.issuer.framework}
          </p>
          <ul className="ith-plain">
            <li>
              Firms that are SEC-registered typically notice-file in Colorado through IARD when Colorado is a
              notice-filing jurisdiction. Official path:{' '}
              <a href={snap.stateRia.iaRegistrationUrl}>investment adviser / IAR licensing and notice filing</a>.
            </li>
            <li>
              Colorado state licensure may apply to advisers that are not SEC-registered. The bulk layer on this page is
              the IAPD state compilation filtered by jurisdiction CO.
            </li>
            <li>
              Individuals who render advisory services generally license as investment adviser representatives. IAR is
              not the firm. Official path: <a href={snap.stateRia.iaRegistrationUrl}>IAR licensing</a>.
            </li>
            <li>
              Broker-dealer and securities salesperson registration is a different credential from investment-adviser
              licensure. Verify BD/salesperson status on BrokerCheck. Do not treat one as the other.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / EFD / Form D</p>
          <h2 id="co-issuer-title">Official Colorado research paths</h2>
          <p>
            {snap.issuer.note} Statute {snap.issuer.statute}.
          </p>
          <ul className="ith-plain">
            <li>
              Securities registration:{' '}
              <a href={snap.issuer.securitiesRegistrationUrl}>Colorado registering securities</a>
            </li>
            <li>
              NASAA EFD: <a href={snap.issuer.efdUrl}>nasaaefd.org</a>
            </li>
            <li>Bulk issuer dataset: {snap.issuer.bulkIssuerDataset}</li>
            <li>
              Federal Form D overlay: {snap.formD.overlay}. {snap.formD.caveat}
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Exam / CE / Form ADV / RAUM</p>
          <h2 id="co-exam-title">Qualification, disclosure, and RAUM stay in their grains</h2>
          <p>{snap.exam.note}</p>
          <p>
            Official examination page: <a href={snap.exam.programPage}>the examination process</a>. IAR CE:{' '}
            <a href={snap.exam.cePage}>continuing-education requirements</a>. Form ADV is a filing, not the firm. RAUM
            is a reported regulatory-assets figure, not investment performance. Investor education stays educational:{' '}
            <a href={snap.investorEducation.url}>Colorado investor resources</a>.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-complaint-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Complaints</p>
          <h2 id="co-complaint-title">A complaint path is not a violation count</h2>
          <p>
            {snap.complaints.caveat} Official path:{' '}
            <a href={snap.complaints.publicResearchPath}>file a complaint</a>.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-contacts-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Public contacts</p>
          <h2 id="co-contacts-title">No Colorado search scrape and no person directory</h2>
          <p>{snap.contacts.policy}</p>
          <p>{snap.contacts.federalPrincipalOfficeAddress}</p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="co-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Colorado evidence depth">
            <table className="ith-table">
              <caption>Coverage describes availability. Missing is unknown, not zero.</caption>
              <thead>
                <tr>
                  <th scope="col">Family</th>
                  <th scope="col">Agency</th>
                  <th scope="col">As of</th>
                  <th scope="col">Grain</th>
                  <th scope="col">Count / rows</th>
                  <th scope="col">Limitations</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">SEC/IARD RIA (national)</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceAsOf}</td>
                  <td>Form ADV / IARD firm fact</td>
                  <td>{snap.riaEra.nationalRiaFacts.toLocaleString('en-US')}</td>
                  <td>National class. Not a Colorado state-RIA count.</td>
                </tr>
                <tr>
                  <th scope="row">ERA (national)</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceAsOf}</td>
                  <td>ERA reporting fact</td>
                  <td>{snap.riaEra.nationalEraFacts.toLocaleString('en-US')}</td>
                  <td>ERA is not an RIA.</td>
                </tr>
                <tr>
                  <th scope="row">CO principal-office overlay</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceAsOf}</td>
                  <td>{snap.nationalOverlay.grain}</td>
                  <td>{overlayCount.toLocaleString('en-US')}</td>
                  <td>{snap.nationalOverlay.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Colorado state-registered IA firms</th>
                  <td>IAPD state compilation</td>
                  <td>{snap.stateRia.sourceAsOf}</td>
                  <td>state-registered IA firm; jurisdiction CO; APPROVED</td>
                  <td>{snap.stateRia.approvedDistinctCrd.toLocaleString('en-US')}</td>
                  <td>{snap.stateRia.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Colorado federal-covered notice filing</th>
                  <td>SEC / IARD</td>
                  <td>{snap.federalNotice.sourceAsOf}</td>
                  <td>NoticeFiled RgltrCd=CO FILED</td>
                  <td>{snap.federalNotice.noticeFiledDistinctCrd.toLocaleString('en-US')}</td>
                  <td>{snap.federalNotice.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Colorado state ERA reporting</th>
                  <td>IAPD state compilation</td>
                  <td>{snap.stateRia.sourceAsOf}</td>
                  <td>ERA/Rgltr/@Cd=CO ACTIVE</td>
                  <td>{snap.stateEra.activeDistinctCrd.toLocaleString('en-US')}</td>
                  <td>ERA reporting is not state RIA and is not an SEC RIA count.</td>
                </tr>
                <tr>
                  <th scope="row">IAR / person</th>
                  <td>IAPD / Colorado Division of Securities</td>
                  <td>{snap.iar.sourceAsOf}</td>
                  <td>person CRD</td>
                  <td>UNKNOWN / not a directory</td>
                  <td>{snap.iar.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Broker-dealer / salesperson</th>
                  <td>FINRA / Colorado Division of Securities</td>
                  <td>n/a</td>
                  <td>official search</td>
                  <td>UNKNOWN</td>
                  <td>{snap.brokerDealer.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Colorado enforcement / sanctions</th>
                  <td>Colorado Division of Securities</td>
                  <td>{snap.enforcement.retrievedAt}</td>
                  <td>narrative index entry</td>
                  <td>{snap.enforcement.sanctionsNarrativeEntries.toLocaleString('en-US')}</td>
                  <td>{snap.enforcement.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Complaints</th>
                  <td>Colorado Division of Securities</td>
                  <td>{snap.asOf}</td>
                  <td>public research path</td>
                  <td>UNKNOWN</td>
                  <td>{snap.complaints.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Issuer / EFD / Form D</th>
                  <td>Colorado Division / NASAA EFD / SEC</td>
                  <td>{snap.asOf}</td>
                  <td>statute / rule / notice filing</td>
                  <td>SOURCE_NOT_ACQUIRED bulk</td>
                  <td>{snap.issuer.note}</td>
                </tr>
                <tr>
                  <th scope="row">Exam / CE</th>
                  <td>Colorado Division of Securities</td>
                  <td>{snap.asOf}</td>
                  <td>qualification exam / CE / rule text</td>
                  <td>no firm-level public scorecard</td>
                  <td>{snap.exam.note}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="co-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="co-gaps-title">Missing sources block a metric, not this page</h2>
          <ul className="ith-plain">
            {snap.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <ul className="ith-plain">
            {snap.semanticGuardrails.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
