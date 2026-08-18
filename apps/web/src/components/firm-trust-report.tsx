import {
  NOT_YET_RESEARCHED_ITEMS,
  OFFICIAL_IAPD_HOME,
  RAUM_EXPLANATION,
  REGISTRATION_EXPLAINERS,
  SEC_ADV_SOURCE_NOTE,
  isUsStateCode,
} from '@ith/domain';
import {
  DataFreshness,
  EvidenceCard,
  EvidenceUnavailable,
  IdentifierDisplay,
  MethodologyNote,
  OfficialRecordLink,
  RegistrationStatus,
  SourceCitation,
} from '@ith/ui';
import type { CanonicalIdentifier } from '@ith/domain';
import { Breadcrumb } from './breadcrumb';
import type { FirmTrustReportModel } from '@/lib/firms/types';
import { formatDisplayDate, formatReleaseLabel } from '@/lib/dates';

function identifiersFor(report: FirmTrustReportModel): CanonicalIdentifier[] {
  const ids: CanonicalIdentifier[] = [{ type: 'crd', value: report.crd, issuingAuthorityId: 'sec', isPrimary: true }];
  if (report.secFileNumber) {
    ids.push({ type: 'sec_file_number', value: report.secFileNumber, issuingAuthorityId: 'sec' });
  }
  return ids;
}

function datasetLabel(report: FirmTrustReportModel): string {
  return report.datasetKind === 'era'
    ? 'Exempt Reporting Advisers (IARD firm roster)'
    : 'Registered Investment Advisers (IARD firm roster)';
}

