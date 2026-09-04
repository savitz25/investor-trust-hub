import Link from 'next/link';
import {
  WA_PUBLIC_SNAPSHOT,
  waPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = WA_PUBLIC_SNAPSHOT;

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

export function WashingtonStateIntelligence() {
  const overlayCount = waPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Washington', path: '/washington' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Washington Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/washington',
        description:
          'SEC/IARD Washington principal-office overlay and Washington DFI verification paths. Not a state-RIA roster and not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Washington SEC/IARD principal-office overlay',
        description: snap.nationalOverlay.caveat,
        license: 'https://www.investortrusthub.com/methodology',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="wa-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Washington</p>
          <h1 id="wa-title">Washington Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            This page organizes federal SEC/IARD facts for firms that report a Washington principal office, plus official
            Washington Department of Financial Institutions Division of Securities verification and filing paths. It does
            not rank advisers, score firms, or publish a Trust Score. A Washington principal office is not Washington
            state registration.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research WA-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify a Washington registration at DFI
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="wa-record-title">Universe · Current · Observations · Geography · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD firms with a WA principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation"
                sourceDate={snap.nationalOverlay.sourceDate}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region WA = ${overlayCount}`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">UNKNOWN</p>
              <h3>Current</h3>
              <p className="ith-kicker">Complete Washington state-RIA count. Bulk roster is SOURCE_NOT_ACQUIRED.</p>
              <Trace
                source={snap.stateRia.verifyUrl}
                sourceDate={snap.asOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered adviser"
                calculation="No official bulk file was acquired. Missing is unknown, not zero. Do not use the 2024 year-end 645 as a live denominator."
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">SOURCE_NOT_ACQUIRED</p>
              <h3>Observations</h3>
              <p className="ith-kicker">Structured DFI enforcement bulk rows in this snapshot. Missing is not zero.</p>
              <Trace
                source={snap.enforcement.officialIndex}
                sourceDate={snap.asOf}
                coverage={snap.enforcement.result}
                grain="not acquired as bulk"
                calculation="Bounded pass found an official HTML table, yearly archives, and PDF orders, not a CSV."
                caveat={snap.enforcement.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">DFI</p>
              <h3>Regulator</h3>
              <p className="ith-kicker">Washington Department of Financial Institutions, Division of Securities.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceDate}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">SEC/IARD compilation {snap.nationalOverlay.source}.</p>
              <Trace
                source="Committed WA-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="wa-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="wa-findings-title">Washington evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">FEDERAL GEOGRAPHY</p>
              <h3>
                {overlayCount.toLocaleString('en-US')} SEC/IARD roster firms report a Washington principal office
              </h3>
              <p>
                That is {snap.nationalOverlay.shareOfResolvedRegionsPct}% of roster firms with a resolved principal-office
                region ({snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}). It is not
                Washington licensed advisers.
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
              <h3>Washington state-RIA bulk roster is SOURCE_NOT_ACQUIRED</h3>
              <p>
                Complete state-RIA count is UNKNOWN. Do not fill that gap with the {overlayCount.toLocaleString('en-US')}{' '}
                principal-office overlay or with the DFI year-end aggregate of{' '}
                {snap.dfiYearEndAggregates.investmentAdvisers.toLocaleString('en-US')} investment advisers. Verify on the
                official DFI Licensee Database using a name, CRD/IARD, or DFI file number.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">YEAR-END AGGREGATE</p>
              <h3>DFI 2024 year-end figures are not a live roster</h3>
              <p>
                Official 2024 Year In Review (as of December 2024):{' '}
                {snap.dfiYearEndAggregates.brokerDealers.toLocaleString('en-US')} broker-dealers,{' '}
                {snap.dfiYearEndAggregates.investmentAdvisers.toLocaleString('en-US')} investment advisers,{' '}
                {snap.dfiYearEndAggregates.investmentAdviserRepresentatives.toLocaleString('en-US')} investment adviser
                representatives, and {snap.dfiYearEndAggregates.securitiesSalespersons.toLocaleString('en-US')} securities
                salespersons. Those people totals are not published here as directories. DFI YEAR-END AGGREGATE != LIVE
                ROSTER.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENFORCEMENT COVERAGE</p>
              <h3>DFI securities actions are a public HTML table, not a bulk roster</h3>
              <p>
                Official current-index classes observed: {snap.enforcement.nativeClassesObservedOnIndex.join(', ')}.
                Statement of Charges is not a final finding. A process notice is not a final order. Name-only attachment
                is unsafe. The 2024 year-end {snap.enforcement.yearEndActionsIssued2024} actions issued is an aggregate,
                not a live case roster.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-find-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Find advisers</p>
          <h2 id="wa-find-title">Federal research and Washington state verification stay separate</h2>
          <ul className="ith-plain">
            <li>
              Federal SEC/IARD research:{' '}
              <Link href={snap.nationalOverlay.searchHref}>firms reporting a WA principal office</Link> or{' '}
              <Link href="/firms">any SEC/IARD firm</Link>. Identity is CRD / SEC file number. This list is not the
              Washington state-RIA roster.
            </li>
            <li>
              Washington DFI verification:{' '}
              <a href={snap.stateRia.verifyUrl}>Licensee Database</a> and{' '}
              <a href={snap.stateRia.securitiesVerifyUrl}>securities license/registration checks</a>. Helpline{' '}
              {snap.stateRia.helpline}. Also <a href={snap.stateRia.iapdUrl}>IAPD</a> for Form ADV registration status,
              including state jurisdictions.
            </li>
            <li>
              Broker-dealer / salesperson research remains on{' '}
              <a href={snap.stateRia.brokercheckUrl}>FINRA BrokerCheck</a>. Broker-dealer is not an investment adviser.
              BrokerCheck is not scraped here.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-matrix-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Regulator map</p>
          <h2 id="wa-matrix-title">What each credential proves</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Washington credential matrix">
            <table className="ith-table">
              <caption>SEC RIA is not a state RIA. CRD identity is not current Washington authority.</caption>
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

      <section className="ith-intel-section" aria-labelledby="wa-framework-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Registration framework</p>
          <h2 id="wa-framework-title">SEC, Washington DFI, IAR, and broker-dealer stay on separate paths</h2>
          <p>
            This is consumer orientation, not legal advice, and not a calculation of any firm&apos;s registration
            eligibility. {snap.issuer.framework}
          </p>
          <ul className="ith-plain">
            <li>
              Firms that are SEC-registered typically notice-file in Washington through IARD when Washington is a
              notice-filing jurisdiction. Official DFI path:{' '}
              <a href={snap.stateRia.federalNoticeUrl}>federally covered advisers</a>.
            </li>
            <li>
              Washington state registration may apply to advisers that are not SEC-registered. Official path:{' '}
              <a href={snap.stateRia.iaRegistrationUrl}>investment adviser registration</a> (IARD plus paper filings
              with the Division).
            </li>
            <li>
              Individuals who render advisory services generally register as investment adviser representatives. IAR is
              not the firm. Official path: <a href={snap.stateRia.iarRegistrationUrl}>IAR registration</a>.
            </li>
            <li>
              Broker-dealer and securities salesperson registration is a different credential from investment-adviser
              registration. Verify BD/salesperson status on BrokerCheck and DFI. Do not treat one as the other.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / securities filings</p>
          <h2 id="wa-issuer-title">Official Washington research paths</h2>
          <p>
            {snap.issuer.note} Statute {snap.issuer.statute}; IA rules {snap.issuer.iaRules}; BD/salesperson rules{' '}
            {snap.issuer.bdRules}.
          </p>
          <ul className="ith-plain">
            <li>
              Investment advisers home:{' '}
              <a href={snap.issuer.professionalsUrl}>DFI investment advisers</a>
            </li>
            <li>Bulk issuer dataset: {snap.issuer.bulkIssuerDataset}</li>
            <li>
              Federal Form D overlay: {snap.formD.overlay}. {snap.formD.caveat}
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Exam / guidance</p>
          <h2 id="wa-exam-title">Qualification exams and current rule text, not a firm scorecard</h2>
          <p>{snap.exam.note}</p>
          <p>
            Official IAR page: <a href={snap.exam.programPage}>qualifying examinations and designation waivers</a>.
            FINRA exam application path: <a href={snap.exam.finraExamPage}>how to apply</a>. Investor education stays
            educational: <a href={snap.investorEducation.url}>DFI consumers</a>. Alerts are not firm adverse evidence
            unless an exact official respondent identity and disposition are present.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-contacts-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Public contacts</p>
          <h2 id="wa-contacts-title">No Washington search scrape</h2>
          <p>{snap.contacts.policy}</p>
          <p>{snap.contacts.federalPrincipalOfficeAddress}</p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="wa-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Washington evidence depth">
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
                  <td>National class. Not a Washington state-RIA count.</td>
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
                  <th scope="row">WA principal-office overlay</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>{snap.nationalOverlay.grain}</td>
                  <td>{overlayCount.toLocaleString('en-US')}</td>
                  <td>{snap.nationalOverlay.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Washington state IA search</th>
                  <td>Washington DFI</td>
                  <td>{snap.asOf}</td>
                  <td>search result</td>
                  <td>UNKNOWN</td>
                  <td>{snap.stateRia.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">DFI year-end aggregates</th>
                  <td>Washington DFI</td>
                  <td>{snap.dfiYearEndAggregates.asOf}</td>
                  <td>{snap.dfiYearEndAggregates.grain}</td>
                  <td>{snap.dfiYearEndAggregates.investmentAdvisers.toLocaleString('en-US')} IA (year-end)</td>
                  <td>{snap.dfiYearEndAggregates.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Washington enforcement</th>
                  <td>Washington DFI</td>
                  <td>{snap.asOf}</td>
                  <td>HTML table / year archive / PDF</td>
                  <td>not acquired as bulk</td>
                  <td>{snap.enforcement.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">FINRA BrokerCheck / CRD</th>
                  <td>FINRA</td>
                  <td>n/a</td>
                  <td>official search</td>
                  <td>not scraped</td>
                  <td>Broker-dealer is not an investment adviser. CRD is not current Washington authority.</td>
                </tr>
                <tr>
                  <th scope="row">Issuer / securities filing</th>
                  <td>Washington DFI</td>
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
                  <td>Washington DFI</td>
                  <td>{snap.asOf}</td>
                  <td>qualification exam / rule text</td>
                  <td>no firm-level public scorecard</td>
                  <td>{snap.exam.note}</td>
                </tr>
                <tr>
                  <th scope="row">Investor alerts</th>
                  <td>Washington DFI</td>
                  <td>{snap.asOf}</td>
                  <td>consumer education</td>
                  <td>not firm adverse evidence</td>
                  <td>Alerts are not attached to firm profiles without exact respondent identity.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="wa-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="wa-gaps-title">Missing sources block a metric, not this page</h2>
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
