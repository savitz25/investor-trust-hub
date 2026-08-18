import { SEC_ADV_SOURCE_NOTE } from '@ith/domain';
import { MethodologyNote } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'SEC ADV ingestion (internal)',
  path: '/internal/sec-adv',
});

export default function SecAdvInternalPage() {
  return (
    <PageShell
      eyebrow="Internal / not indexed"
      title="SEC adviser firm ingestion"
      lead="This page documents the Task 002 pipeline. It is not a Trust Report and it does not publish a firm directory."
    >
      <MethodologyNote>{SEC_ADV_SOURCE_NOTE}</MethodologyNote>
      <div className="mt-6 max-w-3xl space-y-3 text-sm leading-relaxed">
        <p>
          Operator commands live in <code>services/ingestion</code>. Discover, dry-run, and
          publish against official SEC IARD monthly zips. Exempt reporting advisers stay
          distinct from registered investment advisers.
        </p>
        <p>
          Firm pages are not added to the sitemap from this ingest. Search documents are
          written with <code>indexable = false</code>.
        </p>
      </div>
    </PageShell>
  );
}
