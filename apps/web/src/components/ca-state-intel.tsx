import Link from 'next/link';
import {
  CA_PUBLIC_SNAPSHOT,
  caPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = CA_PUBLIC_SNAPSHOT;

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

export function CaliforniaStateIntelligence() {
  const overlayCount = caPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'California', path: '/california' },
      ]),
      {
        '@type': 'WebPage',
        name: 'California Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/california',
        description:
          'SEC/IARD California principal-office overlay and DFPI verification paths. Not a state-RIA roster and not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'California SEC/IARD principal-office overlay',
        description: snap.nationalOverlay.caveat,
        license: 'https://www.investortrusthub.com/methodology',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="ca-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · California</p>
          <h1 id="ca-title">California Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            This page organizes federal SEC/IARD facts for firms that report a California principal office, plus official
            DFPI verification and filing paths. It does not rank advisers, score firms, or publish a Trust Score. A
            California principal office is not California state registration.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research CA-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify a California state adviser at DFPI
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="ca-record-title">Universe · Current · Observations · Geography · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD firms with a CA principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation"
                sourceDate={snap.nationalOverlay.sourceDate}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region CA = ${overlayCount}`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">UNKNOWN</p>
              <h3>Current</h3>
              <p className="ith-kicker">Complete California state-RIA count. Bulk roster is SOURCE_NOT_ACQUIRED.</p>
              <Trace
                source={snap.stateRia.verifyUrl}
                sourceDate={snap.asOf}
                coverage={snap.stateRia.STATE_RIA_BULK_ROSTER}
                grain="state-registered adviser"
                calculation="No official bulk file was acquired. Missing is unknown, not zero."
                caveat={snap.stateRia.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">0</p>
              <h3>Observations</h3>
              <p className="ith-kicker">Structured DFPI enforcement rows acquired in this snapshot.</p>
              <Trace
                source={snap.enforcement.officialIndex}
                sourceDate={snap.asOf}
                coverage={snap.enforcement.result}
                grain="not acquired as bulk"
                calculation="Bounded easy-win pass found a search index and monthly PDFs, not a CSV."
                caveat={snap.enforcement.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">CA</p>
              <h3>Geography</h3>
              <p className="ith-kicker">Principal-office region overlay. Not service territory and not a county page.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceDate}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">SEC/IARD compilation {snap.nationalOverlay.source}.</p>
              <Trace
                source="Committed CA-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="ca-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="ca-findings-title">Three California evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">FEDERAL GEOGRAPHY</p>
              <h3>
                {overlayCount.toLocaleString('en-US')} SEC/IARD roster firms report a California principal office
              </h3>
              <p>
                That is {snap.nationalOverlay.shareOfResolvedRegionsPct}% of roster firms with a resolved principal-office
                region ({snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}). It is not
                California licensed advisers.
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
              <h3>California state-RIA bulk roster is SOURCE_NOT_ACQUIRED</h3>
              <p>
                Complete state-RIA count is UNKNOWN. Do not fill that gap with the {overlayCount.toLocaleString('en-US')}{' '}
                principal-office overlay. Verify a California state adviser on the official DFPI search.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-find-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Find advisers</p>
          <h2 id="ca-find-title">Federal research and California state verification stay separate</h2>
          <ul className="ith-plain">
            <li>
              Federal SEC/IARD research:{' '}
              <Link href={snap.nationalOverlay.searchHref}>firms reporting a CA principal office</Link> or{' '}
              <Link href="/firms">any SEC/IARD firm</Link>. Identity is CRD / SEC file number.
            </li>
            <li>
              California DFPI state verification:{' '}
              <a href={snap.stateRia.verifyUrl}>licensee and financial-service-provider search</a>. Also{' '}
              <a href={snap.stateRia.iapdUrl}>IAPD</a> for Form ADV registration status, including state jurisdictions.
            </li>
            <li>
              Broker-dealer / representative research remains on{' '}
              <a href={snap.stateRia.brokercheckUrl}>FINRA BrokerCheck</a>. Broker-dealer is not an investment adviser.
              BrokerCheck is not scraped here.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-matrix-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Regulator map</p>
          <h2 id="ca-matrix-title">What each credential proves</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="California credential matrix">
            <table className="ith-table">
              <caption>SEC RIA is not a state RIA. CRD identity is not current California authority.</caption>
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

      <section className="ith-intel-section" aria-labelledby="ca-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / securities filings</p>
          <h2 id="ca-issuer-title">Official California research paths</h2>
          <p>
            {snap.issuer.framework}. Public document search is available through DFPI DOCQNET. {snap.issuer.note}
          </p>
          <ul className="ith-plain">
            <li>
              Securities and franchise document search:{' '}
              <a href={snap.issuer.documentSearch}>DOCQNET</a>
            </li>
            <li>
              Search guide:{' '}
              <a href={snap.issuer.documentSearchGuide}>official PDF</a>
            </li>
            <li>Bulk issuer dataset: {snap.issuer.bulkIssuerDataset}</li>
            <li>Federal Form D overlay: {snap.formD.overlay}. {snap.formD.caveat}</li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Exam / guidance</p>
          <h2 id="ca-exam-title">No current public questionnaire like New Jersey 2026</h2>
          <p>{snap.exam.note}</p>
          <p>
            Official program page:{' '}
            <a href={snap.exam.programPage}>Annual Written Examination Questionnaire</a>. Investor education stays
            educational:{' '}
            <a href={snap.investorEducation.url}>DFPI investor information</a>. Alerts are not firm adverse evidence
            unless an exact official respondent identity and disposition are present.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="ca-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="California evidence depth">
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
                  <td>National class. Not a California state-RIA count.</td>
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
                  <th scope="row">CA principal-office overlay</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>{snap.nationalOverlay.grain}</td>
                  <td>{overlayCount.toLocaleString('en-US')}</td>
                  <td>{snap.nationalOverlay.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">DFPI state adviser lookup</th>
                  <td>DFPI</td>
                  <td>{snap.asOf}</td>
                  <td>search result</td>
                  <td>UNKNOWN</td>
                  <td>{snap.stateRia.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">DFPI enforcement</th>
                  <td>DFPI</td>
                  <td>{snap.asOf}</td>
                  <td>search / monthly PDF</td>
                  <td>not acquired as bulk</td>
                  <td>{snap.enforcement.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">FINRA BrokerCheck</th>
                  <td>FINRA</td>
                  <td>n/a</td>
                  <td>official search</td>
                  <td>not scraped</td>
                  <td>Broker-dealer is not an investment adviser.</td>
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
                  <th scope="row">Issuer / securities filing system</th>
                  <td>DFPI DOCQNET</td>
                  <td>{snap.asOf}</td>
                  <td>document search</td>
                  <td>SOURCE_NOT_ACQUIRED bulk</td>
                  <td>{snap.issuer.note}</td>
                </tr>
                <tr>
                  <th scope="row">State guidance / exam</th>
                  <td>DFPI BDIA</td>
                  <td>{snap.asOf}</td>
                  <td>program page</td>
                  <td>no 2026 public sample like NJ</td>
                  <td>{snap.exam.note}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ca-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="ca-gaps-title">Missing sources block a metric, not this page</h2>
          <ul className="ith-plain">
            {snap.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
