import Link from 'next/link';
import {
  TX_PUBLIC_SNAPSHOT,
  txPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = TX_PUBLIC_SNAPSHOT;

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

export function TexasStateIntelligence() {
  const overlayCount = txPrincipalOfficeCountFromNationalRoster();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Texas', path: '/texas' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Texas Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/texas',
        description:
          'SEC/IARD Texas principal-office overlay and Texas State Securities Board verification paths. Not a state-RIA roster and not a ranking.',
      },
      {
        '@type': 'Dataset',
        name: 'Texas SEC/IARD principal-office overlay',
        description: snap.nationalOverlay.caveat,
        license: 'https://www.investortrusthub.com/methodology',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="tx-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Texas</p>
          <h1 id="tx-title">Texas Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            This page organizes federal SEC/IARD facts for firms that report a Texas principal office, plus official
            Texas State Securities Board verification and filing paths. It does not rank advisers, score firms, or
            publish a Trust Score. A Texas principal office is not Texas state registration.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research TX-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.stateRia.verifyUrl}>
              Verify a Texas registration at SSB
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="tx-record-title">Universe · Current · Observations · Geography · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD firms with a TX principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation"
                sourceDate={snap.nationalOverlay.sourceDate}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region TX = ${overlayCount}`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">UNKNOWN</p>
              <h3>Current</h3>
              <p className="ith-kicker">Complete Texas state-RIA count. Bulk roster is SOURCE_NOT_ACQUIRED.</p>
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
              <p className="ith-metric__value">SOURCE_NOT_ACQUIRED</p>
              <h3>Observations</h3>
              <p className="ith-kicker">Structured SSB enforcement bulk rows in this snapshot. Missing is not zero.</p>
              <Trace
                source={snap.enforcement.officialIndex}
                sourceDate={snap.asOf}
                coverage={snap.enforcement.result}
                grain="not acquired as bulk"
                calculation="Bounded pass found a paginated HTML index and PDF orders, not a CSV."
                caveat={snap.enforcement.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">TX</p>
              <h3>Geography</h3>
              <p className="ith-kicker">Principal-office region overlay. Not service territory and not a county page.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.nationalOverlay.sourceDate}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">SEC/IARD compilation {snap.nationalOverlay.source}.</p>
              <Trace
                source="Committed TX-INV-001 public snapshot"
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

      <section className="ith-intel-section" aria-labelledby="tx-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="tx-findings-title">Texas evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">FEDERAL GEOGRAPHY</p>
              <h3>
                {overlayCount.toLocaleString('en-US')} SEC/IARD roster firms report a Texas principal office
              </h3>
              <p>
                That is {snap.nationalOverlay.shareOfResolvedRegionsPct}% of roster firms with a resolved principal-office
                region ({snap.nationalOverlay.resolvedPrincipalOfficeRegions.toLocaleString('en-US')}). It is not Texas
                licensed advisers.
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
              <h3>Texas state-RIA bulk roster is SOURCE_NOT_ACQUIRED</h3>
              <p>
                Complete state-RIA count is UNKNOWN. Do not fill that gap with the {overlayCount.toLocaleString('en-US')}{' '}
                principal-office overlay. Verify a Texas registration on the official SSB certificate search using CRD/IARD
                or a Texas file number.
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">ENFORCEMENT COVERAGE</p>
              <h3>SSB administrative actions are a public HTML index, not a bulk roster</h3>
              <p>
                Official orders appear on a paginated news listing with native classes such as consent order, emergency
                cease and desist, reprimand, suspension, revocation, and notice of hearing. That index was not harvested.
                Name-only attachment is unsafe.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-find-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Find advisers</p>
          <h2 id="tx-find-title">Federal research and Texas state verification stay separate</h2>
          <ul className="ith-plain">
            <li>
              Federal SEC/IARD research:{' '}
              <Link href={snap.nationalOverlay.searchHref}>firms reporting a TX principal office</Link> or{' '}
              <Link href="/firms">any SEC/IARD firm</Link>. Identity is CRD / SEC file number. This list is not the Texas
              state-RIA roster.
            </li>
            <li>
              Texas State Securities Board verification:{' '}
              <a href={snap.stateRia.verifyUrl}>certificate of registration search</a> (CRD/IARD or TX file number). Also{' '}
              <a href={snap.stateRia.iapdUrl}>IAPD</a> for Form ADV registration status, including state jurisdictions.{' '}
              <a href={snap.stateRia.registrationChecksUrl}>SSB registration checks</a> explain the official paths.
            </li>
            <li>
              Broker-dealer / representative research remains on{' '}
              <a href={snap.stateRia.brokercheckUrl}>FINRA BrokerCheck</a>. Broker-dealer is not an investment adviser.
              BrokerCheck is not scraped here.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-matrix-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Regulator map</p>
          <h2 id="tx-matrix-title">What each credential proves</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Texas credential matrix">
            <table className="ith-table">
              <caption>SEC RIA is not a state RIA. CRD identity is not current Texas authority.</caption>
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

      <section className="ith-intel-section" aria-labelledby="tx-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / securities filings</p>
          <h2 id="tx-issuer-title">Official Texas research paths</h2>
          <p>
            {snap.issuer.framework} {snap.issuer.note}
          </p>
          <ul className="ith-plain">
            <li>
              Professionals / registration:{' '}
              <a href={snap.issuer.professionalsUrl}>SSB securities professionals</a>
            </li>
            <li>
              Act and Board rules:{' '}
              <a href={snap.issuer.rulesUrl}>official rules index</a>
            </li>
            <li>
              Electronic rulebook ({snap.issuer.rulebookDate}):{' '}
              <a href={snap.issuer.rulebookPdf}>official PDF</a>
            </li>
            <li>{snap.issuer.privateFundExemption}</li>
            <li>Bulk issuer dataset: {snap.issuer.bulkIssuerDataset}</li>
            <li>Federal Form D overlay: {snap.formD.overlay}. {snap.formD.caveat}</li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Exam / guidance</p>
          <h2 id="tx-exam-title">Qualification exams and current rule text, not a firm scorecard</h2>
          <p>{snap.exam.note}</p>
          <p>
            Official exam-waiver page:{' '}
            <a href={snap.exam.programPage}>EVEP, MQP, and other waivers</a>. Investor education stays educational:{' '}
            <a href={snap.investorEducation.url}>SSB news and publications</a>. Alerts are not firm adverse evidence
            unless an exact official respondent identity and disposition are present.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-contacts-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Public contacts</p>
          <h2 id="tx-contacts-title">No Texas search scrape</h2>
          <p>{snap.contacts.policy}</p>
          <p>{snap.contacts.federalPrincipalOfficeAddress}</p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="tx-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="tx-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Texas evidence depth">
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
                  <td>National class. Not a Texas state-RIA count.</td>
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
                  <th scope="row">TX principal-office overlay</th>
                  <td>SEC / IARD</td>
                  <td>{snap.nationalOverlay.sourceDate}</td>
                  <td>{snap.nationalOverlay.grain}</td>
                  <td>{overlayCount.toLocaleString('en-US')}</td>
                  <td>{snap.nationalOverlay.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Texas state IA search</th>
                  <td>Texas State Securities Board</td>
                  <td>{snap.asOf}</td>
                  <td>search result</td>
                  <td>UNKNOWN</td>
                  <td>{snap.stateRia.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">Texas enforcement</th>
                  <td>Texas State Securities Board</td>
                  <td>{snap.asOf}</td>
                  <td>paginated HTML index / PDF</td>
                  <td>not acquired as bulk</td>
                  <td>{snap.enforcement.caveat}</td>
                </tr>
                <tr>
                  <th scope="row">FINRA BrokerCheck / CRD</th>
                  <td>FINRA</td>
                  <td>n/a</td>
                  <td>official search</td>
                  <td>not scraped</td>
                  <td>Broker-dealer is not an investment adviser. CRD is not current Texas authority.</td>
                </tr>
                <tr>
                  <th scope="row">Issuer / securities filing</th>
                  <td>Texas State Securities Board</td>
                  <td>{snap.issuer.rulebookDate}</td>
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
                  <td>Texas State Securities Board</td>
                  <td>{snap.exam.evepAsOf}</td>
                  <td>qualification exam / rule text</td>
                  <td>no firm-level public scorecard</td>
                  <td>{snap.exam.note}</td>
                </tr>
                <tr>
                  <th scope="row">Investor alerts</th>
                  <td>Texas State Securities Board</td>
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

      <section className="ith-intel-section" aria-labelledby="tx-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="tx-gaps-title">Missing sources block a metric, not this page</h2>
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
