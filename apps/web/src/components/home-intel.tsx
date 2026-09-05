import Link from 'next/link';
import { StatusLegend } from '@ith/ui';
import {
  INVESTOR_EVIDENCE_FAMILY_LABELS,
  INVESTOR_HOMEPAGE_STATE_CARDS,
  buildInvestorHomepageEvidenceInventory,
  type InvestorEvidenceFamily,
  type InvestorHomeIntelV1,
  type InvestorHomepageEvidenceMeasure,
} from '@ith/domain';
import { FirmSearchForm } from '@/components/firm-search';
import { HomeIntelChecklist } from '@/components/home-intel-checklist';

const FAMILY_ORDER = Object.keys(
  INVESTOR_EVIDENCE_FAMILY_LABELS,
) as InvestorEvidenceFamily[];

function MeasureCard({
  measure,
}: {
  measure: InvestorHomepageEvidenceMeasure;
}) {
  const clockLabel = measure.sourceAsOf
    ? 'Source as of'
    : measure.retrievedAt
      ? 'Retrieved'
      : measure.snapshotAsOf
        ? 'Accepted snapshot as of'
        : measure.generatedAt
          ? 'Network generated'
          : 'Source clock';
  const clock =
    measure.sourceAsOf ??
    measure.retrievedAt ??
    measure.snapshotAsOf ??
    measure.generatedAt;
  return (
    <article
      className={`ith-inventory-card ith-inventory-card--${measure.valueState.toLowerCase()}`}
    >
      <div className="ith-inventory-card__top">
        <p className="ith-metric-value">{measure.display}</p>
        <span className="ith-status-chip">
          {measure.valueState.replaceAll('_', ' ').toLowerCase()}
        </span>
      </div>
      <h3>{measure.label}</h3>
      <p>{measure.counts}</p>
      <dl className="ith-mini-facts">
        <div>
          <dt>Grain</dt>
          <dd>{measure.grain}</dd>
        </div>
        <div>
          <dt>Firm / entity class</dt>
          <dd>{measure.firmClass}</dd>
        </div>
        <div>
          <dt>Geography</dt>
          <dd>{measure.geography}</dd>
        </div>
        <div>
          <dt>{clockLabel}</dt>
          <dd>{clock ?? 'Not reported'}</dd>
        </div>
      </dl>
      <p className="ith-does-not">
        <strong>Does not count:</strong> {measure.doesNotCount}
      </p>
      {measure.coverageLimitation ? (
        <p className="ith-limitation">Coverage: {measure.coverageLimitation}</p>
      ) : null}
      <details className="ith-trace">
        <summary>Source and traceability</summary>
        <p>
          <strong>Agency / system:</strong> {measure.sourceSystem}
        </p>
        <p>
          <strong>Accepted artifact:</strong>{' '}
          <code>{measure.acceptedArtifact}</code>
        </p>
        {measure.sourceAsOf ? (
          <p>
            <strong>Source as of:</strong> {measure.sourceAsOf}
          </p>
        ) : (
          <p>
            <strong>Source date:</strong> Not reported
          </p>
        )}
        {measure.retrievedAt ? (
          <p>
            <strong>Retrieved:</strong> {measure.retrievedAt}
          </p>
        ) : null}
        {measure.snapshotAsOf ? (
          <p>
            <strong>Accepted snapshot as of:</strong> {measure.snapshotAsOf}
          </p>
        ) : null}
        {measure.generatedAt ? (
          <p>
            <strong>Snapshot generated:</strong> {measure.generatedAt}
          </p>
        ) : null}
        {measure.identityRule ? (
          <p>
            <strong>Identity rule:</strong> {measure.identityRule}
          </p>
        ) : null}
        <Link href={measure.researchDestination}>Open related research</Link>
      </details>
    </article>
  );
}

