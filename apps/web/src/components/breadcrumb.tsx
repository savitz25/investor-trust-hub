import Link from 'next/link';

export function Breadcrumb({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-2 text-slate-700">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="font-medium text-[var(--ith-navy)]">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              )}
              {last ? null : <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
