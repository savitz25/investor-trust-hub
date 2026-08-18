import {
  FIRM_KIND_LABELS,
  associationsForFirm,
  branchesForFirm,
  disclosuresForFirm,
  personById,
  registrationsForFirm,
  type Firm,
} from '@ith/domain';
import {
  CompareToggle,
  DataFreshness,
  DisclosureSummary,
  EvidenceCard,
  EvidenceUnavailable,
  IdentifierDisplay,
  MethodologyNote,
  RegistrationHistory,
  SourceCitation,
  SyntheticBanner,
} from '@ith/ui';
import Link from 'next/link';
import { Breadcrumb } from './breadcrumb';

export function FirmReport({ firm }: { firm: Firm }) {
  const registrations = registrationsForFirm(firm.id);
  const associations = associationsForFirm(firm.id);
  const disclosures = disclosuresForFirm(firm.id);
  const branches = branchesForFirm(firm.id);

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { href: '/', label: 'Home' },
          { href: '/firms', label: 'Firms' },
          { href: `/firm/${firm.slug}`, label: firm.displayName },
        ]}
      />
      <div className="mt-6">
        <SyntheticBanner />
      </div>
      <header className="mt-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
          Firm research record
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[var(--ith-navy)]">{firm.displayName}</h1>
        <p className="mt-2 text-sm">{firm.legalName}</p>
        <p className="mt-2 text-sm">{firm.kinds.map((kind) => FIRM_KIND_LABELS[kind]).join(' · ')}</p>
      </header>

      <div className="mt-8">
        <IdentifierDisplay identifiers={firm.identifiers} />
      </div>
      <div className="mt-6">
        <DataFreshness asOf={firm.currentAsOf?.slice(0, 10)} retrievedAt="2026-08-01" />
      </div>
      <div className="mt-6">
        <CompareToggle label={firm.displayName} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <EvidenceCard title="Registration" status="reported_by_source">
          <RegistrationHistory registrations={registrations} />
        </EvidenceCard>
        <EvidenceCard title="Locations" status="reported_by_source">
          <ul className="space-y-2 text-sm">
            {branches.map((branch) => (
              <li key={branch.id}>
                {branch.name} — {branch.city}, {branch.region} {branch.postalCode}
              </li>
            ))}
          </ul>
        </EvidenceCard>
      </div>

      <div className="mt-6">
        <EvidenceCard title="People currently associated in this fixture" status="reported_by_source">
          <ul className="space-y-2 text-sm">
            {associations.map((association) => {
              const person = personById(association.personId);
              return (
                <li key={association.id}>
                  {person ? (
                    <Link href={`/professional/${person.slug}`} className="underline-offset-2 hover:underline">
                      {person.displayName}
                    </Link>
                  ) : (
                    'Unknown person'
                  )}{' '}
                  — {association.role}
                </li>
              );
            })}
          </ul>
        </EvidenceCard>
      </div>

      <div className="mt-6">
        <EvidenceCard title="Disclosures as reported" status="reported_by_source">
          <DisclosureSummary events={disclosures} />
        </EvidenceCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EvidenceUnavailable
          status="not_found"
          detail="Fee, AUM, and conflict items are not in this development fixture. Not found here does not mean none exist."
        />
        <EvidenceCard title="Official record" status="unavailable">
          <SourceCitation
            systemName="Synthetic development fixtures"
            documentName="Task 001"
            recordId={firm.identifiers[0]?.value}
            retrievedAt="2026-08-01"
          />
        </EvidenceCard>
      </div>

      <div className="mt-8">
        <MethodologyNote>
          Future firm reports will cite Form ADV, BrokerCheck, NFA BASIC, or other official
          systems. This page is a design-system demonstration only.
        </MethodologyNote>
      </div>
    </article>
  );
}
