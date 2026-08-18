import type { EvidenceStatus } from '@ith/domain';
import { EVIDENCE_STATUS_COPY } from '@ith/domain';

export function EvidenceUnavailable({
  status = 'unavailable',
  detail,
}: {
  status?: Extract<
    EvidenceStatus,
    'not_found' | 'unavailable' | 'not_yet_researched' | 'conflicting_sources'
  >;
  detail?: string;
}) {
  const copy = EVIDENCE_STATUS_COPY[status];
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm">
      <p className="font-semibold text-[var(--ith-navy)]">{copy.label}</p>
      <p className="mt-1 leading-relaxed text-slate-700">{detail ?? copy.explanation}</p>
    </div>
  );
}
