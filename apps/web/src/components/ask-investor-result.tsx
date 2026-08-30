import Link from 'next/link';
import { ASK_DEFINITIONS, INVESTOR_ASK_PAGE_SIZE } from '@ith/domain';
import type { InvestorAskResult } from '@/lib/ask/execute';

function askHref(q: string, page?: number) {
  const params = new URLSearchParams({ q });
  if (page && page > 1) params.set('page', String(page));
  return `/ask?${params.toString()}`;
}

export function AskInvestorResultView({ result }: { result: InvestorAskResult }) {
  const q = result.parsed.query;
  const def = q.definitionId ? ASK_DEFINITIONS[q.definitionId] : undefined;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
          We interpreted your question as
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.parsed.interpretation.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <dt className="text-xs uppercase text-[var(--ith-ink)]">{row.label}</dt>
              <dd className="text-base font-semibold text-[var(--ith-navy)]">{row.value}</dd>
            </div>
          ))}
        </dl>
        {result.parsed.geographyNote ? (
          <p className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">{result.parsed.geographyNote}</p>
        ) : null}
        <p className="mt-3 text-sm text-[var(--ith-ink)]">
          Natural-language parsing and regulatory execution stay separate. Change the question and resubmit.
        </p>
        <form action="/ask" method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="ask-edit" className="sr-only">
            Change interpretation
          </label>
          <input
            id="ask-edit"
            name="q"
            defaultValue={result.queryText}
            className="min-h-11 flex-1 rounded-xl border border-[var(--ith-border)] px-3 text-sm text-[var(--ith-navy)]"
          />
          <button type="submit" className="th-btn-primary min-h-11 px-4 text-sm">
            Change interpretation
          </button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {['Show SEC-registered RIAs in Florida.', 'Find CRD 123456.', 'What does RAUM mean?'].map((ex) => (
            <li key={ex}>
              <Link href={askHref(ex)} className="inline-flex min-h-11 items-center rounded-full border border-[var(--ith-border)] px-3 text-xs text-[var(--ith-navy)]">
                {ex}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {q.mode === 'fail_closed' ? (
        <section className="rounded-2xl border border-[var(--ith-border)] bg-[var(--ith-teal-mist)] p-5">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">This question is not supported as asked</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">{q.failReason}</p>
          {q.alternatives?.length ? (
            <ul className="mt-4 space-y-2">
              {q.alternatives.map((alt) => (
                <li key={alt}>
                  <Link href={askHref(alt)} className="font-semibold text-teal-800 underline-offset-2 hover:underline">
                    {alt}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {def ? (
        <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">{def.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">{def.body}</p>
        </section>
      ) : null}

      {result.counts.length ? (
        <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">
            {result.resultType === 'count' ? 'Count' : result.resultType === 'comparison' ? 'Comparable counts' : 'Distribution'}
          </h2>
          <ul className="mt-4 divide-y divide-[var(--ith-border)]">
            {result.counts.map((row) => (
              <li key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-sm text-[var(--ith-navy)]">{row.label}</span>
                <span className="tabular-nums font-semibold text-[var(--ith-navy)]">{row.value.toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--ith-ink)]">{result.counts[0]?.grain}</p>
        </section>
      ) : null}

      {result.results.length ? (
        <ol className="grid gap-4">
          {result.results.map((firm) => (
            <li key={firm.crd} className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-serif text-xl text-[var(--ith-navy)]">{firm.displayName}</h3>
                <span className="rounded-full border border-[var(--ith-border)] px-2 py-0.5 text-[11px] font-semibold">
                  {firm.firmTypeLabel}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">CRD</dt>
                  <dd className="font-semibold text-[var(--ith-navy)]">{firm.crd}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">Principal office</dt>
                  <dd>{firm.principalOffice}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">RAUM (Item 5F(2)(c))</dt>
                  <dd>{firm.raum ? `${firm.raum.display} (${firm.raum.exact})` : era(firm.firmType)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">Compensation methods (Item 5.E)</dt>
                  <dd>{firm.compensation.length ? firm.compensation.join('; ') : 'Not a Y/N method list on this card'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">Latest ADV filing in extract</dt>
                  <dd>{firm.filingDate ?? 'Not in this extract field'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--ith-ink)]">Source status text</dt>
                  <dd>{firm.statusLabel}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">
                <span className="font-semibold">Why this matched. </span>
                {firm.whyMatched}
              </p>
              {firm.publicationNote ? <p className="mt-2 text-xs text-[var(--ith-ink)]">{firm.publicationNote}</p> : null}
              {firm.href ? (
                <Link href={firm.href} className="th-btn-secondary mt-4 inline-flex min-h-11 items-center px-4 text-sm">
                  View firm research report
                </Link>
              ) : (
                <Link href={`/firms?q=${encodeURIComponent(firm.crd)}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-teal-800">
                  Open firm search for this CRD
                </Link>
              )}
            </li>
          ))}
        </ol>
      ) : null}

      {result.resultType === 'identifier' && !result.results.length && q.mode !== 'fail_closed' ? (
        <p className="rounded-2xl border border-[var(--ith-border)] p-5 text-sm">
          No current SEC/IARD roster firm matched labeled CRD {q.identifier?.value}. That is not a finding that the
          number is invalid in another system.
        </p>
      ) : null}

      {result.results.length && result.pagination.total > INVESTOR_ASK_PAGE_SIZE ? (
        <nav className="flex gap-3" aria-label="Pagination">
          {result.pagination.page > 1 ? (
            <Link href={askHref(result.queryText, result.pagination.page - 1)} className="th-btn-secondary min-h-11 px-4">
              Previous
            </Link>
          ) : null}
          {result.pagination.hasMore ? (
            <Link href={askHref(result.queryText, result.pagination.page + 1)} className="th-btn-primary min-h-11 px-4">
              Next
            </Link>
          ) : null}
          <p className="self-center text-xs text-[var(--ith-ink)]">
            Page {result.pagination.page} · {result.pagination.total.toLocaleString('en-US')} firm facts
          </p>
        </nav>
      ) : null}

      <details className="rounded-2xl border border-[var(--ith-border)] bg-[var(--ith-canvas)] p-5">
        <summary className="min-h-11 cursor-pointer font-semibold text-[var(--ith-navy)]">Trace this query</summary>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase">Contract</dt>
            <dd>{result.contract}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Source dataset</dt>
            <dd>{result.provenance.dataset}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Official as-of / retrieved</dt>
            <dd>
              {result.provenance.officialAsOf} / {result.provenance.retrievedAt}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Geography meaning</dt>
            <dd>{result.provenance.geographyMeaning}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">RAUM units</dt>
            <dd>{result.provenance.raumUnits}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Compensation taxonomy</dt>
            <dd>{result.provenance.compensationTaxonomy}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Identifier method</dt>
            <dd>{result.provenance.identifierMethod}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase">Elapsed</dt>
            <dd>{result.elapsedMs} ms</dd>
          </div>
        </dl>
        <ul className="mt-3 list-disc pl-5 text-xs text-[var(--ith-ink)]">
          {result.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function era(kind: string): string {
  return kind === 'era' ? 'ERA filers do not file Item 5F(2)(c) RAUM' : 'Not reported in this extract';
}
