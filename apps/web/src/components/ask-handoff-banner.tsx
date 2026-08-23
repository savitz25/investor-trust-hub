import type { InvestorAskSearchContext } from '@ith/domain';
import { buildAskBackLabel } from '@ith/domain';

/** Visible preload notice — customer must not need to retype the Ask query. */
export function AskHandoffBanner({ ctx }: { ctx: InvestorAskSearchContext }) {
  const label = buildAskBackLabel(ctx).replace(/^←\s*Back to\s+/i, '');
  return (
    <p
      className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-[var(--ith-navy)]"
      data-ask-handoff="1"
    >
      Preloaded from AskTrustHub — {label}. Filters match structured search context (not a retyped
      query). Held/noindex firms stay held.
    </p>
  );
}
