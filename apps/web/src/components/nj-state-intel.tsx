import Link from 'next/link';
import {
  NJ_DOCUMENT_CLASS_LABELS,
  NJ_PUBLIC_SNAPSHOT,
  njPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = NJ_PUBLIC_SNAPSHOT;

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

function Bar({ value, max, label, note }: { value: number; max: number; label: string; note: string }) {
  const width = max > 0 ? Math.max(3, Math.round((100 * value) / max)) : 0;
  return (
    <div className="ith-bar">
      <div className="ith-bar__meta">
        <span>{label}</span>
        <span>{note}</span>
      </div>
      <div className="ith-bar__track" aria-hidden="true">
        <span className="ith-bar__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function NewJerseyStateIntelligence() {
  const overlayCount = njPrincipalOfficeCountFromNationalRoster();
  const yearEntries = Object.entries(snap.enforcement.byYear)
    .filter(([year]) => year !== 'unknown')
    .sort(([a], [b]) => a.localeCompare(b));
  const yearMax = Math.max(...yearEntries.map(([, n]) => n), 1);
  const classEntries = Object.entries(snap.enforcement.byClass).sort((a, b) => b[1] - a[1]);
  const classMax = Math.max(...classEntries.map(([, n]) => n), 1);
  const topicMax = Math.max(...snap.exam.timeline.map((t) => t.yearsPresent.length), 1);
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'New Jersey', path: '/new-jersey' },
  ]);

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="ith-intel-section" aria-labelledby="nj-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · New Jersey</p>
          <h1 id="nj-title">New Jersey investment adviser &amp; securities intelligence</h1>
          <p className="ith-lede">
            This page organizes official federal SEC/IARD facts and New Jersey Bureau of Securities evidence —
            enforcement documents, annual investment-adviser examination themes, issuer and exemption filing
            frameworks, and policy instruments. It does not rank advisers, score firms, or tell you who is safest.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research NJ-headquartered SEC/IARD firms
            </Link>
            <Link className="th-btn-secondary th-btn-hero" href="/firms">
              Search any SEC/IARD firm
            </Link>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="nj-record-title">Universe · Current · Observations · Geography · As-of</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>Universe</h3>
              <p className="ith-kicker">SEC/IARD firms with a NJ principal office. Not the state-RIA roster.</p>
              <Trace
                source="SEC IARD firm compilation"
                sourceDate={snap.nationalOverlay.sourceDate}
                coverage="National roster overlay"
                grain={snap.nationalOverlay.grain}
                calculation={`COUNT of roster firms with principal-office region NJ = ${overlayCount}`}
                caveat={snap.nationalOverlay.caveat}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.exam.questionCount2026}</p>
              <h3>Current</h3>
              <p className="ith-kicker">Public questions in the 2026 IA written-examination sample. Deadline {snap.exam.deadline}.</p>
              <Trace
                source="NJ Bureau of Securities 2026 sample examination PDF"
                sourceDate="2026-06-08"
                coverage="ACQUIRED_CURRENT_SNAPSHOT"
                grain="public sample question"
                calculation="COUNT of numbered questions parsed from the official sample PDF"
                caveat={snap.exam.consumerSafeStatement}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.enforcement.acquiredDocuments}</p>
              <h3>Observations</h3>
              <p className="ith-kicker">Official Bureau regulatory documents in the acquired corpus.</p>
              <Trace
                source="NJ Bureau of Securities / DCA Actions PDFs and NJOAG-hosted orders"
                sourceDate={snap.asOf}
                coverage={snap.enforcement.coverage}
                grain="official PDF"
                calculation="COUNT DISTINCT official_pdf_url in the committed coverage manifest"
                caveat={snap.enforcement.coverageLabel}
              />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">NJ</p>
              <h3>Geography</h3>
              <p className="ith-kicker">New Jersey securities regulator and NJ principal-office overlay. Not service territory.</p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.asOf}</p>
              <h3>As-of</h3>
              <p className="ith-kicker">Publication snapshot {snap.version}.</p>
              <Trace
                source="Committed NJ-INV-003 public snapshot"
                sourceDate={snap.asOf}
                coverage="Deterministic generator"
                grain="snapshot"
                calculation={`Fingerprint ${snap.fingerprint.slice(0, 16)}…`}
                caveat="Numbers on this page must match the generated snapshot. Retrieval timestamps are not change events."
              />
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the sources say</p>
          <h2 id="nj-findings-title">Three New Jersey evidence findings</h2>
          <div className="ith-findings">
            <article className="ith-finding">
              <p className="ith-eyebrow">PARTIAL HISTORICAL COVERAGE</p>
              <h3>{snap.enforcement.acquiredDocuments} official Bureau regulatory documents</h3>
              <p>
                The acquired corpus contains {snap.enforcement.acquiredDocuments} unique official PDFs spanning{' '}
                {snap.enforcement.earliest} through {snap.enforcement.latest}. {snap.enforcement.coverageLabel}
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">2026 PUBLIC SAMPLE</p>
              <h3>{snap.exam.questionCount2026} questions in the official IA written-examination sample</h3>
              <p>
                Registered New Jersey investment advisers are required to submit the annual written examination. The
                public sample contains {snap.exam.questionCount2026} parsed questions. Deadline {snap.exam.deadline}.{' '}
                {snap.exam.consumerSafeStatement}
              </p>
            </article>
            <article className="ith-finding">
              <p className="ith-eyebrow">REGULATORY PRIORITY</p>
              <h3>Artificial intelligence first appears in 2024 annual examination material</h3>
              <p>
                Official 2024 Bureau/NJOAG announcements added AI, advertising, and investment-concentration themes.
                2025 emphasized outside business activities and conflicts. The 2026 sample includes custody,
                cybersecurity, complaints, discretion, and financial-condition questions. A missing historical sample
                PDF is not evidence that a topic was removed.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-timeline-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Annual IA examination</p>
          <h2 id="nj-timeline-title">Regulatory-priority timeline, 2022–2026</h2>
          <p>
            Themes below are source-backed: NJOAG/Bureau announcements for 2022–2025, and the official 2026 sample
            examination PDF. This is a risk-assessment questionnaire, not a firm score.
          </p>
          <ol className="nj-timeline">
            {snap.exam.timelineByYear.map((row) => (
              <li key={row.year} className="ith-finding">
                <p className="ith-eyebrow">{row.year}</p>
                <h3>{row.topics.join(' · ') || 'Official announcement on file'}</h3>
                <p className="ith-kicker">{row.caveat}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-exam-title">
        <div className="th-shell">
          <p className="ith-eyebrow">2026 examination deep dive</p>
          <h2 id="nj-exam-title">Public sample questionnaire</h2>
          <p>
            <strong>{snap.exam.consumerSafeStatement}</strong> Do not read a question as a finding that New Jersey
            firms using a technology or practice are unsafe.
          </p>
          <p className="ith-kicker">
            Bureau press language such as “{snap.exam.roundedPopulationContext[1]}” or “
            {snap.exam.roundedPopulationContext[0]}” is attributed historical context. It is not an exact current
            state-RIA denominator.
          </p>
          <figure>
            <figcaption>Topic families present in the 2026 public sample (count of years observed 2022–2026)</figcaption>
            <div className="ith-chart" role="img" aria-label="Examination topic presence by year count">
              {snap.exam.timeline.map((topic) => (
                <Bar
                  key={topic.topic}
                  value={topic.yearsPresent.length}
                  max={topicMax}
                  label={topic.label}
                  note={`First ${topic.firstYear} · years ${topic.yearsPresent.join(', ')}`}
                />
              ))}
            </div>
          </figure>
          <Trace
            source="Official 2026 sample examination PDF and 2022–2025 NJOAG announcements"
            sourceDate={snap.asOf}
            coverage="ACQUIRED_CURRENT_SNAPSHOT for 2026 sample; ACQUIRED_PARTIAL_HISTORY for prior years"
            grain="public question / announcement theme"
            calculation={`${snap.exam.questionCount2026} numbered questions parsed from the 2026 sample PDF`}
            caveat="Firm answers, pass/fail results, and follow-up selections are not public."
          />
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-bos-title">
        <div className="th-shell">
          <p className="ith-eyebrow">New Jersey Bureau of Securities</p>
          <h2 id="nj-bos-title">Acquired enforcement and regulatory documents</h2>
          <p className="nj-coverage-banner">{snap.enforcement.coverageLabel}</p>
          <p>
            No enforcement rate is published. A complete current state-RIA firm roster has not been acquired, so there
            is no safe denominator.
          </p>
          <div className="ith-findings">
            <article className="ith-finding">
              <h3>Documents by source year</h3>
              <p className="ith-kicker">Year taken from the official filename/date in the coverage manifest. Grain: document.</p>
              {yearEntries.map(([year, count]) => (
                <Bar key={year} value={count} max={yearMax} label={year} note={String(count)} />
              ))}
            </article>
            <article className="ith-finding">
              <h3>Documents by filename class</h3>
              <p className="ith-kicker">
                Classes are derived from official filenames, not a complete Bureau taxonomy and not a ranking.
              </p>
              {classEntries.map(([klass, count]) => (
                <Bar
                  key={klass}
                  value={count}
                  max={classMax}
                  label={NJ_DOCUMENT_CLASS_LABELS[klass] ?? klass}
                  note={String(count)}
                />
              ))}
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-issuer-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Issuer / exemption framework</p>
          <h2 id="nj-issuer-title">Official New Jersey filing classes</h2>
          <p>{snap.issuer.caveat} Issuer filings are not investment-adviser profiles.</p>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Official NJ filing classes">
            <table className="ith-table">
              <caption>Inventoried official form and filing classes. No public bulk filing index was acquired.</caption>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">What the official materials describe</th>
                </tr>
              </thead>
              <tbody>
                {snap.issuer.filingClasses.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.id}</th>
                    <td>{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-policy-title">
        <div className="th-shell">
          <p className="ith-eyebrow">General orders / policy</p>
          <h2 id="nj-policy-title">Rules that apply to classes of market participants</h2>
          <p>
            A Bureau order of general application is not adverse evidence against every firm. The live general-order
            HTML library is access-blocked; {snap.policy.modeledCurrent} current policy instruments are modeled from
            official public descriptions.
          </p>
          <ul className="ith-plain">
            {snap.policy.instruments.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                {item.effectiveOn ? ` · effective ${item.effectiveOn}` : ''} · {item.affected}. {item.note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-changed-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What changed</p>
          <h2 id="nj-changed-title">Source-backed current changes</h2>
          <ul className="ith-plain">
            <li>2026 annual investment-adviser written examination sample released; deadline {snap.exam.deadline}.</li>
            <li>2026 public sample includes custody, cybersecurity, complaints, discretion, and financial-condition families.</li>
            <li>IAR continuing-education policy effective 2025-01-01 (12 credits as officially described).</li>
          </ul>
          <p className="ith-kicker">Retrieval timestamps and HTML markup changes are not listed as regulatory events.</p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="nj-depth-title">Source families</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="NJ source family coverage">
            <table className="ith-table">
              <caption>Coverage describes availability. It does not describe firm quality.</caption>
              <thead>
                <tr>
                  <th scope="col">Family</th>
                  <th scope="col">Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Bureau enforcement documents</th>
                  <td>Partial historical corpus ({snap.enforcement.acquiredDocuments} official PDFs)</td>
                </tr>
                <tr>
                  <th scope="row">Annual IA examinations</th>
                  <td>2026 sample current; 2022–2025 announcements</td>
                </tr>
                <tr>
                  <th scope="row">General orders / policy</th>
                  <td>HTML library access-blocked; {snap.policy.modeledCurrent} modeled instruments</td>
                </tr>
                <tr>
                  <th scope="row">State registration</th>
                  <td>Complete NJ state-RIA roster pending official request</td>
                </tr>
                <tr>
                  <th scope="row">Issuer / exemption filings</th>
                  <td>Form-class inventory; no public bulk index</td>
                </tr>
                <tr>
                  <th scope="row">National SEC/IARD overlay</th>
                  <td>
                    {overlayCount.toLocaleString('en-US')} NJ principal-office roster firms (not state-RIA)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nj-gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t yet know</p>
          <h2 id="nj-gaps-title">Missing sources block a metric, not this page</h2>
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
