import Link from 'next/link';
import { PHILOSOPHY_LINE } from '@ith/domain';

/** Legacy hero kept for copy-guardrail scans. Production `/` uses InvestorHomeIntelligence. */
export function HomeHero() {
  return (
    <section className="border-b border-[var(--ith-border)]">
      <div className="th-shell grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            InvestorTrustHub · Independent research
          </p>
          <h1 className="mt-4 font-serif text-[32px] tracking-tight text-[var(--ith-navy)] sm:text-5xl lg:text-[58px]">
            Understand investment advisers before you choose one.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ith-ink)]">
            Research SEC/IARD registration, reported regulatory assets, compensation methods, and public
            regulatory evidence.
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--ith-navy)]">{PHILOSOPHY_LINE}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#record" className="th-btn-primary th-btn-hero">
              Explore Investor Intelligence
            </a>
            <Link href="/firms" className="th-btn-secondary th-btn-hero">
              Research an investment firm
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
