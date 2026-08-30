import type { Metadata } from 'next';
import Link from 'next/link';
import { AskInvestorResultView } from '@/components/ask-investor-result';
import { executeInvestorAsk } from '@/lib/ask/execute';
import { DatabaseUnavailableError } from '@/lib/db';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export const dynamic = 'force-dynamic';

const EXAMPLES = [
  'Show SEC-registered RIAs in Florida.',
  'Find CRD 123456.',
  'Show RIAs reporting between $1 billion and $10 billion RAUM.',
  'Show firms reporting asset-based fees.',
  'How many ERAs are currently indexed?',
  'What does RAUM mean?',
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return pageMetadata({
    title: q?.trim() ? `Ask: ${q.trim().slice(0, 80)}` : 'Ask InvestorTrustHub',
    description:
      'Structured SEC/IARD and Form ADV research. InvestorTrustHub organizes adviser records. It does not rank advisers or recommend investments.',
    path: q?.trim() ? `/ask?q=${encodeURIComponent(q.trim())}` : '/ask',
    indexable: false,
    host: await readRequestHost(),
  });
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const page = Number(params.page ?? '1') || 1;

  let result = null;
  let dbError = false;
  if (q) {
    try {
      result = await executeInvestorAsk(q, { page });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) dbError = true;
      else throw error;
    }
  }

  return (
    <div className="th-shell py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Ask InvestorTrustHub</p>
      <h1 className="mt-3 font-serif text-3xl text-[var(--ith-navy)] sm:text-4xl">
        Structured adviser research, not a recommendation engine.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ith-ink)]">
        Ask interprets the question. The current SEC/IARD extract answers it. InvestorTrustHub does not pick advisers,
        forecast returns, or invent Form ADV facts.
      </p>
      <form action="/ask" method="get" className="mt-8 max-w-2xl" role="search" aria-label="Ask InvestorTrustHub">
        <label htmlFor="ask-q" className="sr-only">
          Research question
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="ask-q"
            name="q"
            defaultValue={q}
            placeholder="Show SEC-registered RIAs in Florida."
            className="min-h-12 flex-1 rounded-xl border border-[var(--ith-border)] px-4 text-[var(--ith-navy)]"
          />
          <button type="submit" className="th-btn-primary min-h-12 px-5">
            Ask
          </button>
        </div>
      </form>
      {dbError ? (
        <p className="mt-8 rounded-xl border border-[var(--ith-border)] p-4 text-sm">
          The research database is temporarily unavailable. Try again shortly.
        </p>
      ) : result ? (
        <div className="mt-10">
          <AskInvestorResultView result={result} />
        </div>
      ) : (
        <ul className="mt-8 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <Link
                href={`/ask?q=${encodeURIComponent(ex)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--ith-border)] px-3 text-sm text-[var(--ith-navy)]"
              >
                {ex}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
