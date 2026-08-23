import { notFound } from 'next/navigation';
import {
  buildAskBackLabel,
  buildAskFirmsHref,
  getFirmBySlug,
  isOfficialFirmSlug,
  parseInvestorAskSearchContext,
} from '@ith/domain';
import { FirmReport } from '@/components/firm-report';
import { FirmTrustReport } from '@/components/firm-trust-report';
import { DatabaseUnavailableError, hasDatabaseUrl } from '@/lib/db';
import { getCachedOfficialFirmBySlug } from '@/lib/firms/cached';
import { getOfficialFirmIndexable } from '@/lib/firms/repository';
import { pageMetadata } from '@/lib/seo';
import { shareRouteOgImage } from '@/lib/share-hub';

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  // Ask context may accompany the request; canonical metadata stays the clean firm URL.
  void searchParams;
  if (isOfficialFirmSlug(slug) && hasDatabaseUrl()) {
    try {
      const [report, indexable] = await Promise.all([
        getCachedOfficialFirmBySlug(slug),
        getOfficialFirmIndexable(slug),
      ]);
      if (!report) {
        return pageMetadata({ title: 'Firm not found', path: `/firm/${slug}`, indexable: false });
      }
      const og = shareRouteOgImage(
        `/firm/${report.slug}`,
        `${report.displayName} — firm research on InvestorTrustHub`,
      );
      return pageMetadata({
        title: `${report.displayName} — SEC/IARD Firm Research`,
        description: `Research ${report.displayName}, CRD ${report.crd}, using SEC/IARD regulatory data, firm identifiers, registration information, source dates, and public evidence.`,
        path: `/firm/${report.slug}`,
        indexable,
        imageUrl: og.url,
        imageAlt: og.alt,
      });
    } catch {
      return pageMetadata({ title: 'Firm research unavailable', path: `/firm/${slug}`, indexable: false });
    }
  }
  const firm = getFirmBySlug(slug);
  if (!firm) {
    return pageMetadata({ title: 'Firm not found', path: `/firm/${slug}`, indexable: false });
  }
  const og = shareRouteOgImage(
    `/firm/${slug}`,
    `${firm.displayName} — synthetic firm research on InvestorTrustHub`,
  );
  return pageMetadata({
    title: `${firm.displayName} (synthetic)`,
    description: 'Synthetic development Trust Report — not a real firm.',
    path: `/firm/${slug}`,
    indexable: false,
    imageUrl: og.url,
    imageAlt: og.alt,
  });
}

export default async function FirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const askCtx = parseInvestorAskSearchContext(sp);
  const askBack =
    askCtx && !askCtx.unsupported
      ? { href: buildAskFirmsHref(askCtx), label: buildAskBackLabel(askCtx) }
      : null;

  if (isOfficialFirmSlug(slug)) {
    if (!hasDatabaseUrl()) {
      return <DatabaseNotice slug={slug} askBack={askBack} />;
    }
    try {
      const report = await getCachedOfficialFirmBySlug(slug);
      if (!report) notFound();
      return <FirmTrustReport report={report} askBack={askBack} />;
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return <DatabaseNotice slug={slug} askBack={askBack} />;
      }
      throw error;
    }
  }

  const firm = getFirmBySlug(slug);
  if (!firm) notFound();
  return <FirmReport firm={firm} />;
}

function DatabaseNotice({
  slug,
  askBack,
}: {
  slug: string;
  askBack?: { href: string; label: string } | null;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      {askBack ? (
        <p className="mb-6" data-ask-handoff-back="1">
          <a href={askBack.href} className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
            {askBack.label}
          </a>
        </p>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Service interruption</p>
      <h1 className="mt-3 font-serif text-3xl text-[var(--ith-navy)]">Research data temporarily unavailable</h1>
      <p className="mt-4 text-sm leading-relaxed">
        InvestorTrustHub could not read the official firm record for <span className="font-mono">{slug}</span>{' '}
        from the research database. This is a service error, not a finding about the firm.
      </p>
    </article>
  );
}
