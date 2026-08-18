import { parseFirmSearchInput } from '@ith/domain';
import { FirmDirectoryMetricsPanel, FirmSearchForm, FirmSearchResults } from '@/components/firm-search';
import { PageShell } from '@/components/page-shell';
import { DatabaseUnavailableError, hasDatabaseUrl } from '@/lib/db';
import { getFirmDirectoryMetrics, searchOfficialFirms } from '@/lib/firms/repository';
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
  const hasQuery = Boolean(parsed.q || parsed.state || parsed.stateNone);
  return pageMetadata({
    title: hasQuery ? 'Firm search results' : 'Investment firms',
    description:
      'Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. InvestorTrustHub organizes official evidence. It does not rank or recommend firms.',
    path: '/firms',
    indexable: !hasQuery,
  });
}

export default async function FirmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = parseFirmSearchInput(params);
  const stateValue = parsed.stateNone ? '_none' : parsed.state ?? '';

  if (!hasDatabaseUrl()) {
    return (
      <PageShell
        eyebrow="Firms"
        title="Research an investment firm"
        lead="Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. The official directory is unavailable in this environment."
      >
        <FirmSearchForm q={parsed.q} state={stateValue} />
        <p className="mt-8 text-sm">The production research database is not configured here.</p>
      </PageShell>
    );
  }

  try {
    const [metrics, results] = await Promise.all([
      getFirmDirectoryMetrics(),
      searchOfficialFirms(parsed),
    ]);
    return (
      <PageShell
        eyebrow="Firms"
        title="Research an investment firm"
        lead="Search SEC/IARD adviser-firm records by firm name, CRD, SEC number, or location. We organize the official evidence. The consumer decides."
      >
        <FirmDirectoryMetricsPanel metrics={metrics} />
        <FirmSearchForm q={parsed.q} state={stateValue} />
        <FirmSearchResults
          hits={results.hits}
          total={results.total}
          page={parsed.page}
          q={parsed.q}
          state={stateValue}
          elapsedMs={results.elapsedMs}
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
          <FirmSearchForm q={parsed.q} state={stateValue} />
        </PageShell>
      );
    }
    throw error;
  }
}
