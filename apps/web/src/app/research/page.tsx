import { RESEARCH_QUESTIONS } from '@ith/domain';
import { MethodologyNote } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Research questions',
    path: '/research',
    host: await readRequestHost(),
  });
}

const GUIDES = [
  {
    question: RESEARCH_QUESTIONS[0],
    body: 'Identify the legal person or firm, their identifiers, and who employs or supervises them. Names alone are not identities.',
  },
  {
    question: RESEARCH_QUESTIONS[1],
    body: 'Look for current registrations with the relevant regulator. A website claim is not a registration. Not finding a record in one system does not prove there is none.',
  },
  {
    question: RESEARCH_QUESTIONS[2],
    body: 'Read disclosure and filing text as the source reports it. Absence of a disclosure in our extract is not a clean history.',
  },
  {
    question: RESEARCH_QUESTIONS[3],
    body: 'Fee language is not the same as dollars paid. Future Fee Decoder work will keep assumptions visible.',
  },
  {
    question: RESEARCH_QUESTIONS[4],
    body: 'Product names can hide overlap, share class, and underlying holdings. Future Portfolio X-Ray work will stay descriptive.',
  },
  {
    question: RESEARCH_QUESTIONS[5],
    body: 'Retirement math is assumption-sensitive. We will show scenarios, not a prescribed retirement date.',
  },
  {
    question: RESEARCH_QUESTIONS[6],
    body: 'Before acting on an offer, list what can be verified from official sources and what cannot.',
  },
];

export default function ResearchPage() {
  return (
    <PageShell
      eyebrow="Research"
      title="What to investigate before you invest"
      lead="These are research questions, not recommendations. InvestorTrustHub will organize evidence that helps you work through them."
    >
      <ol className="space-y-5">
        {GUIDES.map((guide, index) => (
          <li key={guide.question} className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
              Question {index + 1}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-[var(--ith-navy)]">{guide.question}</h2>
            <p className="mt-2 text-sm leading-relaxed">{guide.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <MethodologyNote>
          We do not tell you to buy, sell, hire, or convert. Here is what the source reports.
          Here are questions you may want to investigate.
        </MethodologyNote>
      </div>
    </PageShell>
  );
}
