import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata({ title: 'Company research (reserved)', path: `/company/${slug}` });
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PageShell
      eyebrow="Issuers"
      title="Company research is not live"
      lead={`The /company/${slug} route is reserved for SEC-reporting issuers and other regulated entities.`}
    >
      <ComingSoon title="Reserved route">
        <p>
          Future issuer pages will cite EDGAR accessions. We will not invent CIK mappings or
          financial results.
        </p>
      </ComingSoon>
    </PageShell>
  );
}
