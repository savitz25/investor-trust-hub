import type { CanonicalIdentifier } from '@ith/domain';
import { formatIdentifierLabel, isSyntheticIdentifierValue } from '@ith/domain';

export function IdentifierDisplay({ identifiers }: { identifiers: CanonicalIdentifier[] }) {
  if (identifiers.length === 0) {
    return <p className="text-sm">No identifiers are attached to this record yet.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {identifiers.map((id) => (
        <li
          key={`${id.type}:${id.value}`}
          className="rounded-lg border border-[var(--ith-border)] bg-white px-3 py-2"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {formatIdentifierLabel(id.type)}
          </p>
          <p className="min-w-0 break-words font-mono text-sm text-[var(--ith-navy)] [overflow-wrap:anywhere]">
            {id.value}
          </p>
          {isSyntheticIdentifierValue(id.value) ? (
            <p className="mt-1 text-[11px] text-amber-900">Synthetic identifier</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
