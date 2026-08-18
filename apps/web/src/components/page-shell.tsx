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
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-[var(--ith-navy)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--ith-ink)]">{lead}</p>
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}
