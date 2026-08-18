import type { ReactNode } from 'react';
import type { EvidenceStatus } from '@ith/domain';
import { EVIDENCE_STATUS_COPY } from '@ith/domain';
import { cn } from './cn';

const TONE_CLASS: Record<string, string> = {
  official: 'border-teal-200 bg-teal-50',
  reported: 'border-slate-200 bg-slate-50',
  caution: 'border-amber-200 bg-amber-50',
  neutral: 'border-slate-200 bg-white',
  conflict: 'border-rose-200 bg-rose-50',
};

export function EvidenceCard({
  title,
  status,
  children,
  footer,
}: {
  title: string;
  status: EvidenceStatus;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const copy = EVIDENCE_STATUS_COPY[status];
  return (
    <article
      className={cn(
        'rounded-2xl border p-5 shadow-[var(--shadow-card)]',
        TONE_CLASS[copy.tone] ?? TONE_CLASS.neutral,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-serif text-lg text-[var(--ith-navy)]">{title}</h3>
        <span className="inline-flex items-center rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold">
          {copy.shortLabel}
        </span>
      </header>
      <div className="mt-3 text-sm leading-relaxed text-[var(--ith-ink)]">{children}</div>
      <p className="mt-3 text-xs leading-relaxed text-slate-700">{copy.explanation}</p>
      {footer ? <div className="mt-4 text-xs">{footer}</div> : null}
    </article>
  );
}
