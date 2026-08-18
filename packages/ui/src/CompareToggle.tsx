'use client';

import { useState } from 'react';

export function CompareToggle({
  label,
  disabledReason = 'Compare is reserved for sourced records. It is not available for synthetic fixtures as a ranking tool.',
}: {
  label: string;
  disabledReason?: string;
}) {
  const [on, setOn] = useState(false);

  return (
    <div>
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOn((value) => !value)}
        className="inline-flex min-h-11 items-center rounded-xl border border-[var(--ith-border)] bg-white px-4 text-sm font-medium text-[var(--ith-navy)] hover:bg-[var(--ith-teal-mist)]"
      >
        {on ? 'Added to compare list' : `Compare ${label}`}
      </button>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-700">{disabledReason}</p>
    </div>
  );
}
