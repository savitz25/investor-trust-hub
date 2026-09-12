import Link from 'next/link';
import { ASK_DEFINITIONS, INVESTOR_ASK_PAGE_SIZE, REGION_NAMES } from '@ith/domain';
import { INVESTOR_OFFICIAL_RESEARCH, researchRecovery } from '@/lib/ask/recovery';
import { overrideEntries } from '@/lib/ask/request';
import type { InvestorAskOverrides } from '@ith/domain';
import type { InvestorAskResult } from '@/lib/ask/execute';
import { SearchAnalytics } from '@/components/specialist-search/search-analytics';

function askHref(q: string, page?: number, overrides?:InvestorAskOverrides) {
  const params = new URLSearchParams({ q });
  for(const[k,v]of overrideEntries(overrides))params.set(k,v);
  if (page && page > 1) params.set('page', String(page));
  return `/ask?${params.toString()}`;
}

export function AskInvestorResultView({ result }: { result: InvestorAskResult }) {
  const q = result.parsed.query;
  const def = q.definitionId ? ASK_DEFINITIONS[q.definitionId] : undefined;
  const recovery=researchRecovery(q);

  return (
    <div className="min-w-0 space-y-8 [overflow-wrap:anywhere]" data-specialist-results>
      <SearchAnalytics resultCount={result.results.length} dimensions={{ hub: 'investor', intent: q.mode, firmClass: q.firmType ?? 'unspecified', state: q.geography?.type === 'principal_office_state' ? q.geography.value : 'none', hasIdentifier: Boolean(q.identifier), identifierType: q.identifier?.type === 'crd' ? 'firm_crd' : q.identifier?.type ?? 'none', raumBand: q.raum?.bandId ?? (q.raum ? 'custom' : 'none'), compensationMethod: q.compensationMethods?.join('+') ?? 'none', affiliation: q.affiliationField ?? 'none', evidenceFamily: q.evidenceFamilies?.join('+') ?? 'none', coverageState: q.mode === 'fail_closed' ? 'UNSUPPORTED' : 'KNOWN' }} />
      <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
          We interpreted your question as
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.parsed.interpretation.map((row) => (
            <div key={`${row.label}-${row.value}`} className="min-w-0 rounded-xl bg-[var(--ith-canvas)] p-3">
              <dt className="text-xs uppercase text-[var(--ith-ink)]">{row.label}</dt>
              <dd className="break-words text-base font-semibold text-[var(--ith-navy)]">{row.value}</dd>
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
          {overrideEntries(q.inputOverrides,false).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}
          <label htmlFor="ask-edit" className="sr-only">
            Change interpretation
          </label>
          <input
            id="ask-edit"
            name="q"
            defaultValue={result.queryText}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--ith-border)] px-3 text-sm text-[var(--ith-navy)]"
          />
          <button type="submit" data-specialist-event="refine" className="th-btn-primary min-h-11 px-4 text-sm">
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
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">{q.terminalState==='NEEDS_CLARIFICATION'?'One detail is needed':q.intent==='UNSUPPORTED_PERSONAL_ADVICE'?'Research before you decide':'Research capability'}</h2>
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

      {q.mode==='fail_closed' && ['FORM_ADV_RESEARCH','DISCLOSURE_RESEARCH'].includes(q.intent??'') && !q.nameQuery && !q.identifier ? <form action="/ask" className="rounded-xl border p-5 grid gap-3">
        <input type="hidden" name="q" value={result.queryText}/>{overrideEntries(q.inputOverrides,false).map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<label htmlFor="firm-identity">Firm name</label><input id="firm-identity" name="identity" maxLength={120} required className="min-h-11 min-w-0 border rounded-lg p-3"/><button className="th-btn-primary min-h-11">Find firm candidates</button>
        <p className="text-sm">Or edit the question to include a labeled firm CRD or SEC file number.</p>
      </form>:null}
      {q.geography?.type==='principal_office_city' && !q.geography.state ? <form action="/ask" className="rounded-xl border p-5 grid gap-3"><input type="hidden" name="q" value={result.queryText}/>{overrideEntries(q.inputOverrides).filter(([k])=>k!=='state'&&k!=='broaden').map(([k,v])=><input key={k} type="hidden" name={k} value={v}/>)}<label htmlFor="office-state-choice">State for {q.geography.value}</label><select id="office-state-choice" name="state" required className="min-h-11 border rounded-lg p-3"><option value="">Choose state</option>{Object.entries(REGION_NAMES).map(([c,n])=><option key={c} value={c}>{n}</option>)}</select><button className="th-btn-primary min-h-11">Apply city and state</button></form>:null}
      {q.geography?.type==='principal_office_city' && q.geography.state && !q.identifier && !q.registrationJurisdictions?.length ? <Link href={askHref(result.queryText,1,{...q.inputOverrides,broaden:q.geography.state})} className="th-btn-secondary inline-flex min-h-11 items-center px-4">Research {REGION_NAMES[q.geography.state]??q.geography.state} principal offices instead</Link>:null}
      {result.answer?<section className="rounded-xl border p-5"><h2 className="font-serif text-xl">{result.candidateSelection?'Select the firm':'Research answer'}</h2><p className="mt-3">{result.answer}</p></section>:null}
      {recovery?<section className="rounded-xl border p-5"><Link href={recovery.href} className="th-btn-secondary inline-flex min-h-11 items-center">{recovery.label}</Link><p className="mt-2 text-sm">{recovery.limitation}</p></section>:null}
      {(q.identifier||q.intent==='FORM_ADV_RESEARCH'||q.intent==='DISCLOSURE_RESEARCH'||q.intent==='REGISTRATION_RESEARCH'||q.definitionId==='form_adv')?<section className="rounded-xl border p-5"><a href={INVESTOR_OFFICIAL_RESEARCH.url} target="_blank" rel="noopener noreferrer" className="th-btn-secondary inline-flex min-h-11 items-center">Research on official SEC / IAPD</a>{q.identifier?<p className="mt-2 break-words">Search {q.identifier.type==='crd'?'firm CRD':'SEC file'} {q.identifier.value}.</p>:null}<p className="mt-2 text-sm">{INVESTOR_OFFICIAL_RESEARCH.limitation}</p></section>:null}

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
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--ith-ink)]">Evidence available</p>
                <p className="mt-1 text-sm text-[var(--ith-ink)]">SEC/IARD firm identity, current Form ADV facts, reported RAUM, compensation methods, affiliations and filing date where present.</p>
              </div>
              {firm.publicationNote ? <p className="mt-2 text-xs text-[var(--ith-ink)]">{firm.publicationNote}</p> : null}
              {firm.selectionHref?<Link href={firm.selectionHref} className="th-btn-primary mt-3 inline-flex min-h-11 items-center px-4">Select this firm for the question</Link>:null}
              <details data-specialist-event="trace_open" className="mt-3 rounded-xl border border-[var(--ith-border)] p-3">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--ith-navy)]">Trace this result</summary>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs uppercase">Identity</dt><dd>Firm CRD {firm.crd}; {firm.firmTypeLabel}</dd></div>
                  <div><dt className="text-xs uppercase">Source as of</dt><dd>{firm.officialAsOf ?? 'Official publication date not established'}</dd></div>
                  <div><dt className="text-xs uppercase">Geography meaning</dt><dd>{result.provenance.geographyMeaning}</dd></div>
                  <div><dt className="text-xs uppercase">Publication</dt><dd>{firm.currentlyIndexable ? 'Public research profile published' : 'No public research profile is currently published for this identity'}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-[var(--ith-ink)]">RAUM is reported size, not performance. Compensation fields are methods, not fee amounts. Registration is not endorsement.</p>
              </details>
              {firm.href ? (
                <Link data-specialist-event="profile_open" href={firm.href} className="th-btn-secondary mt-4 inline-flex min-h-11 items-center px-4 text-sm">
                  Research this adviser
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

      {q.identifier && !result.results.length && q.mode !== 'fail_closed' ? (
        <p className="rounded-2xl border border-[var(--ith-border)] p-5 text-sm">
          We did not find this {q.identifier?.type === 'sec_file_number' ? 'SEC file number' : 'firm CRD'} in the current published SEC/IARD research corpus. That is not proof the identifier is invalid in another regulatory or person context.
        </p>
      ) : null}

      {!result.results.length && !q.identifier && result.resultType === 'entity' ? <p className="rounded-2xl border border-[var(--ith-border)] p-5 text-sm">No matching published firm record for these criteria. Missing evidence is not zero or a clean history.</p> : null}

      {!result.candidateSelection && result.results.length && result.pagination.total > INVESTOR_ASK_PAGE_SIZE ? (
        <nav className="flex gap-3" aria-label="Pagination">
          {result.pagination.page > 1 ? (
            <Link href={askHref(result.queryText, result.pagination.page - 1,q.inputOverrides)} className="th-btn-secondary min-h-11 px-4">
              Previous
            </Link>
          ) : null}
          {result.pagination.hasMore ? (
            <Link href={askHref(result.queryText, result.pagination.page + 1,q.inputOverrides)} className="th-btn-primary min-h-11 px-4">
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
          {(q.conditions??[]).map((c,i)=><div key={i}><dt className="text-xs uppercase">{c.kind.replaceAll('_',' ')}</dt><dd className="break-words">Requested: {c.requested}; {c.outcome}{c.effective?`; effective: ${c.effective}`:''}. {c.meaning}. {c.sourceField?`Field/capability: ${c.sourceField}`:''}</dd></div>)}
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
          <div className="min-w-0 sm:col-span-2"><dt className="text-xs uppercase">Source clock meaning</dt><dd>{result.provenance.sourceClockMeaning}</dd>{result.provenance.sourceReleases?.map((s,i)=><p key={i} className="mt-2 break-words">{s.dataset??'Dataset unknown'}; release label {s.releaseLabel??'unknown'}; official publication {s.officialAsOf??'not established'}; retrieved {s.retrievedAt??'unknown'}; fingerprint {s.sha256??'not recorded'}.</p>)}</div>
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
