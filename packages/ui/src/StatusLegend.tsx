import { EVIDENCE_STATUSES, EVIDENCE_STATUS_COPY } from '@ith/domain';

export function StatusLegend() {
  return (
    <section aria-labelledby="status-legend-heading">
      <h2 id="status-legend-heading" className="font-serif text-xl text-[var(--ith-navy)]">
        How to read status labels
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ith-ink)]">
        These labels describe evidence, not endorsement. A source verification is not a
        recommendation. Not found is not a clean record.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {EVIDENCE_STATUSES.map((status) => {
          const copy = EVIDENCE_STATUS_COPY[status];
          return (
            <li key={status} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--ith-navy)]">{copy.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{copy.explanation}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
