import Link from 'next/link';
import { hasDatabaseUrl } from '@/lib/db';
import { listPublishedStateAdvisers } from '@/lib/firms/state-advisers';

/** Published IAPD registration slice; principal-office snapshots above stay separate. */
export async function StateAdviserStatePanel({ state }: { state: 'CA' | 'TX' | 'AZ' | 'WA' }) {
  if (!hasDatabaseUrl()) return null;
  try {
    const lens = await listPublishedStateAdvisers(state, 1);
    if (!lens.registrations) return null;
    return (
      <section className="th-shell py-8" aria-labelledby={`${state}-state-adviser-title`}>
        <h2 id={`${state}-state-adviser-title`} className="font-serif text-2xl text-[var(--ith-navy)]">
          IAPD state adviser registrations in {state}
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          {lens.registrations.toLocaleString('en-US')} published APPROVED firm-state observations, one per CRD and state.
          This is a September 30 IAPD slice, not a complete state license roster or a principal-office count.
        </p>
        <Link className="mt-3 inline-block underline" href={`/state-advisers?state=${state}`}>
          Research {state} state adviser firms
        </Link>
      </section>
    );
  } catch {
    return null;
  }
}