function StateCard({
  state,
}: {
  state: (typeof INVESTOR_HOMEPAGE_STATE_CARDS)[number];
}) {
  return (
    <article className="ith-state-card">
      <p className="ith-eyebrow">{state.code} state intelligence</p>
      <h3>{state.name}</h3>
      <p>{state.regulator}</p>
      <div className="ith-state-pair">
        <div>
          <strong>{state.principalOfficeFirms.toLocaleString('en-US')}</strong>
          <span>SEC/IARD firms reporting a principal office here</span>
        </div>
        <div>
          <strong>{state.rosterStatus}</strong>
          <span>Complete state-RIA roster</span>
        </div>
      </div>
      <ul>
        {state.evidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="ith-identity-note">{state.identityNote}</p>
      <p className="ith-limitation">{state.limitation}</p>
      <div className="ith-state-clocks">
        {state.sourceClocks.map((clock) => (
          <p key={clock.label}>
            <strong>{clock.label}</strong>
            <br />
            {clock.sourceAsOf ? (
              <>Source as of {clock.sourceAsOf}</>
            ) : (
              <>Source date not reported</>
            )}
            {clock.retrievedAt ? <> · Retrieved {clock.retrievedAt}</> : null}
            {clock.snapshotAsOf ? (
              <> · Accepted snapshot as of {clock.snapshotAsOf}</>
            ) : null}
            {clock.generatedAt ? (
              <> · Snapshot generated {clock.generatedAt}</>
            ) : null}
          </p>
        ))}
      </div>
      <Link className="ith-button ith-button--secondary" href={state.href}>
        Explore {state.name}
      </Link>
    </article>
  );
}

export function InvestorHomeIntelligence({
  intel,
}: {
  intel: InvestorHomeIntelV1;
}) {
  const inventory = buildInvestorHomepageEvidenceInventory();
  const byKey = new Map(inventory.map((item) => [item.key, item]));
  const metric = (key: string) => {
    const item = byKey.get(key);
    if (!item) throw new Error(`Missing homepage evidence measure: ${key}`);
    return item;
  };
  return (
    <main className="ith-home">
      <section className="ith-section ith-hero" aria-labelledby="home-title">
        <div className="ith-shell ith-hero-grid">
          <div>
            <p className="ith-eyebrow">
              Independent investment-adviser intelligence
            </p>
            <h1 id="home-title">
              Research the firm. Trace the Form ADV evidence. Understand the
              regulatory context.
            </h1>
            <p className="ith-lede">
              InvestorTrustHub connects SEC/IARD firm identity to filing
              history, reported RAUM, business methods, ownership and control,
              disclosure indicators, and state securities research—where public
              evidence supports the connection.
            </p>
            <div className="ith-actions">
              <a className="ith-button" href="#research">
                Research an adviser firm
              </a>
              <a className="ith-button ith-button--secondary" href="#states">
                Explore state intelligence
              </a>
            </div>
            <p className="ith-independent">
              Public-source research. No paid ranking. No proprietary score. You
              decide.
            </p>
          </div>
          <aside
            className="ith-hero-signal"
            aria-label="Current source freshness"
          >
            <p className="ith-eyebrow">Current national source</p>
            <strong>SEC/IARD · Form ADV</strong>
            <dl>
              <div>
                <dt>Published</dt>
                <dd>{metric('sec_iard_roster').sourceAsOf}</dd>
              </div>
              <div>
                <dt>Retrieved</dt>
                <dd>{metric('sec_iard_roster').retrievedAt}</dd>
              </div>
              <div>
                <dt>Network rollup generated</dt>
                <dd>{intel.freshnessClocks?.generatedAt.slice(0, 10)}</dd>
              </div>
              <div>
                <dt>Newest documented source as of</dt>
                <dd>
                  {intel.freshnessClocks?.newestDocumentedSourceAsOf ??
                    'Not reported'}
                </dd>
              </div>
            </dl>
            <p>
              These are separate clocks. A deployment date is not an agency
              source date.
            </p>
          </aside>
        </div>
      </section>

      <section
        id="research"
        className="ith-section ith-tint"
        aria-labelledby="research-title"
      >
        <div className="ith-shell ith-search-layout">
          <div>
            <p className="ith-eyebrow">Start with identity</p>
            <h2 id="research-title">Research an adviser firm</h2>
            <p>
              Search by firm name, CRD number, or SEC file number. Firm research
              is separate from individual/IAR identity.
            </p>
          </div>
          <FirmSearchForm q="" state="" />
        </div>
      </section>

      <section className="ith-section" aria-labelledby="layers-title">
        <div className="ith-shell">
          <p className="ith-eyebrow">Evidence around a firm</p>
          <h2 id="layers-title">
            A regulatory filing system, organized for research
          </h2>
          <p className="ith-section-lede">
            Eight public evidence families preserve source-native grains instead
            of collapsing firms, filings, attributes, owners, and regulatory
            documents into one artificial total.
          </p>
          <div className="ith-layer-index">
            {FAMILY_ORDER.map((family, index) => (
              <a key={family} href={`#family-${family.toLowerCase()}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {INVESTOR_EVIDENCE_FAMILY_LABELS[family]}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="ith-section ith-dark" aria-labelledby="scale-title">
        <div className="ith-shell">
          <p className="ith-eyebrow">SEC/IARD national scale</p>
          <h2 id="scale-title">Separate universes. Separately traceable.</h2>
          <div className="ith-scale-band">
            {[
              'sec_iard_roster',
              'form_adv_filings',
              'form_adv_attributes',
              'ownership_control',
            ].map((key) => {
              const item = metric(key);
              return (
                <div key={key}>
                  <strong>{item.display}</strong>
                  <span>{item.label}</span>
                  <small>{item.grain}</small>
                </div>
              );
            })}
          </div>
          <div className="ith-roster-partition">
            <span>
              <strong>{metric('ria_facts').display}</strong> RIA facts
            </span>
            <b>+</b>
            <span>
              <strong>{metric('era_facts').display}</strong> ERA facts
            </span>
            <b>=</b>
            <span>
              <strong>{metric('sec_iard_roster').display}</strong> roster firms
            </span>
          </div>
          <p className="ith-dark-note">
            RIA and ERA are mutually exclusive source-native classes in this
            roster. Filings, attributes, and ownership observations are evidence
            around firms—not additional firms.
          </p>
        </div>
      </section>

      <section
        id="form-adv"
        className="ith-section"
        aria-labelledby="adv-title"
      >
        <div className="ith-shell">
          <p className="ith-eyebrow">Form ADV evidence depth</p>
          <h2 id="adv-title">
            From firm identity to structured filing evidence
          </h2>
          <div className="ith-adv-flow">
            {[
              [
                '01',
                'Firm identity',
                'CRD, SEC file and current RIA/ERA class.',
              ],
              [
                '02',
                'Filing history',
                'Filings, amendments, withdrawals and supported successor links.',
              ],
              [
                '03',
                'Business evidence',
                'Reported services, compensation methods and RAUM fields.',
              ],
              [
                '04',
                'Relationships',
                'Schedule A/B ownership and control observations.',
              ],
              [
                '05',
                'Regulatory context',
                'Item 11 indicators and safely attributable public state evidence.',
              ],
            ].map(([n, title, copy]) => (
              <div key={n}>
                <span>{n}</span>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
          <p className="ith-semantic-note">
            A layer may be absent for a firm. Missing evidence is not zero and
            does not establish a clean history.
          </p>
        </div>
      </section>

      <section
        className="ith-section ith-tint"
        aria-labelledby="inventory-title"
      >
        <div className="ith-shell">
          <p className="ith-eyebrow">Full public evidence inventory</p>
          <h2 id="inventory-title">What the homepage can substantiate</h2>
          <p className="ith-section-lede">
            Every measure below declares its grain, geography, clock, accepted
            artifact, and limitation. Unknown state rosters remain unknown.
          </p>
          <nav className="ith-family-nav" aria-label="Evidence families">
            {FAMILY_ORDER.map((family) => (
              <a key={family} href={`#family-${family.toLowerCase()}`}>
                {INVESTOR_EVIDENCE_FAMILY_LABELS[family]}
              </a>
            ))}
          </nav>
          <div className="ith-inventory">
            {FAMILY_ORDER.map((family) => {
              const measures = inventory.filter(
                (item) => item.family === family,
              );
              return (
                <section
                  id={`family-${family.toLowerCase()}`}
                  className="ith-family"
                  key={family}
                >
                  <header>
                    <p className="ith-eyebrow">Evidence family</p>
                    <h3>{INVESTOR_EVIDENCE_FAMILY_LABELS[family]}</h3>
                    <span>
                      {measures.length} separate measure
                      {measures.length === 1 ? '' : 's'}
                    </span>
                  </header>
                  <div className="ith-family-grid">
                    {measures.map((item) => (
                      <MeasureCard key={item.key} measure={item} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ith-section" aria-labelledby="identity-title">
        <div className="ith-shell">
          <p className="ith-eyebrow">Official identity systems</p>
          <h2 id="identity-title">
            Connected only when evidence supports the relationship
          </h2>
          <div className="ith-identity-map">
            <div className="ith-identity-hub">Firm research identity</div>
            {[
              'Firm CRD number',
              'SEC file number',
              'Form ADV filing ID',
              'State registration identity',
              'Principal-office geography',
            ].map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <p className="ith-semantic-note">
            These identifiers and facts are separate—not a universal arrow
            chain. Firm CRD is not individual CRD; SEC file is not CRD;
            principal office is not a state-registration roster or service
            territory.
          </p>
        </div>
      </section>

      <section className="ith-section ith-dark" aria-labelledby="meaning-title">
        <div className="ith-shell ith-split">
          <div>
            <p className="ith-eyebrow">Reported business evidence</p>
            <h2 id="meaning-title">
              RAUM, compensation, and ownership need context
            </h2>
            <p>
              RAUM is a source-reported regulatory field for RIAs. Reported zero
              is different from missing. InvestorTrustHub does not publish a
              national summed-dollar AUM headline or use size as a quality
              proxy.
            </p>
          </div>
          <div className="ith-contrast">
            <p>
              <strong>{metric('ria_raum_observations').display}</strong> RIA
              RAUM observations
            </p>
            <p>
              <strong>{metric('ownership_control').display}</strong> Schedule
              A/B observations—not unique owners
            </p>
            <p>
              <strong>Independent indicators</strong> Compensation methods can
              overlap and do not sum to 100%
            </p>
          </div>
        </div>
      </section>

      <section className="ith-section" aria-labelledby="disclosure-title">
        <div className="ith-shell ith-split">
          <div>
            <p className="ith-eyebrow">Disclosure and regulatory evidence</p>
            <h2 id="disclosure-title">An indicator is not a finding</h2>
            <p>
              {metric('item11_yes').display} current firm facts report a Form
              ADV Item 11 YES indicator. This says disclosure information
              exists; it does not establish wrongdoing, an enforcement action, a
              conviction, or risk.
            </p>
          </div>
          <div className="ith-contrast ith-contrast--light">
            <p>
              <strong>Item 11 YES</strong> is not a finding of wrongdoing.
            </p>
            <p>
              <strong>Item 11 NO</strong> is not proof of a clean history.
            </p>
            <p>
              <strong>Internal disclosure-event storage</strong> is not a public
              homepage measure.
            </p>
          </div>
        </div>
      </section>

      <section
        id="states"
        className="ith-section ith-tint"
        aria-labelledby="states-title"
      >
        <div className="ith-shell">
          <p className="ith-eyebrow">
            Five published state intelligence surfaces
          </p>
          <h2 id="states-title">
            Federal identity plus state regulatory context
          </h2>
          <p className="ith-section-lede">
            Each card distinguishes the SEC/IARD principal-office overlay from
            the complete state-RIA roster. Cards explain coverage; they are not
            ratings.
          </p>
          <div className="ith-state-grid">
            {INVESTOR_HOMEPAGE_STATE_CARDS.map((state) => (
              <StateCard key={state.code} state={state} />
            ))}
          </div>
          <aside className="ith-florida-limit">
            <div>
              <p className="ith-eyebrow">Coverage distinction</p>
              <h3>
                Florida firm research is national—not a published state surface
              </h3>
              <p>
                Florida firms are searchable through national SEC/IARD research.
                State-specific Florida securities intelligence has not been
                published, and absence of a state page does not mean zero firms
                or zero evidence.
              </p>
            </div>
            <Link
              className="ith-button ith-button--secondary"
              href="/firms?state=FL"
            >
              Research Florida firms
            </Link>
          </aside>
        </div>
      </section>

      <section className="ith-section" aria-labelledby="geography-title">
        <div className="ith-shell">
          <p className="ith-eyebrow">Subordinate national lens</p>
          <h2 id="geography-title">Principal-office geography</h2>
          <p className="ith-section-lede">
            These counts show the reported principal office of current SEC/IARD
            roster firms. They do not show state registration, clients, service
            territory, quality, or research depth.
          </p>
          <div className="ith-geography-grid">
            {intel.geography.cells.map((cell) => (
              <Link key={cell.region ?? 'unresolved'} href={cell.searchHref}>
                <strong>{cell.count.toLocaleString('en-US')}</strong>
                <span>{cell.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ith-section ith-tint" aria-labelledby="process-title">
        <div className="ith-shell ith-split">
          <div>
            <p className="ith-eyebrow">Research process</p>
            <h2 id="process-title">
              Evidence informs a decision; it does not make one
            </h2>
            <HomeIntelChecklist items={intel.checklist} />
          </div>
          <div>
            <h3>What the evidence does not establish</h3>
            <ul className="ith-plain">
              <li>Reported registration does not equal a recommendation.</li>
              <li>ERA status does not imply fraud or misconduct.</li>
              <li>RAUM does not measure performance or quality.</li>
              <li>Item 11 and enforcement documents are different grains.</li>
              <li>Name-only adverse evidence is not a safe profile match.</li>
              <li>No result is not proof of a clean record.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="ith-section ith-dark" aria-labelledby="ask-title">
        <div className="ith-shell ith-search-layout">
          <div>
            <p className="ith-eyebrow">Ask InvestorTrustHub</p>
            <h2 id="ask-title">Turn a question into an evidence trail</h2>
            <p>
              Ask about registration class, filings, compensation, ownership,
              disclosures, or state verification. Answers should point back to
              official evidence and its limitations.
            </p>
          </div>
          <form action="/ask" method="get" className="ith-ask-form">
            <label htmlFor="home-question">Your research question</label>
            <input
              id="home-question"
              name="q"
              placeholder="What should I verify about this advisory firm?"
            />
            <button className="ith-button" type="submit">
              Ask InvestorTrustHub
            </button>
          </form>
        </div>
      </section>

      <section className="ith-section" aria-labelledby="sources-title">
        <div className="ith-shell">
          <p className="ith-eyebrow">Sources and methodology</p>
          <h2 id="sources-title">
            Trace the clocks, grain, and publication gate
          </h2>
          <p className="ith-section-lede">
            The homepage inventory is projected from accepted national and state
            artifacts. Source-as-of, retrieval, and snapshot-generation clocks
            remain distinct; only public, public-partial, and public-unknown
            measures render.
          </p>
          <div className="ith-actions">
            <Link
              className="ith-button ith-button--secondary"
              href="/methodology"
            >
              Read methodology
            </Link>
            <Link className="ith-button ith-button--secondary" href="/sources">
              Browse sources
            </Link>
          </div>
          <div className="mt-10">
            <StatusLegend />
          </div>
          <p className="ith-kicker">
            Snapshot {intel.homepagePublicationVersion}. Payload{' '}
            {intel.payloadFingerprint.slice(0, 12)}… No score. No ranking.
          </p>
        </div>
      </section>
    </main>
  );
}
