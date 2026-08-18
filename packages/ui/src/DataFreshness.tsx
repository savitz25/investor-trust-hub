export function DataFreshness({
  asOf,
  retrievedAt,
  sourceEffectiveDate,
}: {
  asOf?: string;
  retrievedAt?: string;
  sourceEffectiveDate?: string;
}) {
  return (
    <dl className="grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-[var(--ith-navy)]">Current as of</dt>
        <dd>{asOf ?? 'Not yet researched'}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--ith-navy)]">Retrieved</dt>
        <dd>{retrievedAt ?? 'Not retrieved'}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--ith-navy)]">Source effective date</dt>
        <dd>{sourceEffectiveDate ?? 'Not provided'}</dd>
      </div>
    </dl>
  );
}
