import {
  FIRM_KIND_LABELS,
  PERSON_KIND_LABELS,
  associationsForPerson,
  disclosuresForPerson,
  firmById,
  registrationsForPerson,
  type Person,
} from '@ith/domain';
import {
  CompareToggle,
  DataFreshness,
  DisclosureSummary,
  EvidenceCard,
  EvidenceUnavailable,
  FirmRelationship,
  IdentifierDisplay,
  MethodologyNote,
  RegistrationHistory,
  SourceCitation,
  SyntheticBanner,
} from '@ith/ui';
import { Breadcrumb } from './breadcrumb';

export function ProfessionalReport({ person }: { person: Person }) {
  const registrations = registrationsForPerson(person.id);
  const associations = associationsForPerson(person.id);
  const disclosures = disclosuresForPerson(person.id);

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: '/professionals', label: 'Professionals' },
          { href: `/professional/${person.slug}`, label: person.displayName },
        ]}
      />
      <div className="mt-6">
        <SyntheticBanner />
      </div>
      <header className="mt-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
          Professional research record
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--ith-navy)]">{person.displayName}</h1>
        <p className="mt-3 text-sm leading-relaxed">
          {person.kinds.map((kind) => PERSON_KIND_LABELS[kind]).join(' · ')}
        </p>
      </header>

      <div className="mt-8">
        <IdentifierDisplay identifiers={person.identifiers} />
      </div>

      <div className="mt-6">
        <DataFreshness asOf={person.currentAsOf?.slice(0, 10)} retrievedAt="2026-08-01" />
      </div>

      <div className="mt-6">
        <CompareToggle label={person.displayName} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <EvidenceCard title="Registration" status="reported_by_source">
          <RegistrationHistory registrations={registrations} />
        </EvidenceCard>
        <EvidenceCard title="Firm relationships" status="reported_by_source">
          <div className="space-y-3">
            {associations.map((association) => {
              const firm = firmById(association.firmId);
              return (
                <FirmRelationship
                  key={association.id}
                  firmName={firm?.displayName ?? 'Unknown firm'}
                  firmHref={firm ? `/firm/${firm.slug}` : undefined}
                  role={association.role}
                  startedOn={association.startedOn}
                  endedOn={association.endedOn}
                  isCurrent={association.isCurrent}
                />
              );
            })}
          </div>
        </EvidenceCard>
      </div>

      <div className="mt-6">
        <EvidenceCard title="Disclosures as reported" status="reported_by_source">
          <DisclosureSummary events={disclosures} />
        </EvidenceCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EvidenceUnavailable status="not_yet_researched" />
        <EvidenceCard title="Official record" status="unavailable">
          <p>
            No official source URL is attached because this is synthetic development data.
            Future reports will link to the cited regulator record.
          </p>
          <div className="mt-3">
            <SourceCitation
              systemName="Synthetic development fixtures"
              documentName="Task 001"
              recordId={person.identifiers[0]?.value}
              retrievedAt="2026-08-01"
            />
          </div>
        </EvidenceCard>
      </div>

      <div className="mt-8">
        <MethodologyNote>
          This page demonstrates the Trust Report component system. It is not a finding about a
          real professional. {firmById(associations[0]?.firmId ?? '')?.kinds
            .map((kind) => FIRM_KIND_LABELS[kind])
            .join(', ') || 'Firm kinds'}{' '}
          shown here are fictional.
        </MethodologyNote>
      </div>
    </article>
  );
}
