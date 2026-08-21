import Link from 'next/link';
import { HOME_PATHS } from '@ith/config';

export function HomePaths() {
  return (
    <section className="border-b border-[var(--ith-border)] bg-white/60">
      <div className="th-shell py-14">
        <h2 className="font-serif text-3xl text-[var(--ith-navy)]">Start with a research path</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--ith-ink)]">
          Some paths are a working foundation. Others are planned Decision Lab tools and are
          labeled coming soon. We do not pretend unfinished functionality works.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {HOME_PATHS.map((path) => (
            <Link
              key={path.title}
              href={path.href}
              className="th-card no-underline hover:border-teal-200"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                {path.status === 'coming_soon' ? 'Coming soon' : 'Foundation'}
              </p>
              <h3 className="mt-2 font-serif text-xl text-[var(--ith-navy)]">{path.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ith-ink)]">{path.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
