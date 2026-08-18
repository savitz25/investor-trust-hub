import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'My InvestorTrustHub',
  path: '/my-investor-trust-hub',
});

export default function MyHubPage() {
  return (
    <PageShell
      eyebrow="Personal workspace"
      title="My InvestorTrustHub"
      lead="A future authenticated workspace for saved professionals, firms, portfolios, assumptions, and documents. It will not request brokerage credentials."
    >
      <ComingSoon title="Accounts are not enabled">
        <ul className="list-disc space-y-1 pl-5">
          <li>Saved professionals and firms</li>
          <li>Saved portfolio snapshots</li>
          <li>Saved retirement assumptions and scenarios</li>
          <li>Uploaded documents with future upload-security controls</li>
          <li>Comparison lists and regulatory-change monitoring</li>
        </ul>
        <p className="mt-3">
          Database tables for these objects exist with Row Level Security enabled. No login,
          upload, or account-aggregation flow ships in Task 001.
        </p>
      </ComingSoon>
    </PageShell>
  );
}
