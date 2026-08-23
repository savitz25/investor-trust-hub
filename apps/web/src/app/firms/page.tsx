import {
  firmHrefWithAskContext,
  parseFirmSearchInput,
  parseInvestorAskSearchContext,
} from '@ith/domain';
import { AskHandoffBanner } from '@/components/ask-handoff-banner';
import { FirmDirectoryMetricsPanel, FirmSearchForm, FirmSearchResults } from '@/components/firm-search';
import { PageShell } from '@/components/page-shell';
import { DatabaseUnavailableError, hasDatabaseUrl } from '@/lib/db';
import { getCachedFirmDirectoryMetrics, getCachedOfficialFirmSearch } from '@/lib/firms/cached';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = parseFirmSearchInput(params);
  const askCtx = parseInvestorAskSearchContext(params);
  const hasQuery = Boolean(
    parsed.q || parsed.state || parsed.stateNone || parsed.city || parsed.zip || parsed.entityType
  );
  // Ask query-param variants are not distinct indexable pages
  const indexable = !hasQuery && !askCtx;
  return pageMetadata({
    title: hasQuery || askCtx ? 'Firm search results' : 'Investment firms',
    description:
      'Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. InvestorTrustHub organizes official evidence. It does not rank or recommend firms.',
    path: '/firms',
    indexable,
  });
}

export default async function FirmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = parseFirmSearchInput(params);
  const askCtx = parseInvestorAskSearchContext(params);
  const askActive = Boolean(askCtx && !askCtx.unsupported && askCtx.source === 'ask');
  const stateValue = parsed.stateNone ? '_none' : parsed.state ?? '';

  const askNav =
    askActive && askCtx
      ? {
          src: 'ask' as const,
          state: askCtx.state,
          city: askCtx.city,
          zip: askCtx.zip,
          entity: askCtx.entityType,
          category: askCtx.category,
          journey: askCtx.journey,
          intent: askCtx.intent,
          sid: askCtx.sid,
        }
      : undefined;

  if (!hasDatabaseUrl()) {
    return (
      <PageShell
        eyebrow="Firms"
        title="Research an investment firm"
        lead="Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. The official directory is unavailable in this environment."
      >
        {askActive && askCtx ? <AskHandoffBanner ctx={askCtx} /> : null}
        <FirmSearchForm
          q={parsed.q}
          state={stateValue}
          city={parsed.city ?? ''}
          entity={parsed.entityType ?? ''}
          askNav={askNav}
        />
        <p className="mt-8 text-sm">The production research database is not configured here.</p>
        {askActive ? (
          <p className="mt-2 text-sm text-slate-700">
            Ask context was accepted locally (no Ask runtime call). Results require the Investor
            research database — we will not invent adviser listings.
          </p>
        ) : null}
      </PageShell>
    );
  }

  try {
    const [metrics, results] = await Promise.all([
      getCachedFirmDirectoryMetrics(),
      getCachedOfficialFirmSearch(JSON.stringify(parsed)),
    ]);
    return (
      <PageShell
        eyebrow="Firms"
        title="Research an investment firm"
        lead="Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. We organize the official evidence. The consumer decides."
      >
        <FirmDirectoryMetricsPanel metrics={metrics} />
        {askActive && askCtx ? <AskHandoffBanner ctx={askCtx} /> : null}
        <FirmSearchForm
          q={askActive ? '' : parsed.q}
          state={stateValue}
          city={parsed.city ?? ''}
          entity={parsed.entityType ?? ''}
          askNav={askNav}
        />
        <FirmSearchResults
          hits={results.hits}
          total={results.total}
          page={parsed.page}
          q={askActive ? '' : parsed.q}
          state={stateValue}
          city={parsed.city ?? ''}
          entity={parsed.entityType ?? ''}
          elapsedMs={results.elapsedMs}
          askNav={askNav}
          firmHrefBuilder={
            askActive && askCtx ? (slug) => firmHrefWithAskContext(slug, askCtx) : undefined
          }
        />
      </PageShell>
    );
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return (
        <PageShell
          eyebrow="Firms"
          title="Research an investment firm"
          lead="Research data temporarily unavailable. This is a service error, not a finding about any firm."
        >
          {askActive && askCtx ? <AskHandoffBanner ctx={askCtx} /> : null}
          <FirmSearchForm
            q={parsed.q}
            state={stateValue}
            city={parsed.city ?? ''}
            entity={parsed.entityType ?? ''}
            askNav={askNav}
          />
        </PageShell>
      );
    }
    throw error;
  }
}
