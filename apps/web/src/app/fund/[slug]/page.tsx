import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return pageMetadata({ title: 'Fund research (reserved)', path: `/fund/${slug}` });
}

export default async function FundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PageShell
      eyebrow="Products"
      title="Fund research is not live"
      lead={`The /fund/${slug} route is reserved. We will not publish indexable fund pages until they contain sufficient sourced content.`}
    >
      <ComingSoon title="Reserved route">
        <p>
          Future fund pages will use official series/class identifiers and filings such as N-CEN
          and N-PORT. No fabricated fund data is shown here.
        </p>
      </ComingSoon>
    </PageShell>
  );
}
