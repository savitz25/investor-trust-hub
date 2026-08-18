import { SOURCE_AUTHORITIES, SOURCE_SYSTEMS } from '@ith/config';
import { SEC_ADV_SOURCE_NOTE } from '@ith/domain';
import { MethodologyNote } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Sources',
  path: '/sources',
});

export default function SourcesPage() {
  return (
    <PageShell
      eyebrow="Sources"
      title="Official sources we will organize"
      lead="These authorities are registered in configuration. Task 002 adds the official SEC IARD registered-adviser and exempt-reporting-adviser firm rosters. BrokerCheck is not ingested."
    >
      <div className="space-y-8">
        <MethodologyNote>{SEC_ADV_SOURCE_NOTE}</MethodologyNote>
        <section>
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Authorities</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {SOURCE_AUTHORITIES.filter((authority) => authority.id !== 'synthetic').map(
              (authority) => (
                <li key={authority.id} className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
                  <h3 className="font-semibold text-[var(--ith-navy)]">{authority.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{authority.notes}</p>
                  {authority.officialUrl ? (
                    <p className="mt-3 text-sm">
                      <a href={authority.officialUrl} rel="noopener noreferrer" className="font-medium text-teal-800">
                        Official site
                      </a>
                    </p>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        </section>
        <section>
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Source systems</h2>
          <ul className="mt-4 space-y-4">
            {SOURCE_SYSTEMS.filter((system) => system.id !== 'synthetic_dev').map((system) => (
              <li key={system.id} className="rounded-2xl border border-[var(--ith-border)] bg-white p-5">
                <h3 className="font-semibold text-[var(--ith-navy)]">{system.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-600">
                  {system.authorityId} · {system.datasetKind}
                  {system.prospectingProhibited ? ' · prospecting prohibited' : ''}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{system.freshnessRequirementNotes}</p>
                <p className="mt-2 text-sm leading-relaxed">{system.correctionNotes}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
