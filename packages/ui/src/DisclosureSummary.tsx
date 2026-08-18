import type { DisclosureEvent } from '@ith/domain';
import { DISCLOSURE_EVENT_KIND_LABELS } from '@ith/domain';

export function DisclosureSummary({ events }: { events: DisclosureEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[var(--ith-ink)]">
        No disclosure events are attached to this development record. That is not a finding
        of a clean history, and it does not mean no events exist in official sources.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ith-teal)]">
            {DISCLOSURE_EVENT_KIND_LABELS[event.eventKind]}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--ith-navy)]">
            {event.reportedStatus ?? 'Status as reported'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ith-ink)]">
            {event.summarySourceText}
          </p>
          <p className="mt-2 text-xs text-slate-700">
            Source system {event.sourceSystemId} · record {event.sourceRecordIdentifier}
            {event.reportedOn ? ` · reported ${event.reportedOn}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}
