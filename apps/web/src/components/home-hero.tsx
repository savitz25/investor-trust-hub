import Link from 'next/link';
import { MISSION_LINE, PHILOSOPHY_LINE, SUPPORTING_MESSAGE } from '@ith/domain';

export function HomeHero() {
  return (
    <section className="border-b border-[var(--ith-border)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            InvestorTrustHub · Independent research
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-[var(--ith-navy)] sm:text-5xl lg:text-6xl">
            {MISSION_LINE}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ith-ink)]">
            {SUPPORTING_MESSAGE}
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--ith-navy)]">{PHILOSOPHY_LINE}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/professionals"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--ith-teal)] px-6 text-sm font-semibold text-white no-underline hover:bg-[var(--ith-teal-deep)]"
            >
              Research a professional
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--ith-border)] bg-white px-6 text-sm font-semibold text-[var(--ith-navy)] no-underline hover:bg-[var(--ith-teal-mist)]"
            >
              How we research
            </Link>
          </div>
        </div>
        <aside className="rounded-2xl border border-[var(--ith-border)] bg-white p-6 shadow-[var(--shadow-card)] lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
            Evidence, not endorsement
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed">
            <li>Registration status as the source reports it.</li>
            <li>Identifiers stored as identifiers — CRD, SEC number, CIK, NFA, LEI.</li>
            <li>Disclosures shown as source text, not verdicts.</li>
            <li>No trust score, no paid ranking, no “best advisor” badge.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
