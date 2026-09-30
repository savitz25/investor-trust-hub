import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { DatabaseUnavailableError, hasDatabaseUrl } from '@/lib/db';
import { listPublishedStateAdvisers } from '@/lib/firms/state-advisers';
import { pageMetadata } from '@/lib/seo';

const STATES = ['CA', 'TX', 'AZ', 'WA'] as const;

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export function generateMetadata() {
  return pageMetadata({
    title: 'State adviser firm registrations',
    description: 'Published IAPD state-registration observations for investment adviser firms.',
    path: '/state-advisers',
    indexable: false,
  });
}

export default async function StateAdvisersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const stateParam = typeof params.state === 'string' ? params.state.toUpperCase() : '';
  const state = STATES.find((code) => code === stateParam) ?? null;
  const parsedPage = Number(typeof params.page === 'string' ? params.page : '1');
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 1000) : 1;
  if (!hasDatabaseUrl()) {
    return <PageShell eyebrow="State adviser firms" title="State adviser registrations"
      lead="The official registration data is unavailable in this environment."><p>Registration data unavailable.</p></PageShell>;
  }
  try {
    const result = await listPublishedStateAdvisers(state, page);
    const href = (nextPage: number) => `/state-advisers${state ? `?state=${state}&page=${nextPage}` : `?page=${nextPage}`}`;
    return (
      <PageShell eyebrow="State adviser firms" title="State adviser registrations"
        lead="IAPD firm-state observations reported as APPROVED. Registration is a source status, not an endorsement or a principal-office location.">
        <nav className="mt-6 flex flex-wrap gap-3 text-sm" aria-label="Registration state">
          <Link href="/state-advisers" className="underline">All four states</Link>
          {STATES.map((code) => <Link key={code} href={`/state-advisers?state=${code}`} className="underline">{code}</Link>)}
        </nav>
        <p className="mt-5 text-sm text-slate-700">
          {result.registrations.toLocaleString('en-US')} published state registrations on{' '}
          {result.firms.toLocaleString('en-US')} distinct firm CRDs.
        </p>
        <ul className="mt-5 grid gap-3">
          {result.rows.map((row) => (
            <li key={`${row.crd}:${row.state}`} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
              <Link className="font-semibold underline" href={`/firm/${row.slug}`}>{row.displayName}</Link>
              <p className="mt-1 text-sm">Firm CRD {row.crd} · {row.state} · Reported as state-registered</p>
              <p className="mt-1 text-xs text-slate-600">Registration date: {row.registrationDate ?? 'not provided'}</p>
            </li>
          ))}
        </ul>
        {result.rows.length === 0 ? <p className="mt-6 text-sm">No published state registrations in this view.</p> : null}
        <nav className="mt-6 flex gap-4 text-sm" aria-label="Pagination">
          {page > 1 ? <Link className="underline" href={href(page - 1)}>Previous</Link> : null}
          {page * 25 < result.registrations ? <Link className="underline" href={href(page + 1)}>Next</Link> : null}
        </nav>
      </PageShell>
    );
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return <PageShell eyebrow="State adviser firms" title="State adviser registrations"
        lead="The official registration data is temporarily unavailable."><p>Registration data unavailable.</p></PageShell>;
    }
    throw error;
  }
}
