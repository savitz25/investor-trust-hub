'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { deviceFirstProfileUnsave } from '@/lib/my-investor/parent-adapter';
import { STORE_EVENT, listSavedFirms, type SavedFirm } from '@/lib/my-investor/storage';

/** Saved firms on this device. Research only: no account, no Watch. */
export function SavedFirms() {
  const [rows, setRows] = useState<SavedFirm[] | null>(null);

  const sync = useCallback(() => {
    setRows(listSavedFirms());
  }, []);

  useEffect(() => {
    const initialize = window.setTimeout(sync, 0);
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  if (rows === null) return <p className="text-sm text-slate-600">Loading saved firms…</p>;
  if (rows.length === 0) {
    return (
      <p className="text-sm leading-relaxed">
        No saved firms on this device yet. Open a firm from{' '}
        <Link href="/firms" className="font-semibold underline">Firms</Link> and choose Save.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--ith-border)] rounded-2xl border border-[var(--ith-border)] bg-white">
      {rows.map((row) => (
        <li key={row.slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <Link href={row.profilePath} className="break-words font-semibold text-[var(--ith-navy)] underline">
              {row.name}
            </Link>
            <p className="mt-1 text-xs text-slate-600">
              {row.crd ? <span className="font-mono">CRD {row.crd}</span> : 'CRD not recorded'}
              {row.kind === 'state_adviser_firm' ? ' · State adviser firm research' : ' · Firm Trust Report'}
            </p>
          </div>
          <button
            type="button"
            className="th-btn-secondary"
            aria-pressed
            aria-label={`♥ Saved ${row.name}`}
            onClick={() => deviceFirstProfileUnsave({ slug: row.slug, crd: row.crd, kind: row.kind })}
          >
            ♥ Saved
          </button>
        </li>
      ))}
    </ul>
  );
}
