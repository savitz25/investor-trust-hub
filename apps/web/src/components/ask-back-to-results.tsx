import Link from 'next/link';
import type { InvestorAskSearchContext } from '@ith/domain';
import { buildAskBackLabel, buildAskFirmsHref } from '@ith/domain';

export function AskBackToResults({ ctx }: { ctx: InvestorAskSearchContext }) {
  return (
    <p className="mt-4" data-ask-handoff-back="1">
      <Link
        href={buildAskFirmsHref(ctx)}
        className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
      >
        {buildAskBackLabel(ctx)}
      </Link>
    </p>
  );
}
