import { ALLOWED_RESEARCH_FRAMES } from '@ith/domain';
import { StatusLegend } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Methodology',
    path: '/methodology',
    host: await readRequestHost(),
  });
}

export default function MethodologyPage() {
  return (
    <PageShell
      eyebrow="Methodology"
      title="How InvestorTrustHub will research"
      lead="We organize official and public-source evidence. We do not invent regulatory facts, merge uncertain identities, or score advisors."
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Non-negotiable rules</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            <li>Cite evidence for material facts.</li>
            <li>Never invent registrations, AUM, returns, or regulatory actions.</li>
            <li>Never imply endorsement with a checkmark, score, or ranking.</li>
            <li>Distinguish missing from clean. Not found ≠ none exists.</li>
            <li>Show source freshness. Do not overwrite history without a snapshot.</li>
            <li>Preserve raw source values alongside normalized values.</li>
            <li>Prefer no identity match to the wrong match.</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-[var(--ith-border)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Language we use</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {ALLOWED_RESEARCH_FRAMES.map((frame) => (
              <li key={frame}>“{frame}”</li>
            ))}
          </ul>
        </section>
        <StatusLegend />
      </div>
    </PageShell>
  );
}
