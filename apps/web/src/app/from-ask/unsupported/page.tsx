/**
 * ASK-SEARCH-INVESTOR-002 — fail-closed Ask handoff empty / unsupported.
 * noindex.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PageShell } from '@/components/page-shell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Ask handoff — unsupported search',
  description: 'This AskTrustHub handoff is not supported on InvestorTrustHub yet.',
  path: '/from-ask/unsupported',
  indexable: false,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function reasonCopy(reason: string): { title: string; body: string } {
  if (reason === 'investment_product') {
    return {
      title: 'Investment products are not listed as adviser firms',
      body: 'InvestorTrustHub Ask handoff is for SEC/IARD adviser firms (RIAs and ERAs). Stocks, funds, ETFs, crypto, hedge-fund performance, and lenders are not substituted with advisory firms. Browse the firm directory when you want adviser research.',
    };
  }
  if (reason === 'ambiguous_entity') {
    return {
      title: 'We need a clearer adviser search type',
      body: 'Ask did not resolve whether you mean a registered investment adviser (RIA), an exempt reporting adviser (ERA), or another product. We will not guess or default ambiguous “investment company” labels to RIA.',
    };
  }
  if (reason === 'county_unsupported') {
    return {
      title: 'County search is not available yet',
      body: 'InvestorTrustHub does not publish structured county geography for adviser offices. We will not invent county precision from city names or external geocoding.',
    };
  }
  return {
    title: 'This Ask handoff could not be applied',
    body: 'The structured search context was missing, invalid, or not allowlisted. We will not invent filters or follow unsafe redirects. Browse sourced adviser firms to continue research.',
  };
}

export default async function FromAskUnsupportedPage({ searchParams }: Props) {
  const params = await searchParams;
  const reasonRaw = params.reason;
  const reason = Array.isArray(reasonRaw) ? reasonRaw[0] ?? '' : reasonRaw ?? '';
  const copy = reasonCopy(reason);

  return (
    <PageShell eyebrow="Ask handoff" title={copy.title} lead={copy.body}>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/firms" className="underline-offset-2 hover:underline">
            Browse sourced investment firms
          </Link>
        </li>
        <li>
          <Link href="/firms?state=FL" className="underline-offset-2 hover:underline">
            Firms with a Florida principal office
          </Link>
        </li>
        <li>
          <Link href="/" className="underline-offset-2 hover:underline">
            InvestorTrustHub home
          </Link>
        </li>
      </ul>
      <p className="mt-8 text-xs text-slate-600">
        Research only · Not an endorsement · We do not invent listings · No open redirects from Ask
        context
      </p>
    </PageShell>
  );
}
