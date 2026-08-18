import { SYNTHETIC_DISCLAIMER, SYNTHETIC_PAGE_NOTICE } from '@ith/domain';

export function SyntheticBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">{SYNTHETIC_DISCLAIMER}</p>
      {compact ? null : <p className="mt-1 leading-relaxed">{SYNTHETIC_PAGE_NOTICE}</p>}
    </div>
  );
}
