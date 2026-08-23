/**
 * ASK-SEARCH-INVESTOR-002 — Ask handoff receiving entry.
 * noindex — does not create duplicate indexable directory architecture.
 */
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  parseInvestorAskSearchContext,
  resolveAskHandoffDestination,
} from '@ith/domain';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Ask handoff — InvestorTrustHub',
  description: 'Structured AskTrustHub search handoff receiver.',
  path: '/from-ask',
  indexable: false,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FromAskPage({ searchParams }: Props) {
  const params = await searchParams;
  const ctx = parseInvestorAskSearchContext(params);

  if (!ctx) {
    redirect('/from-ask/unsupported?reason=invalid_context');
  }

  const dest = resolveAskHandoffDestination(ctx);
  redirect(dest.href);
}
