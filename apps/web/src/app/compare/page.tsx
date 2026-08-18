import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Compare',
  path: '/compare',
});

export default function ComparePage() {
  return (
    <PageShell
      eyebrow="Compare"
      title="Side-by-side research"
      lead="Compare is reserved for user-selected records. It will not rank advisors or name a winner."
    >
      <ComingSoon title="Not available yet">
        <p>
          A future compare view will place registration, identifiers, fees, and disclosure
          evidence next to each other. It will not produce a score or a recommended advisor.
        </p>
      </ComingSoon>
    </PageShell>
  );
}
