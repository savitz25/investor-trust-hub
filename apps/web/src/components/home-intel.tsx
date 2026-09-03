import Link from 'next/link';
import { StatusLegend } from '@ith/ui';
import type { FeaturedFinding, InvestorHomeIntelV1, MetricWithProvenance } from '@ith/domain';
import { SEARCH_STATE_NONE, V1_SEC_ROSTER } from '@ith/domain';
import { FirmSearchForm } from '@/components/firm-search';
import { HomeIntelChecklist } from '@/components/home-intel-checklist';

function Trace({ metric }: { metric: MetricWithProvenance }) {
  return (
    <details className="ith-disclose">
      <summary>Trace this number</summary>
      <p>
        <strong>Agency / source.</strong> U.S. Securities and Exchange Commission — IAPD / Form ADV.
      </p>
      <p>
        <strong>Dataset.</strong> {metric.sourceIds.join(', ')}.
      </p>
      <p>
        <strong>Definition.</strong> {metric.cohortDefinition}
      </p>
      <p>
        <strong>Grain.</strong> {metric.grain}
      </p>
      <p>
        <strong>Calculation.</strong> {metric.method}
      </p>
      <p>
        <strong>Official period.</strong> {metric.sourceAsOf} · <strong>Retrieved.</strong> {metric.retrievedAt}
      </p>
      <p>
        <strong>Payload key.</strong> <code>{metric.payloadKey}</code>
      </p>
      {metric.exclusions.length > 0 ? (
        <p>
          <strong>Excluded.</strong> {metric.exclusions.join('; ')}
        </p>
      ) : null}
      <p>
        <strong>Limitation.</strong> {metric.limitation}
      </p>
    </details>
  );
}

