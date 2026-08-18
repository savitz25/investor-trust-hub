import { SEARCH_STATE_NONE, US_STATE_CODES, firmSearchHref } from '@ith/domain';
import Link from 'next/link';
import type { FirmDirectoryMetrics, FirmSearchHit } from '@/lib/firms/types';
import { formatDisplayDate, formatReleaseLabel } from '@/lib/dates';

export function FirmSearchForm({
  q,
  state,
}: {
  q: string;
  state: string;
}) {
  return (
    <form className="mt-6" role="search" action="/firms" method="get">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_auto]">
        <div>
          <label htmlFor="firm-q" className="text-sm font-medium text-[var(--ith-navy)]">
            Firm name, CRD, SEC number, city, or ZIP
          </label>
          <input
            id="firm-q"
            name="q"
            defaultValue={q}
            placeholder="Example: Vanguard, 105958, or 801-11953"
            className="mt-2 w-full rounded-xl border border-[var(--ith-border)] bg-white px-4 py-3 text-[var(--ith-ink)]"
          />
        </div>
        <div>
          <label htmlFor="firm-state" className="text-sm font-medium text-[var(--ith-navy)]">
            State
          </label>
          <select
            id="firm-state"
            name="state"
            defaultValue={state}
            className="mt-2 w-full rounded-xl border border-[var(--ith-border)] bg-white px-3 py-3"
          >
            <option value="">Any sourced state</option>
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
            <option value={SEARCH_STATE_NONE}>State not provided</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-[var(--ith-navy)] px-5 py-3 text-sm font-semibold text-white sm:w-auto"
          >
            Search
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-700">
        Search ranks exact CRD and SEC file numbers first. Results are not ranked by assets, advertising, or
        paid placement.
      </p>
    </form>
  );
}

export function FirmSearchResults({
  hits,
  total,
  page,
  q,
  state,
  elapsedMs,
}: {
  hits: FirmSearchHit[];
  total: number;
  page: number;
  q: string;
  state: string;
  elapsedMs: number;
}) {
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-8">
      <p className="text-sm text-slate-700">
        {total.toLocaleString('en-US')} sourced {total === 1 ? 'firm' : 'firms'}
        {elapsedMs ? ` · query ${elapsedMs} ms` : ''}
      </p>
      <ul className="mt-4 space-y-4">
        {hits.map((hit) => (
          <li key={hit.slug}>
            <article className="rounded-2xl border border-[var(--ith-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                {hit.classification.headline}
              </p>
              <h2 className="mt-2 min-w-0 break-words font-serif text-2xl text-[var(--ith-navy)] [overflow-wrap:anywhere]">
                <Link href={`/firm/${hit.slug}`} className="underline-offset-2 hover:underline">
                  {hit.displayName}
                </Link>
              </h2>
              <p className="mt-2 font-mono text-sm">
                CRD {hit.crd ?? 'not in this record'}
                {hit.secFileNumber ? ` · SEC ${hit.secFileNumber}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {hit.city || hit.region
                  ? [hit.city, hit.region].filter(Boolean).join(', ')
                  : 'Principal state not provided in this source record'}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Source release {formatReleaseLabel(hit.releaseLabel) ?? 'not identified'}
                {hit.retrievedAt ? ` · retrieved ${formatDisplayDate(hit.retrievedAt)}` : ''}
              </p>
            </article>
          </li>
        ))}
      </ul>
      {hits.length === 0 ? (
        <p className="mt-8 text-sm">No sourced firms matched that research query.</p>
      ) : null}
      {pages > 1 ? (
        <nav className="mt-8 flex flex-wrap gap-3 text-sm" aria-label="Search pages">
          {page > 1 ? (
            <Link className="underline-offset-2 hover:underline" href={firmSearchHref({ q, state, page: page - 1 })}>
              Previous
            </Link>
          ) : null}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="underline-offset-2 hover:underline" href={firmSearchHref({ q, state, page: page + 1 })}>
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export function FirmDirectoryMetricsPanel({ metrics }: { metrics: FirmDirectoryMetrics }) {
  return (
    <dl className="mt-6 grid gap-3 rounded-2xl border border-[var(--ith-border)] bg-white p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Sourced firms</dt>
        <dd className="mt-1 font-serif text-2xl text-[var(--ith-navy)]">
          {metrics.officialFirms.toLocaleString('en-US')}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Reported as registered</dt>
        <dd className="mt-1 font-serif text-2xl text-[var(--ith-navy)]">
          {metrics.riaRegistered.toLocaleString('en-US')}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Pending / 120-Day</dt>
        <dd className="mt-1 font-serif text-2xl text-[var(--ith-navy)]">
          {metrics.riaPending.toLocaleString('en-US')}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Exempt reporting</dt>
        <dd className="mt-1 font-serif text-2xl text-[var(--ith-navy)]">
          {metrics.eraReporting.toLocaleString('en-US')}
        </dd>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Latest sourced release</dt>
        <dd className="mt-1">
          {formatReleaseLabel(metrics.latestReleaseLabel) ?? 'Not available'}
          {metrics.latestRetrievedAt
            ? ` · retrieved ${formatDisplayDate(metrics.latestRetrievedAt)}`
            : ''}
        </dd>
      </div>
    </dl>
  );
}
