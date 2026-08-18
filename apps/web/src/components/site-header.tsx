'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { PRIMARY_ROUTES } from '@ith/config';
import { BrandMark, BrandWordmark } from '@ith/ui';

export function SiteHeader() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ith-border)] bg-[color:rgb(246_244_239_/_0.92)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <BrandMark className="h-9 w-9" />
          <BrandWordmark className="text-lg text-[var(--ith-navy)]" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_ROUTES.filter((route) => route.href !== '/').map((route) => {
            const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`rounded-lg px-3 py-2 text-sm no-underline ${
                  active
                    ? 'bg-[var(--ith-teal-mist)] font-semibold text-teal-900'
                    : 'text-[var(--ith-navy)] hover:bg-white'
                }`}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--ith-border)] bg-white lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true" className="text-lg leading-none">
            {open ? '×' : '☰'}
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id={panelId}
          aria-label="Mobile"
          className="border-t border-[var(--ith-border)] bg-[var(--ith-paper)] px-4 py-4 lg:hidden"
        >
          <ul className="space-y-1">
            {PRIMARY_ROUTES.filter((route) => route.href !== '/').map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className="block rounded-lg px-3 py-3 text-[var(--ith-navy)] no-underline hover:bg-[var(--ith-teal-mist)]"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
