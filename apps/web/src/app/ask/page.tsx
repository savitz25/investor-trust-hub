import type { Metadata } from 'next';
import { AskInvestorResultView } from '@/components/ask-investor-result';
import { InvestorSpecialistSearchShell } from '@/components/specialist-search/investor-specialist-search-shell';
import { executeInvestorAsk } from '@/lib/ask/execute';
import { DatabaseUnavailableError } from '@/lib/db';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export const dynamic = 'force-dynamic';

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
  searchParams: Promise<{ q?: string; page?: string; firmType?: string; state?: string; raum?: string; compensation?: string }>;
}) {
  const params = await searchParams;
  const rawQuery = (params.q ?? '').trim();
  const additions = [params.raum, params.compensation].filter(Boolean);
  const q = [rawQuery, ...additions].filter(Boolean).join(' ').trim();
  const page = Number(params.page ?? '1') || 1;

  let result = null;
  let dbError = false;
  if (q) {
    try {
      result = await executeInvestorAsk(q, {
        page,
        firmType: params.firmType === 'RIA' ? 'ria' : params.firmType === 'ERA' ? 'era' : undefined,
        state: /^[A-Z]{2}$/.test(params.state ?? '') ? params.state : undefined,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) dbError = true;
      else throw error;
    }
  }

  return (
    <div className="th-shell py-10 sm:py-14">
      <h1 className="sr-only">InvestorTrustHub specialist search</h1>
      <InvestorSpecialistSearchShell query={rawQuery} />
      {dbError ? (
        <p className="mt-8 rounded-xl border border-[var(--ith-border)] p-4 text-sm">
          The research database is temporarily unavailable. Try again shortly.
        </p>
      ) : result ? (
        <div className="mt-10">
          <AskInvestorResultView result={result} />
        </div>
      ) : null}
    </div>
  );
}
