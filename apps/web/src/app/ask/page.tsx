import type { Metadata } from 'next';
import { AskInvestorResultView } from '@/components/ask-investor-result';
import { InvestorSpecialistSearchShell } from '@/components/specialist-search/investor-specialist-search-shell';
import { executeInvestorAsk } from '@/lib/ask/execute';
import { DatabaseUnavailableError } from '@/lib/db';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import { readInvestorRequest, investorParams, InvalidInvestorRequest } from '@/lib/ask/request';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === 'string' && params.q.length <= 400 ? params.q : '';
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
  searchParams: Promise<Record<string,string|string[]|undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = typeof params.q === 'string' ? params.q : '';
  let input;
  let invalid: string | undefined;
  try { input=readInvestorRequest(investorParams(params)); } catch(error) {if(error instanceof InvalidInvestorRequest)invalid=error.message;else throw error;}

  let result = null;
  let dbError = false;
  if (input?.raw) {
    try {
      result = await executeInvestorAsk(input.raw, input.overrides);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) dbError = true;
      else throw error;
    }
  }

  return (
    <div className="th-shell py-10 sm:py-14">
      <h1 className="sr-only">InvestorTrustHub specialist search</h1>
      <InvestorSpecialistSearchShell query={rawQuery} overrides={input?.overrides} />
      {invalid ? <p role="alert" className="mt-8 rounded-xl border p-4">{invalid}</p> : dbError ? (
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
