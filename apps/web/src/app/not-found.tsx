import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Not found</p>
      <h1 className="mt-3 font-serif text-4xl text-[var(--ith-navy)]">This page is not here</h1>
      <p className="mt-4 text-sm leading-relaxed">
        Missing is not a regulatory finding. If you were looking for a professional or firm, we
        may not have researched that record yet.
      </p>
      <p className="mt-6">
        <Link href="/" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
          Return home
        </Link>
      </p>
    </div>
  );
}
