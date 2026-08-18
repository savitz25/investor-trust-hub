import { NOT_ADVICE_LINE } from '@ith/domain';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Disclaimer',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Research, not advice"
      lead={NOT_ADVICE_LINE}
    >
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed">
        <p>
          Information on InvestorTrustHub is for consumer research and education. It is not
          investment advice, tax advice, legal advice, or a recommendation to hire or fire any
          professional.
        </p>
        <p>
          Official records can be incomplete, delayed, or later amended. Always re-check the
          cited official source before relying on a fact.
        </p>
        <p>
          Development fixtures labeled “Synthetic development data — not a real person or firm.”
          are fictional and must not be treated as regulatory evidence.
        </p>
      </div>
    </PageShell>
  );
}
