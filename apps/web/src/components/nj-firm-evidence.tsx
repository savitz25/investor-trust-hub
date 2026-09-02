import { exactCrdProfileAttachments, mayAttachNjEvidenceToProfile } from '@ith/domain';

/**
 * NJ-INV-003 profile module. Renders Bureau evidence only for exact/high-confidence
 * production identity. Synthetic, name-only, review-required, and unresolved matches
 * are withheld. An empty module is omitted so absence is not a clean-record claim.
 */
export function NjFirmEvidenceModule({
  crd,
  isSynthetic,
}: {
  crd: string | null;
  isSynthetic: boolean;
}) {
  if (isSynthetic || !crd) return null;
  const rows = exactCrdProfileAttachments(crd).filter((row) => mayAttachNjEvidenceToProfile(row.matchStatus));
  if (rows.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-[var(--ith-navy)]">New Jersey regulatory evidence</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed">
        Bureau of Securities documents attached only on an exact official identifier. Individual actions are not
        copied to employers. A general order is not listed here as firm enforcement.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={JSON.stringify(row)} className="rounded-xl border border-[var(--ith-border)] bg-white p-4 text-sm">
            New Jersey Bureau evidence attached by exact identifier.
          </li>
        ))}
      </ul>
    </section>
  );
}
