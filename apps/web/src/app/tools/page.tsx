import { DECISION_LAB_TOOLS } from '@ith/config';
import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Decision Lab',
    path: '/tools',
    host: await readRequestHost(),
  });
}

export default function ToolsPage() {
  return (
    <PageShell
      eyebrow="Tools"
      title="Decision Lab"
      lead="These calculators and explorers are planned. They will show math and assumptions, not personalized financial advice. None of them are implemented in Task 001."
    >
      <ComingSoon title="Not built yet">
        <p>
          The Decision Lab will eventually include fee translation, portfolio x-ray, retirement
          scenarios, and offer analysis. Each tool will keep assumptions visible and refuse
          recommendation language.
        </p>
      </ComingSoon>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {DECISION_LAB_TOOLS.map((tool) => (
          <li key={tool.slug} className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
              Coming soon
            </p>
            <h2 className="mt-2 font-serif text-xl text-[var(--ith-navy)]">{tool.name}</h2>
            <p className="mt-2 text-sm leading-relaxed">{tool.purpose}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
