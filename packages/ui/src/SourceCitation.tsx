export function SourceCitation({
  systemName,
  documentName,
  recordId,
  href,
  retrievedAt,
}: {
  systemName: string;
  documentName?: string;
  recordId?: string;
  href?: string;
  retrievedAt?: string;
}) {
  return (
    <p className="text-xs leading-relaxed text-slate-700">
      <span className="font-semibold text-[var(--ith-navy)]">Source. </span>
      {href ? (
        <a
          href={href}
          className="underline decoration-teal-700/40 underline-offset-2 hover:decoration-teal-700"
          rel="noopener noreferrer"
        >
          {systemName}
        </a>
      ) : (
        <span>{systemName}</span>
      )}
      {documentName ? <span> · {documentName}</span> : null}
      {recordId ? <span> · record {recordId}</span> : null}
      {retrievedAt ? <span> · retrieved {retrievedAt}</span> : null}
    </p>
  );
}
