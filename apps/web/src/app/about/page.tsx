import { INDEPENDENCE_LINE, MISSION_LINE, NOT_ADVICE_LINE, PHILOSOPHY_LINE } from '@ith/domain';
import { WHAT_WE_ARE_NOT } from '@ith/config';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'About',
  path: '/about',
});

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="An independent research layer for investing decisions"
      lead="InvestorTrustHub will sit in the AskTrustHub network. The mission is simple: research before you invest."
    >
      <div className="max-w-3xl space-y-6 text-sm leading-relaxed">
        <p className="font-serif text-2xl text-[var(--ith-navy)]">{MISSION_LINE}</p>
        <p>{PHILOSOPHY_LINE}</p>
        <p>{INDEPENDENCE_LINE}</p>
        <p>{NOT_ADVICE_LINE}</p>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Independence</h2>
        <p>
          We will not sell rankings, featured advisor placements, or lead referrals from research
          records. BrokerCheck-derived information will never be treated as a prospecting list.
        </p>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">What we are not building</h2>
        <ul className="list-disc space-y-1 pl-5">
          {WHAT_WE_ARE_NOT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
