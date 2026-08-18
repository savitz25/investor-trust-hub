'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { NETWORK_LINKS, PRIMARY_ROUTES } from '@ith/config';
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
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <BrandMark className="h-10 w-10 shrink-0" />
          <BrandWordmark className="text-[13px] sm:text-sm" />
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

        <div className="hidden lg:block">
          <details className="relative">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-[var(--ith-border)] bg-white px-3 text-sm font-semibold text-[var(--ith-navy)]">
              Switch Hub
            </summary>
            <div
              role="menu"
              aria-label="Ask Trust Hub Network"
              className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-[var(--ith-border)] bg-white p-2 shadow-lg"
            >
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                Ask Trust Hub Network
              </p>
              <ul className="space-y-0.5">
                {NETWORK_LINKS.map((hub) => {
                  const current = hub.id === 'investor';
                  return (
                    <li key={hub.id}>
                      <a
                        href={current ? '/' : hub.href}
                        aria-current={current ? 'page' : undefined}
                        rel={current ? undefined : 'noopener noreferrer'}
                        className={`block min-h-11 rounded-xl px-2.5 py-2 no-underline ${
                          current ? 'bg-[var(--ith-teal-mist)]' : 'hover:bg-[var(--ith-teal-mist)]'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-[var(--ith-navy)]">
                          {hub.label}
                          {current ? (
                            <span className="ml-2 text-[11px] uppercase tracking-wide text-teal-800">
                              Current
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-slate-600">{hub.blurb}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        </div>

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
          <div className="mt-3 border-t border-[var(--ith-border)] pt-3">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
              Switch Hub
            </p>
            <ul className="space-y-1">
              {NETWORK_LINKS.map((hub) => {
                const current = hub.id === 'investor';
                return (
                  <li key={hub.id}>
                    <a
                      href={current ? '/' : hub.href}
                      aria-current={current ? 'page' : undefined}
                      rel={current ? undefined : 'noopener noreferrer'}
                      className="block rounded-lg px-3 py-3 text-[var(--ith-navy)] no-underline hover:bg-[var(--ith-teal-mist)]"
                    >
                      {hub.label}
                      {current ? ' (current)' : ''}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
