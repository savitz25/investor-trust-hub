import type { ReactNode } from 'react';

export function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="th-shell py-12 sm:py-16">
      <header className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-serif text-[32px] tracking-tight text-[var(--ith-navy)] sm:text-5xl lg:text-[56px]">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--ith-ink)]">{lead}</p>
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}