export function FirmTrustReport({ report }: { report: FirmTrustReportModel }) {
  const crumbs = [
    { href: '/', label: 'Home' },
    { href: '/firms', label: 'Firms' },
    ...(report.indexability.geoDiscoveryEligible && report.office.region && isUsStateCode(report.office.region)
      ? [{ href: `/firms?state=${report.office.region}`, label: report.office.region }]
      : []),
    { href: `/firm/${report.slug}`, label: report.displayName },
  ];
  const retrieved = formatDisplayDate(report.retrievedAt);
  const release = formatReleaseLabel(report.releaseLabel);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href,
    })),
  };

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb items={crumbs} />

      <header className="mt-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Firm Trust Report</p>
        <h1 className="mt-3 break-words font-serif text-3xl leading-tight text-[var(--ith-navy)] sm:text-4xl">
          {report.displayName}
        </h1>
        {report.legalName !== report.displayName ? (
          <p className="mt-2 break-words text-sm text-slate-700">{report.legalName}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RegistrationStatus status={report.classification.registrationStatus} />
          <span className="text-sm text-slate-700">{report.classification.headline}</span>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{report.classification.supportingCopy}</p>
      </header>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-[var(--ith-border)] bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">CRD</dt>
          <dd className="mt-1 font-mono text-lg text-[var(--ith-navy)]">{report.crd}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">SEC file number</dt>
          <dd className="mt-1 text-sm text-[var(--ith-navy)]">
            {report.secFileNumber ? (
              <span className="font-mono text-lg">{report.secFileNumber}</span>
            ) : (
              'SEC file number not present in this source record'
            )}
          </dd>
        </div>
        {report.office.hasAny ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Principal office</dt>
            <dd className="mt-1 text-sm leading-relaxed">
              <PrincipalOffice report={report} />
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <DataFreshness
          asOf={release ?? undefined}
          retrievedAt={retrieved ?? undefined}
          sourceEffectiveDate={release ?? undefined}
        />
        <p className="mt-3 text-xs text-slate-700">
          SEC/IARD source release: {release ?? 'not identified'} · InvestorTrustHub retrieved:{' '}
          {retrieved ?? 'not identified'}
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Official identifiers</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Identifiers come from the cited SEC/IARD firm roster. InvestorTrustHub does not invent missing numbers.
        </p>
        <div className="mt-4">
          <IdentifierDisplay identifiers={identifiersFor(report)} />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <EvidenceCard title="Regulatory status" status="reported_by_source">
          <p className="font-medium">{report.classification.headline}</p>
          <p className="mt-2">{report.classification.supportingCopy}</p>
        </EvidenceCard>
        <EvidenceCard title="Source" status="reported_by_source">
          <p>U.S. Securities and Exchange Commission / IARD Form ADV dataset.</p>
          <p className="mt-2">{datasetLabel(report)}</p>
          <div className="mt-3">
            <OfficialRecordLink href={OFFICIAL_IAPD_HOME} label="View official IAPD search" />
          </div>
        </EvidenceCard>
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Firm / ADV facts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Fact label="Legal structure" value={report.organizationForm} missing="Not present in this source record" />
          <Fact
            label="Website as reported"
            value={report.website}
            missing="Website not present in this source record"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Regulatory assets under management</h2>
        {report.raum ? (
          <div className="mt-3 rounded-2xl border border-[var(--ith-border)] bg-white p-5">
            <p className="font-serif text-3xl text-[var(--ith-navy)]">{report.raum.display}</p>
            <p className="mt-1 text-sm text-slate-700">Exact source amount: {report.raum.exact}</p>
            <p className="mt-3 text-sm leading-relaxed">{RAUM_EXPLANATION}</p>
          </div>
        ) : (
          <div className="mt-3">
            <EvidenceUnavailable
              status="not_found"
              detail="This source record does not include a regulatory assets under management figure. That does not mean the firm has no assets, and it is not a quality finding."
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Regulatory disclosures</h2>
        <div className="mt-3">
          <EvidenceUnavailable
            status="not_yet_researched"
            detail="Form ADV disclosure checkboxes are stored as source evidence but are not interpreted as a disciplinary history. This is not a finding of “no disclosures” or a clean record."
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Evidence and source details</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Material facts on this page are traced to the official SEC/IARD roster. Expand a panel to see source
          context. Raw 400-column filings are not dumped here.
        </p>
        <div className="mt-4 space-y-3">
          <details className="rounded-xl border border-[var(--ith-border)] bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ith-navy)]">
              Source, dataset, and retrieval
            </summary>
            <div className="mt-3 text-sm leading-relaxed">
              <SourceCitation
                systemName="U.S. Securities and Exchange Commission / IARD"
                documentName={datasetLabel(report)}
                recordId={report.crd}
                href={OFFICIAL_IAPD_HOME}
                retrievedAt={retrieved ?? undefined}
              />
              <p className="mt-2">Release: {release ?? 'not identified in this record'}</p>
              <p>Evidence records tied to this firm: {report.evidenceCount}</p>
              <p>Raw source snapshot: {report.hasSnapshot ? 'present' : 'not present'}</p>
              {report.sourceStatusText ? (
                <p className="mt-2">
                  Source status text (not a consumer endorsement): {report.sourceStatusText}
                </p>
              ) : null}
            </div>
          </details>
          <details className="rounded-xl border border-[var(--ith-border)] bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ith-navy)]">
              What these terms mean
            </summary>
            <div className="mt-3 space-y-4 text-sm leading-relaxed">
              {REGISTRATION_EXPLAINERS.map((item) => (
                <div key={item.id}>
                  <h3 className="font-semibold text-[var(--ith-navy)]">{item.title}</h3>
                  <p className="mt-1">{item.body}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">
          What InvestorTrustHub has not researched yet
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Absence from this page is not a finding that a record is clean, that no disclosure exists, or that
          the firm has no associated professionals.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          {NOT_YET_RESEARCHED_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <MethodologyNote>
          <p>{SEC_ADV_SOURCE_NOTE}</p>
          <p className="mt-2">
            Indexability means only that a page has enough sourced content to stand alone as a research result. It
            is not a ranking, approval, or recommendation.
          </p>
        </MethodologyNote>
      </div>
    </article>
  );
}

function PrincipalOffice({ report }: { report: FirmTrustReportModel }) {
  const office = report.office;
  return (
    <address className="not-italic">
      {office.line1 ? <div>{office.line1}</div> : null}
      {office.line2 ? <div>{office.line2}</div> : null}
      <div>
        {[office.city, office.region && isUsStateCode(office.region) ? office.region : null, office.postalCode]
          .filter(Boolean)
          .join(', ')}
      </div>
      {!office.region || !isUsStateCode(office.region) ? (
        <div className="text-slate-700">State not provided in this source record</div>
      ) : null}
      {office.countryUsable && office.countryCode && office.countryCode !== 'US' ? (
        <div>{office.countryLabel}</div>
      ) : !office.countryUsable ? (
        <div className="text-slate-700">{office.countryLabel}</div>
      ) : null}
    </address>
  );
}

function Fact({
  label,
  value,
  missing,
}: {
  label: string;
  value: string | null;
  missing: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="mt-2 break-words text-sm">{value || missing}</p>
    </div>
  );
}
