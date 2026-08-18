import type { ReactNode } from 'react';

export function ComingSoon({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--ith-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ith-teal)]">
        Foundation / coming soon
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[var(--ith-navy)]">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">{children}</div>
    </div>
  );
}
