export function FirmRelationship({
  firmName,
  firmHref,
  role,
  startedOn,
  endedOn,
  isCurrent,
}: {
  firmName: string;
  firmHref?: string;
  role: string;
  startedOn?: string;
  endedOn?: string;
  isCurrent: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ith-teal)]">
        {isCurrent ? 'Current firm relationship' : 'Former firm relationship'}
      </p>
      <p className="mt-1 font-medium text-[var(--ith-navy)]">
        {firmHref ? (
          <a className="underline decoration-teal-700/30 underline-offset-2" href={firmHref}>
            {firmName}
          </a>
        ) : (
          firmName
        )}
      </p>
      <p className="mt-1 text-sm text-[var(--ith-ink)]">{role}</p>
      <p className="mt-1 text-xs text-slate-700">
        {startedOn ?? 'Start date not in this record'}
        {' — '}
        {endedOn ?? (isCurrent ? 'current as reported' : 'end date not in this record')}
      </p>
    </div>
  );
}
