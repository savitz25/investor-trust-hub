export function OfficialRecordLink({
  href,
  label = 'View official record',
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline decoration-teal-700/40 underline-offset-2 hover:decoration-teal-800"
      rel="noopener noreferrer"
    >
      {label}
      <span className="sr-only"> (opens official source)</span>
    </a>
  );
}
