'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CanonicalIdentifier } from '@ith/domain';
import { formatIdentifierLabel, matchesQuery } from '@ith/domain';
import { IdentifierDisplay, SyntheticBanner } from '@ith/ui';

export interface DirectoryItem {
  slug: string;
  href: string;
  displayName: string;
  subtitle: string;
  identifiers: CanonicalIdentifier[];
  location?: string;
  haystack: string;
}

export function DirectorySearch({
  items,
  placeholder,
}: {
  items: DirectoryItem[];
  placeholder: string;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => items.filter((item) => matchesQuery(item.haystack, q)),
    [items, q],
  );

  return (
    <div>
      <SyntheticBanner />
      <form className="mt-6" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="directory-q" className="text-sm font-medium text-[var(--ith-navy)]">
          Filter this development directory
        </label>
        <input
          id="directory-q"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-[var(--ith-border)] bg-white px-4 py-3 text-[var(--ith-ink)]"
        />
        <p className="mt-2 text-xs text-slate-700">
          Filters synthetic fixtures only. Production search across official records is not live.
        </p>
      </form>
      <ul className="mt-8 space-y-4">
        {filtered.map((item) => (
          <li key={item.slug}>
            <article className="rounded-2xl border border-[var(--ith-border)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Synthetic development data — not a real person or firm.
              </p>
              <h2 className="mt-2 font-serif text-2xl text-[var(--ith-navy)]">
                <Link href={item.href} className="underline-offset-2 hover:underline">
                  {item.displayName}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-[var(--ith-ink)]">{item.subtitle}</p>
              {item.location ? <p className="mt-1 text-sm text-slate-700">{item.location}</p> : null}
              <div className="mt-4">
                <IdentifierDisplay identifiers={item.identifiers} />
              </div>
              <p className="mt-3 text-xs text-slate-600">
                {item.identifiers
                  .map((id) => `${formatIdentifierLabel(id.type)} ${id.value}`)
                  .join(' · ')}
              </p>
            </article>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="mt-8 text-sm">No synthetic fixtures match that filter.</p>
      ) : null}
    </div>
  );
}
