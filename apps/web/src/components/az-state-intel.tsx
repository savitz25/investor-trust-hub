import Link from 'next/link';
import {
  AZ_PUBLIC_SNAPSHOT,
  azPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = AZ_PUBLIC_SNAPSHOT;

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

export function ArizonaStateIntelligence() {
  const overlayCount = azPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Arizona', path: '/arizona' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Arizona Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/arizona',
        description:
          'SEC/IARD Arizona principal-office overlay and Arizona Corporation Commission Securities Division verification paths. Not a state-RIA roster and not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Arizona SEC/IARD principal-office overlay',
        description: snap.nationalOverlay.caveat,
        license: 'https://www.investortrusthub.com/methodology',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="az-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Arizona</p>
          <h1 id="az-title">Arizona Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            This page organizes federal SEC/IARD facts for firms that report an Arizona principal office, plus official
            Arizona Corporation Commission Securities Division verification and filing paths. It does not rank advisers,
            score firms, or publish a Trust Score. An Arizona principal office is not Arizona state registration.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research AZ-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify an Arizona registration at ACC
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="az-record-title">Universe · Current · Observations · Geography · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD firms with an AZ principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation"
                sourceDate={snap.nationalOverlay.sourceDate}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region AZ = ${overlayCount}. Same-source national roster = ${snap.nationalOverlay.universe.toLocaleString('en-US')}; resolved geography = ${snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}; unresolved = ${snap.nationalOverlay.unresolvedPrincipalOfficeRegions.toLocaleString('en-US')}.`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">UNKNOWN</p>
              <h3>Current</h3>
              <p className="ith-kicker">Complete Arizona state IA roster. SOURCE_AVAILABLE_BY_REQUEST, not acquired.</p>
              <Trace
                source={snap.stateRia.requestFormUrl}
                sourceDate={snap.asOf}
                coverage={snap.stateRia.AZ_STATE_IA_BUSINESS_ROSTER}
                grain="state-licensed investment adviser firm"
                calculation="ACC CSV lists exist by public-records request. The request was not filed. Missing is unknown, not zero. Do not use 213 as Arizona licensed advisers."
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.enforcement.indexRows.toLocaleString('en-US')}</p>
              <h3>Observations</h3>
              <p className="ith-kicker">ACC enforcement HTML index rows profiled. Not attached to firm profiles.</p>
              <Trace
                source={snap.enforcement.officialIndex}
                sourceDate={snap.asOf}
                coverage={snap.enforcement.result}
                grain="HTML index row (Date Filed + Company/Individual)"
                calculation={`${snap.enforcement.indexRows} index rows; ${snap.enforcement.rowsWithCrdInRespondentText} mention CRD in the respondent cell; ${snap.enforcement.rowsNameOnly} are name-only. PDFs downloaded = 0.`}
                caveat={snap.enforcement.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">ACC</p>
              <h3>Regulator</h3>
              <p className="ith-kicker">Arizona Corporation Commission, Securities Division.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceDate}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">SEC/IARD compilation {snap.nationalOverlay.source}.</p>
              <Trace
                source="Committed AZ-INV-001 public snapshot"
                sourceDate={snap.asOf}
                coverage="Deterministic generator"
                grain="snapshot"
                calculation={`Fingerprint ${snap.fingerprint.slice(0, 16)}…`}
                caveat="Numbers on this page must match the generated snapshot."
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="az-findings-title">Arizona evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">FEDERAL GEOGRAPHY</p>
              <h3>
                {overlayCount.toLocaleString('en-US')} SEC/IARD roster firms report an Arizona principal office
              </h3>
              <p>
                That is {snap.nationalOverlay.shareOfResolvedRegionsPct}% of roster firms with a resolved principal-office
                region ({snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}). It is not Arizona
                licensed advisers and not net-new companies.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">CLASS SEPARATION</p>
              <h3>
                National roster: {snap.riaEra.nationalRiaFacts.toLocaleString('en-US')} RIA facts and{' '}
                {snap.riaEra.nationalEraFacts.toLocaleString('en-US')} ERA facts
              </h3>
              <p>{snap.riaEra.caveat}</p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">STATE GAP</p>
              <h3>Arizona state IA, dealer, and notice-filed firm lists are SOURCE_AVAILABLE_BY_REQUEST</h3>
              <p>
                Complete state-IA count is UNKNOWN. The ACC list-request form can produce CSV for dealer firms, IA firms
                licensed in Arizona, and IA firms notice-filed in Arizona. That request was not filed. Do not fill the gap
                with the {overlayCount.toLocaleString('en-US')} principal-office overlay. Verify a named firm on IAPD,
                BrokerCheck, or by calling the ACC Investigator on Duty.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENFORCEMENT IDENTITY</p>
              <h3>
                {snap.enforcement.indexRows.toLocaleString('en-US')} ACC HTML index rows;{' '}
                {snap.enforcement.rowsNameOnly.toLocaleString('en-US')} are name-only
              </h3>
              <p>
                The official index columns are Date Filed and Company/Individual. {snap.enforcement.rowsWithCrdInRespondentText}{' '}
                rows mention a CRD in the respondent cell. Name-only attachment is unsafe. Native action class is not on
                the index. PDFs were not downloaded. Action count is not quality.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENTITY GROWTH</p>
              <h3>This ticket adds intelligence, not new canonical firms</h3>
              <p>
                Expansion ledger: net-new canonical organizations {snap.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS};
                net-new state identities {snap.expansionLedger.NET_NEW_STATE_IDENTITIES}; existing organizations enriched{' '}
                {snap.expansionLedger.EXISTING_ORGANIZATIONS_ENRICHED}; new evidence rows{' '}
                {snap.expansionLedger.NEW_EVIDENCE_ROWS} (ACC index profiled, not attached). Federal overlay is not entity
                growth.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-find-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Find advisers</p>
          <h2 id="az-find-title">Federal research and Arizona state verification stay separate</h2>
          <ul className="ith-plain">
            <li>
              Federal SEC/IARD research:{' '}
              <Link href={snap.nationalOverlay.searchHref}>firms reporting an AZ principal office</Link> or{' '}
              <Link href="/firms">any SEC/IARD firm</Link>. Identity is CRD / SEC file number. This list is not the
              Arizona state-licensed adviser roster.
            </li>
            <li>
              Investment adviser firm / IAR verification:{' '}
              <a href={snap.stateRia.iapdUrl}>SEC IAPD</a>. ACC also staffs an Investigator on Duty at{' '}
              {snap.stateRia.investigatorPhone} or toll-free {snap.stateRia.tollFree} (
              <a href={snap.stateRia.verifyUrl}>ACC Broker &amp; Adviser Search</a>).
            </li>
            <li>
              Broker-dealer / salesperson research remains on{' '}
              <a href={snap.stateRia.brokercheckUrl}>FINRA BrokerCheck</a>. Broker-dealer is not an investment adviser.
              BrokerCheck is not scraped here.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-matrix-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Regulator map</p>
          <h2 id="az-matrix-title">What each credential proves</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Arizona credential matrix">
            <table className="ith-table">
              <caption>SEC RIA is not a state RIA. CRD identity is not current Arizona authority.</caption>
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

      <section className="ith-intel-section" aria-labelledby="az-framework-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Registration framework</p>
          <h2 id="az-framework-title">SEC, Arizona ACC, IAR, and broker-dealer stay on separate paths</h2>
          <p>
            This is consumer orientation, not legal advice, and not a calculation of any firm&apos;s registration
            eligibility. {snap.issuer.framework}
          </p>
          <ul className="ith-plain">
            <li>
              Firms that are SEC-registered typically notice-file in Arizona through IARD when Arizona is a
              notice-filing jurisdiction. Official ACC path:{' '}
              <a href={snap.stateRia.iaRegistrationUrl}>investment adviser / IAR licensing and notice filing</a>.
            </li>
            <li>
              Arizona state licensure may apply to advisers that are not SEC-registered. The complete licensed-firm CSV
              is available only by public-records request and was not acquired.
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

      <section className="ith-intel-section" aria-labelledby="az-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / securities filings</p>
          <h2 id="az-issuer-title">Official Arizona research paths</h2>
          <p>
            {snap.issuer.note} Statutes {snap.issuer.statuteSecurities} and {snap.issuer.statuteIa}; IA rules{' '}
            {snap.issuer.iaRules}; securities rules {snap.issuer.securitiesRules}.
          </p>
          <ul className="ith-plain">
            <li>
              Securities registration:{' '}
              <a href={snap.issuer.securitiesRegistrationUrl}>ACC registration of securities</a>
            </li>
            <li>
              Exemptions / notice filings:{' '}
              <a href={snap.issuer.exemptionsUrl}>ACC registration exemptions</a>
            </li>
            <li>Bulk issuer dataset: {snap.issuer.bulkIssuerDataset}</li>
            <li>
              Federal Form D overlay: {snap.formD.overlay}. {snap.formD.caveat}
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Exam / guidance</p>
          <h2 id="az-exam-title">Qualification exams and current rule text, not a firm scorecard</h2>
          <p>{snap.exam.note}</p>
          <p>
            Official examination page: <a href={snap.exam.programPage}>A.A.C. R14-6-204 requirements</a>. After 31 Dec
            1999: Series 65, or Series 66 plus Series 7 or Series 2. Designation waivers in good standing:{' '}
            {snap.exam.designationWaivers.join(', ')}. Investor education stays educational:{' '}
            <a href={snap.investorEducation.url}>AZ Investor</a>.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-contacts-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Public contacts</p>
          <h2 id="az-contacts-title">No Arizona search scrape and no ACC list request</h2>
          <p>{snap.contacts.policy}</p>
          <p>{snap.contacts.federalPrincipalOfficeAddress}</p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="az-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Arizona evidence depth">
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
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>Form ADV / IARD firm fact</td>
                  <td>{snap.riaEra.nationalRiaFacts.toLocaleString('en-US')}</td>
                  <td>National class. Not an Arizona state-RIA count.</td>
                </tr>
                <tr>
                  <th scope="row">ERA (national)</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>ERA reporting fact</td>
                  <td>{snap.riaEra.nationalEraFacts.toLocaleString('en-US')}</td>
                  <td>ERA is not an RIA.</td>
                </tr>
                <tr>
                  <th scope="row">AZ principal-office overlay</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>{snap.nationalOverlay.grain}</td>
                  <td>{overlayCount.toLocaleString('en-US')}</td>
                  <td>{snap.nationalOverlay.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Arizona state IA list</th>
                  <td>ACC Securities</td>
                  <td>{snap.asOf}</td>
                  <td>state-licensed IA firm</td>
                  <td>UNKNOWN</td>
                  <td>{snap.stateRia.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">ACC requested-list availability</th>
                  <td>ACC Securities</td>
                  <td>{snap.asOf}</td>
                  <td>public-records CSV offer</td>
                  <td>not filed</td>
                  <td>Available-by-request is not acquired. Commercial-purpose request requires a notary.</td>
                </tr>
                <tr>
                  <th scope="row">Arizona enforcement index</th>
                  <td>ACC Securities</td>
                  <td>{snap.asOf}</td>
                  <td>HTML index row</td>
                  <td>{snap.enforcement.indexRows.toLocaleString('en-US')}</td>
                  <td>{snap.enforcement.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">IAPD / BrokerCheck</th>
                  <td>SEC / FINRA</td>
                  <td>n/a</td>
                  <td>official search</td>
                  <td>not scraped</td>
                  <td>Broker-dealer is not an investment adviser. CRD is not current Arizona authority.</td>
                </tr>
                <tr>
                  <th scope="row">Issuer / securities filing</th>
                  <td>ACC Securities</td>
                  <td>{snap.asOf}</td>
                  <td>statute / rule / notice filing</td>
                  <td>SOURCE_NOT_ACQUIRED bulk</td>
                  <td>{snap.issuer.note}</td>
                </tr>
                <tr>
                  <th scope="row">Form D</th>
                  <td>SEC</td>
                  <td>{snap.asOf}</td>
                  <td>not in committed product</td>
                  <td>SOURCE_NOT_ACQUIRED</td>
                  <td>{snap.formD.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Exam / guidance</th>
                  <td>ACC Securities</td>
                  <td>{snap.asOf}</td>
                  <td>qualification exam / rule text</td>
                  <td>no firm-level public scorecard</td>
                  <td>{snap.exam.note}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="az-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="az-gaps-title">Missing sources block a metric, not this page</h2>
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