function Bar({
  value,
  max,
  label,
  note,
}: {
  value: number;
  max: number;
  label: string;
  note: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((100 * value) / max)) : 0;
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

function Finding({ finding }: { finding: FeaturedFinding }) {
  const max = Math.max(...finding.series.map((row) => row.count), 1);
  const independent = finding.visualization === 'method_flags';
  return (
    <article className="ith-finding">
      <p className="ith-eyebrow">{finding.storyType}</p>
      <h3>{finding.title}</h3>
      <p>{finding.summary}</p>
      <figure>
        <figcaption>{finding.chartCaption}</figcaption>
        <div className="ith-chart" role="img" aria-label={finding.chartCaption}>
          {finding.series.map((row) => (
            <Bar
              key={row.key}
              value={row.count}
              max={independent ? row.shareOf : max}
              label={row.label}
              note={`${row.count.toLocaleString('en-US')} · ${((100 * row.count) / row.shareOf).toFixed(1)}% of ${row.shareOf.toLocaleString('en-US')}${independent ? ' (independent)' : ''}`}
            />
          ))}
        </div>
        <div className="ith-table-scroll" tabIndex={0} role="region" aria-label={finding.chartCaption}>
          <table className="ith-table">
            <caption>
              {independent
                ? 'Each row is an independent YES count. Rows do not sum to 100%.'
                : finding.chartCaption}
            </caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Count</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {finding.series.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{row.count.toLocaleString('en-US')}</td>
                  <td>
                    {((100 * row.count) / row.shareOf).toFixed(1)}% of {row.shareOf.toLocaleString('en-US')}
                    {independent ? ' (independent method)' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
      <details className="ith-disclose">
        <summary>Explain this chart</summary>
        <p>
          <strong>What am I looking at?</strong> {finding.chartCaption}
        </p>
        <p>
          <strong>Why might this matter?</strong> {finding.whyItMatters}
        </p>
        <p>
          <strong>What this does not mean</strong>
        </p>
        <ul className="ith-plain">
          {finding.doesNotMean.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>
          <strong>Source.</strong> {finding.sourceIds.join(', ')}. Official period {finding.officialAsOf}. Retrieved{' '}
          {finding.retrievedAt}.
        </p>
        <p>
          <strong>Limitation.</strong> {finding.limitation}
        </p>
      </details>
    </article>
  );
}

export function InvestorHomeIntelligence({ intel }: { intel: InvestorHomeIntelV1 }) {
  const resolvedMax = Math.max(...intel.geography.cells.filter((cell) => cell.region).map((cell) => cell.count), 1);
  const snapshotMetrics = [
    intel.snapshot.rosterUniverse,
    intel.snapshot.ria,
    intel.snapshot.era,
    intel.snapshot.advObservations,
    intel.snapshot.indexableTrustReports,
  ];

  return (
    <div className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="home-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · National adviser-firm intelligence</p>
          <h1 id="home-title">Understand investment advisers before you choose one.</h1>
          <p className="ith-lede">
            Research SEC/IARD registration, reported regulatory assets, compensation methods, ownership, and public
            regulatory evidence. We organize Form ADV facts. We do not rank advisers or pick investments.{' '}
            <strong>Research the firm. Trace the evidence. You decide.</strong>
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <a className="th-btn-primary th-btn-hero" href="#record">
              Explore Investor Intelligence
            </a>
            <Link className="th-btn-secondary th-btn-hero" href="/firms">
              Research an investment firm
            </Link>
            <Link className="th-btn-secondary th-btn-hero" href="/ask">
              Ask InvestorTrustHub
            </Link>
          </div>
          <div className="ith-lookup" id="lookup">
            <p className="ith-eyebrow">Firm lookup</p>
            <p className="ith-kicker">
              Search firm name, CRD, or SEC file number. This is not a live professional / IAR directory.
            </p>
            <FirmSearchForm q="" state="" />
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="record" aria-labelledby="record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="record-title">What is in this research universe</h2>
          <p>
            Snapshot metrics for the current SEC/IARD roster. These numbers describe the extract. They do not grade
            firms.
          </p>
          <div className="ith-metric-rail">
            {snapshotMetrics.map((metric) => (
              <article className="ith-metric" key={metric.metricId}>
                <p className="ith-metric__value">{metric.display}</p>
                <h3>{metric.label}</h3>
                <p className="ith-kicker">
                  {metric.grain}. As-of {metric.sourceAsOf} · Retrieved {metric.retrievedAt}
                </p>
                <Trace metric={metric} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="findings" aria-labelledby="findings-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What the data says</p>
          <h2 id="findings-title">Three national evidence stories</h2>
          <p>Exactly three benchmarks. None is a ranking, score, or recommendation.</p>
          <div className="ith-findings">
            {intel.findings.map((finding) => (
              <Finding key={finding.storyId} finding={finding} />
            ))}
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="depth" aria-labelledby="depth-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence depth</p>
          <h2 id="depth-title">How much research evidence is available?</h2>
          <p>Coverage describes research availability. It does not describe firm quality.</p>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Evidence availability by family">
            <table className="ith-table">
              <caption>Evidence availability by family</caption>
              <thead>
                <tr>
                  <th scope="col">Evidence family</th>
                  <th scope="col">Depth</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {intel.evidenceDepth.map((row) => (
                  <tr key={row.family}>
                    <th scope="row">{row.family}</th>
                    <td>{row.depth}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="gaps" aria-labelledby="gaps-title">
        <div className="th-shell">
          <p className="ith-eyebrow">What we don&apos;t know</p>
          <h2 id="gaps-title">Limits of this national extract</h2>
          <ul className="ith-plain">
            {intel.missingness.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" id="explore" aria-labelledby="explore-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Explore firms by principal office</p>
          <h2 id="explore-title">Where roster firms report a principal office</h2>
          <p>
            {intel.geography.resolved.display} of {V1_SEC_ROSTER.totalFacts.toLocaleString('en-US')} roster firms have a
            resolved principal-office region. {intel.geography.unresolved.display} are unresolved. Principal office is
            not service territory. A firm may serve clients elsewhere. Color intensity is research volume, not quality.
          </p>
          <div className="ith-metric-rail" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <article className="ith-metric">
              <p className="ith-metric__value">{intel.geography.resolved.display}</p>
              <h3>{intel.geography.resolved.label}</h3>
              <Trace metric={intel.geography.resolved} />
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{intel.geography.unresolved.display}</p>
              <h3>{intel.geography.unresolved.label}</h3>
              <Trace metric={intel.geography.unresolved} />
            </article>
          </div>
          <p className="ith-lede" style={{ marginTop: '1.25rem' }}>
            <Link href="/new-jersey">New Jersey securities intelligence</Link> organizes Bureau of Securities
            documents, annual IA examination themes, and issuer-filing frameworks.{' '}
            <Link href="/california">California securities intelligence</Link> organizes the SEC/IARD California
            principal-office overlay and DFPI verification paths. Neither page is a complete state-registered adviser
            directory.
          </p>
          <div className="ith-geo" aria-label="Principal-office firm counts by reported region">
            {intel.geography.cells
              .filter((cell) => cell.region)
              .map((cell) => (
                <Link
                  key={cell.region}
                  className="ith-geo-cell"
                  href={cell.searchHref}
                  style={{ ['--ith-vol' as string]: String(cell.count / resolvedMax) }}
                >
                  <strong>{cell.region}</strong>
                  <span aria-hidden="true">{cell.count.toLocaleString('en-US')}</span>
                  <span className="sr-only">
                    {cell.name}. {cell.count.toLocaleString('en-US')} roster firms report a principal office here. Opens
                    firm search for that state. Not a service territory.
                  </span>
                </Link>
              ))}
            <Link className="ith-geo-cell" data-unresolved="true" href={`/firms?state=${SEARCH_STATE_NONE}`}>
              <strong>n/a</strong>
              <span aria-hidden="true">{intel.geography.unresolved.display}</span>
              <span className="sr-only">
                {intel.geography.unresolved.display} roster firms have unresolved principal-office region. Opens firm
                search for state not provided.
              </span>
            </Link>
          </div>
          <details className="ith-disclose">
            <summary>Accessible principal-office table</summary>
            <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Principal-office counts">
              <table className="ith-table">
                <caption>Roster principal-office counts. Links open /firms search, not state Intelligence pages.</caption>
                <thead>
                  <tr>
                    <th scope="col">Region</th>
                    <th scope="col">Firms</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {intel.geography.cells.map((cell) => (
                    <tr key={cell.region ?? 'unresolved'}>
                      <th scope="row">
                        <Link href={cell.searchHref}>{cell.name}</Link>
                      </th>
                      <td>{cell.count.toLocaleString('en-US')}</td>
                      <td>{cell.meaning === 'unresolved' ? 'Unresolved region' : 'Reported principal office'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>

      <section className="ith-intel-section" id="axis" aria-labelledby="axis-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Explore the evidence</p>
          <h2 id="axis-title">Filing dimensions that exist today</h2>
          <p>Only dimensions with current evidence. No fake tools for missing families.</p>
          <div className="ith-axis">
            {intel.secondAxis.map((item) => (
              <Link className="ith-cta" href={item.href} key={item.id}>
                <p className="ith-eyebrow">{item.status}</p>
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="ask" aria-labelledby="ask-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Ask the market</p>
          <h2 id="ask-title">Structured questions, not a chatbot</h2>
          <form action="/ask" method="get" className="mb-6 max-w-2xl" role="search" aria-label="Ask InvestorTrustHub">
            <label htmlFor="home-ask-q" className="sr-only">
              Ask InvestorTrustHub
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="home-ask-q"
                name="q"
                placeholder="Show SEC-registered RIAs in Florida."
                className="min-h-12 flex-1 rounded-xl border border-[var(--ith-border)] px-4"
              />
              <button type="submit" className="th-btn-primary min-h-12 px-5">
                Ask
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--ith-ink)]">
              Structured SEC/IARD research. Not a recommendation engine.{' '}
              <Link href="/ask" className="font-semibold text-teal-800">
                Open Ask InvestorTrustHub
              </Link>
            </p>
          </form>
          <div className="ith-ask">
            {intel.ask.map((item) => (
              <details key={item.id} className="ith-disclose">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
                <p>
                  <Link href={item.href}>{item.hrefLabel}</Link>
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="ith-intel-section" id="use" aria-labelledby="use-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Use the research</p>
          <h2 id="use-title">Act after you understand the evidence</h2>
          <div className="ith-cta-grid">
            {intel.tools.map((tool) => (
              <Link className="ith-cta" href={tool.href} key={tool.label}>
                <strong>{tool.label}</strong>
                <span>{tool.note}</span>
              </Link>
            ))}
          </div>
          <h3>Research checklist</h3>
          <p>This measures your due diligence process. It is not a Trust Score, Adviser Score, or Risk Score.</p>
          <HomeIntelChecklist items={intel.checklist} />
          <h3>Evidence journey</h3>
          <ol className="ith-journey">
            {intel.evidenceJourney.map((step) => (
              <li key={step.stepId}>
                {step.label} — {step.status.replaceAll('_', ' ')}. {step.note}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ith-intel-section" id="sources" aria-labelledby="sources-title">
        <div className="th-shell">
          <p className="ith-eyebrow">Evidence / sources / limitations</p>
          <h2 id="sources-title">Where the numbers come from</h2>
          <div className="ith-table-scroll" tabIndex={0} role="region" aria-label="Source ledger">
            <table className="ith-table">
              <caption>Source ledger for homepage families</caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Agency</th>
                  <th scope="col">As-of</th>
                  <th scope="col">Retrieved</th>
                  <th scope="col">Used for</th>
                </tr>
              </thead>
              <tbody>
                {intel.sources.map((row) => (
                  <tr key={row.sourceId}>
                    <th scope="row">
                      <a href={row.officialUrl}>{row.dataset}</a>
                    </th>
                    <td>{row.agency}</td>
                    <td>{row.officialAsOf}</td>
                    <td>{row.retrievedAt}</td>
                    <td>{row.usedFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Limitations</h3>
          <ul className="ith-plain">
            {intel.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-10">
            <StatusLegend />
          </div>
          <p className="ith-kicker">
            Snapshot {intel.homepagePublicationVersion}. Payload {intel.payloadFingerprint.slice(0, 12)}… Change
            capability: {intel.changeCapability.status}. Score: none. Ranking: none.
          </p>
        </div>
      </section>
    </div>
  );
}
