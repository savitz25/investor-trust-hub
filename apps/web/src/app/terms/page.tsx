import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Terms',
    path: '/terms',
    host: await readRequestHost(),
  });
}

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms"
      lead="A short foundation notice for the Task 001 research shell."
    >
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed">
        <p>
          This site is provided as an independent research interface. Official source terms,
          including any BrokerCheck permitted-use terms, apply to those source systems.
        </p>
        <p>
          Do not use InvestorTrustHub as a sales-prospecting database or as a substitute for
          official regulator records.
        </p>
      </div>
    </PageShell>
  );
}
