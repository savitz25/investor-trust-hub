import type { PublishedStateAdviser } from '@/lib/firms/state-advisers';

export function StateRegistrationPanel({ adviser }: { adviser: PublishedStateAdviser }) {
  return (
    <section className="th-shell py-8" aria-labelledby="state-registration-heading">
      <h2 id="state-registration-heading" className="font-serif text-2xl text-[var(--ith-navy)]">
        State adviser registrations reported by IAPD
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-700">
        These are state registration observations for firm CRD {adviser.crd}, not SEC registration,
        approval, endorsement, or a finding about the firm&apos;s quality. This source does not supply
        a principal office for this profile.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {adviser.registrations.map((registration) => (
          <li key={registration.state} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
            <strong>{registration.state}</strong> · Reported as state-registered
            <p className="mt-1 text-sm text-slate-700">
              Registration date: {registration.registrationDate ?? 'not provided'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              IAPD firm-state release {registration.sourceLabel}; retrieved {registration.retrievedAt ?? 'date unavailable'}.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StateAdviserFirmReport({ adviser }: { adviser: PublishedStateAdviser }) {
  return (
    <article>
      <header className="th-shell pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">State adviser firm research</p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--ith-navy)]">{adviser.displayName}</h1>
        {adviser.legalName !== adviser.displayName ? <p className="mt-2 text-slate-700">{adviser.legalName}</p> : null}
        <p className="mt-3 font-mono text-sm">Firm CRD {adviser.crd}</p>
        <p className="mt-4 max-w-3xl text-sm text-slate-700">
          This profile contains the cited IAPD state-registration observations. SEC registration,
          Form ADV details, disclosures, and principal office are not established by these rows.
        </p>
      </header>
      <StateRegistrationPanel adviser={adviser} />
    </article>
  );
}
