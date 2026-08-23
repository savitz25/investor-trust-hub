import { SEARCH_STATE_NONE, US_STATE_CODES, firmSearchHref } from '@ith/domain';
import Link from 'next/link';
import type { FirmDirectoryMetrics, FirmSearchHit } from '@/lib/firms/types';
import { formatDisplayDate, formatReleaseLabel } from '@/lib/dates';

type AskNav = {
  src: 'ask';
  state?: string;
  city?: string;
  zip?: string;
  entity?: string;
  category?: string;
  journey?: string;
  intent?: string;
  sid?: string;
};

export function FirmSearchForm({
  q,
  state,
  city = '',
  entity = '',
  askNav,
}: {
  q: string;
  state: string;
  city?: string;
  entity?: string;
  askNav?: AskNav;
}) {
  return (
    <form className="mt-6" role="search" action="/firms" method="get">
      {askNav ? (
        <>
          <input type="hidden" name="src" value="ask" />
          {askNav.journey ? <input type="hidden" name="journey" value={askNav.journey} /> : null}
          {askNav.intent ? <input type="hidden" name="intent" value={askNav.intent} /> : null}
          {askNav.sid ? <input type="hidden" name="sid" value={askNav.sid} /> : null}
          {askNav.category ? <input type="hidden" name="category" value={askNav.category} /> : null}
          {askNav.zip ? <input type="hidden" name="zip" value={askNav.zip} /> : null}
        </>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem_auto]">
        <div>
          <label htmlFor="firm-q" className="text-sm font-medium text-[var(--ith-navy)]">
            Firm name, CRD, SEC number, city, or ZIP
          </label>
          <input
            id="firm-q"
            name="q"
            defaultValue={askNav ? '' : q}
            disabled={Boolean(askNav)}
            placeholder="Example: Vanguard, 105958, or 801-11953"
            className="th-input mt-2"
          />
        </div>
        <div>
          <label htmlFor="firm-state" className="text-sm font-medium text-[var(--ith-navy)]">
            State
          </label>
          <select id="firm-state" name="state" defaultValue={state} className="th-select mt-2">
            <option value="">Any sourced state</option>
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
            {!askNav ? <option value={SEARCH_STATE_NONE}>State not provided</option> : null}
          </select>
        </div>
        <div>
          <label htmlFor="firm-entity" className="text-sm font-medium text-[var(--ith-navy)]">
            Class
          </label>
          <select id="firm-entity" name="entity" defaultValue={entity} className="th-select mt-2">
            <option value="">All advisers</option>
            <option value="ria">RIA</option>
            <option value="era">ERA</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="th-btn-primary w-full sm:w-auto">
            Search
          </button>
        </div>
      </div>
      {city || askNav?.city ? (
        <input type="hidden" name="city" value={city || askNav?.city || ''} />
      ) : null}
      <p className="mt-2 text-xs text-slate-700">
        {askNav
          ? 'Ask handoff ranks by firm name only — never by assets, advertising, Premium, or paid placement. Wave 1 indexable firms only.'
          : 'Search ranks exact CRD and SEC file numbers first. Results are not ranked by assets, advertising, or paid placement.'}
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
  city = '',
  entity = '',
  elapsedMs,
  askNav,
  firmHrefBuilder,
}: {
  hits: FirmSearchHit[];
  total: number;
  page: number;
  q: string;
  state: string;
  city?: string;
  entity?: string;
  elapsedMs: number;
  askNav?: AskNav;
  firmHrefBuilder?: (slug: string) => string;
}) {
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (p: number) =>
    firmSearchHref({
      q: askNav ? undefined : q,
      state: state || undefined,
      page: p,
      city: city || askNav?.city,
      zip: askNav?.zip,
      entity: entity || askNav?.entity,
      src: askNav?.src,
      category: askNav?.category,
      journey: askNav?.journey,
      intent: askNav?.intent,
      sid: askNav?.sid,
    });

  return (
    <div className="mt-8">
      <p className="text-sm text-slate-700">
        {total.toLocaleString('en-US')} sourced {total === 1 ? 'firm' : 'firms'}
        {elapsedMs ? ` · query ${elapsedMs} ms` : ''}
        {askNav ? ' · Ask handoff (indexable only)' : ''}
      </p>
      <ul className="mt-4 space-y-4">
        {hits.map((hit) => (
          <li key={hit.slug}>
            <article className="th-card">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                {hit.classification.headline}
              </p>
              <h2 className="mt-2 min-w-0 break-words font-serif text-2xl text-[var(--ith-navy)] [overflow-wrap:anywhere]">
                <Link
                  href={firmHrefBuilder ? firmHrefBuilder(hit.slug) : `/firm/${hit.slug}`}
                  className="underline-offset-2 hover:underline"
                >
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
        <p className="mt-8 text-sm">
          No sourced firms matched that research query.
          {askNav
            ? ' Zero is acceptable — we do not silently widen city→state or RIA→all advisers.'
            : ''}
        </p>
      ) : null}
      {pages > 1 ? (
        <nav className="mt-8 flex flex-wrap gap-3 text-sm" aria-label="Search pages">
          {page > 1 ? (
            <Link className="underline-offset-2 hover:underline" href={pageHref(page - 1)}>
              Previous
            </Link>
          ) : null}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="underline-offset-2 hover:underline" href={pageHref(page + 1)}>
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
