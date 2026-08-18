import type { ReactNode } from 'react';

export function MethodologyNote({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-teal-100 bg-[var(--ith-teal-mist)] px-4 py-3 text-sm leading-relaxed text-[var(--ith-ink)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
        Methodology note
      </p>
      <div className="mt-1">{children}</div>
    </aside>
  );
}
