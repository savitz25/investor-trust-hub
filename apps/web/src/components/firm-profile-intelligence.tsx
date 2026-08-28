import { ADV_PUBLIC_COPY, type AdvNamedParty, type TrustReportV2Snapshot } from '@ith/domain';
import { EvidenceCard, MethodologyNote, OfficialRecordLink } from '@ith/ui';
import { formatDisplayDate } from '@/lib/dates';

function asOf(value: string | null | undefined): string | null {
  return formatDisplayDate(value);
}

function CountNote({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  if (total <= shown) return null;
  return (
    <p className="mt-2 text-xs text-slate-700">
      Showing {shown} of {total} currently reported {noun}. Additional names remain in the source filing.
    </p>
  );
}

function PartyList({ parties }: { parties: AdvNamedParty[] }) {
  if (parties.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {parties.map((party) => (
        <li key={`${party.relationshipLabel}:${party.displayName}:${party.relatedCrd ?? ''}`} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{party.relationshipLabel}</p>
          <p className="mt-1 break-words text-sm font-medium text-[var(--ith-navy)] [overflow-wrap:anywhere]">
            {party.relatedFirmHref ? (
              <a className="underline decoration-teal-700/30 underline-offset-2" href={party.relatedFirmHref}>
                {party.displayName}
              </a>
            ) : (
              party.displayName
            )}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            {party.kind === 'PERSON' ? 'Individual as reported' : party.kind === 'ORGANIZATION' ? 'Organization as reported' : 'Party as reported'}
            {party.ownershipBand ? ` · Ownership range: ${party.ownershipBand}` : ''}
            {party.titleOrStatus ? ` · Title/status as reported: ${party.titleOrStatus}` : ''}
            {party.relatedCrd ? ` · CRD ${party.relatedCrd}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            {ADV_PUBLIC_COPY.reportedInFormAdv}
            {party.filingDate ? ` dated ${asOf(party.filingDate)}` : ''}
            {party.datasetKind === 'era' ? ' · Exempt reporting adviser filing' : party.datasetKind === 'ria' ? ' · Registered investment adviser filing' : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function FirmProfileIntelligence({ snapshot }: { snapshot: TrustReportV2Snapshot }) {
  const current = snapshot.current;
  const historical = snapshot.historical;

  return (
    <div className="mt-10 space-y-10">
      <section>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Clients, compensation, and custody</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Figures below are adviser-reported Form ADV items. They are not performance, popularity, or quality scores.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <EvidenceCard title="Reported scale" status="reported_by_source">
            {snapshot.scale.notFiledNote ? (
              <p>{snapshot.scale.notFiledNote}</p>
            ) : (
              <>
                <p>Employees as reported: {snapshot.scale.employeeCount ?? 'Not present in this source record'}</p>
                <p className="mt-1">
                  Advisory personnel as reported: {snapshot.scale.advisoryPersonnelCount ?? 'Not present in this source record'}
                </p>
                <p className="mt-1">Clients as reported: {snapshot.scale.clientCount ?? 'Not present in this source record'}</p>
                {snapshot.clientTypes.length > 0 ? (
                  <p className="mt-2">Client types checked: {snapshot.clientTypes.join('; ')}</p>
                ) : null}
              </>
            )}
            {snapshot.scale.asOf ? <p className="mt-2 text-xs">As of {asOf(snapshot.scale.asOf)}</p> : null}
          </EvidenceCard>
          <EvidenceCard title="Reported compensation methods" status="reported_by_source">
            {snapshot.compensation.notFiledNote ? (
              <p>{snapshot.compensation.notFiledNote}</p>
            ) : snapshot.compensation.methods.length > 0 ? (
              <ul className="list-disc pl-5">
                {snapshot.compensation.methods.map((method) => (
                  <li key={method}>{method}</li>
                ))}
              </ul>
            ) : (
              <p>No compensation-method boxes are marked Yes in this source record.</p>
            )}
            <p className="mt-2">{ADV_PUBLIC_COPY.compensationNote}</p>
          </EvidenceCard>
          <EvidenceCard title="Reported custody" status="reported_by_source">
            {snapshot.custody.notFiledNote ? (
              <p>{snapshot.custody.notFiledNote}</p>
            ) : (
              <>
                <p>Client cash: {snapshot.custody.cash ?? 'Not present in this source record'}</p>
                <p className="mt-1">Client securities: {snapshot.custody.securities ?? 'Not present in this source record'}</p>
                <p className="mt-1">
                  Related-person cash: {snapshot.custody.relatedPersonCash ?? 'Not present in this source record'}
                </p>
                <p className="mt-1">
                  Related-person securities:{' '}
                  {snapshot.custody.relatedPersonSecurities ?? 'Not present in this source record'}
                </p>
              </>
            )}
            <p className="mt-2">{ADV_PUBLIC_COPY.custodyNote}</p>
          </EvidenceCard>
        </div>
        {snapshot.otherBusiness.length > 0 || snapshot.affiliationTypes.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {snapshot.otherBusiness.length > 0 ? (
              <EvidenceCard title="Other business activities (Item 6)" status="reported_by_source">
                <ul className="list-disc pl-5">
                  {snapshot.otherBusiness.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </EvidenceCard>
            ) : null}
            {snapshot.affiliationTypes.length > 0 ? (
              <EvidenceCard title="Reported related financial businesses" status="reported_by_source">
                <ul className="list-disc pl-5">
                  {snapshot.affiliationTypes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-2">{ADV_PUBLIC_COPY.affiliationNote}</p>
              </EvidenceCard>
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">{ADV_PUBLIC_COPY.currentHeading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          {ADV_PUBLIC_COPY.namesNotProfiles} {ADV_PUBLIC_COPY.reviewRequiredHidden}
        </p>

        <div className="mt-6">
          <h3 className="font-serif text-xl text-[var(--ith-navy)]">Ownership and control</h3>
          <p className="mt-1 text-sm text-slate-700">
            Schedule A is direct ownership. Schedule B is indirect ownership. An executive/control relationship is
            not the same as ownership.
          </p>
          {current.directOwners.length === 0 && current.indirectOwners.length === 0 && current.executives.length === 0 ? (
            <p className="mt-3 text-sm">
              No current HIGH_CONFIDENCE or CONFIRMED named ownership/control relationships are available to display.
            </p>
          ) : (
            <>
              <PartyList parties={current.directOwners} />
              <CountNote shown={current.directOwners.length} total={current.counts.directOwners} noun="direct owners" />
              <PartyList parties={current.indirectOwners} />
              <CountNote
                shown={current.indirectOwners.length}
                total={current.counts.indirectOwners}
                noun="indirect owners"
              />
              <PartyList parties={current.executives} />
              <CountNote shown={current.executives.length} total={current.counts.executives} noun="executive/control relationships" />
            </>
          )}
        </div>

        <div className="mt-8">
          <h3 className="font-serif text-xl text-[var(--ith-navy)]">Related organizations</h3>
          {current.relatedOrganizations.length === 0 ? (
            <p className="mt-3 text-sm">
              No current CRD-linked related organizations are available to display from Form ADV.
            </p>
          ) : (
            <>
              <PartyList parties={current.relatedOrganizations} />
              <CountNote
                shown={current.relatedOrganizations.length}
                total={current.counts.relatedOrganizations}
                noun="related organizations"
              />
            </>
          )}
        </div>

        <div className="mt-8">
          <h3 className="font-serif text-xl text-[var(--ith-navy)]">Private funds reported by the adviser</h3>
          <p className="mt-1 text-sm text-slate-700">{ADV_PUBLIC_COPY.fundsNotPages}</p>
          {snapshot.privateFundAggregates.count7b1 || snapshot.privateFundAggregates.reportsPrivateFunds ? (
            <p className="mt-3 text-sm">
              {ADV_PUBLIC_COPY.item7bCount}
              {snapshot.privateFundAggregates.reportsPrivateFunds
                ? ` · Item 7.B: ${snapshot.privateFundAggregates.reportsPrivateFunds}`
                : ''}
              {snapshot.privateFundAggregates.count7b1 ? ` · Count 7.B.(1): ${snapshot.privateFundAggregates.count7b1}` : ''}
              {snapshot.privateFundAggregates.grossAssets
                ? ` · Gross assets as reported: ${snapshot.privateFundAggregates.grossAssets}`
                : ''}
            </p>
          ) : null}
          {current.privateFunds.length === 0 ? (
            <p className="mt-3 text-sm">No current named private funds with an official Fund ID are available to display.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {current.privateFunds.map((fund) => (
                <li key={fund.fundId} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {ADV_PUBLIC_COPY.privateFund}
                  </p>
                  <p className="mt-1 break-words text-sm font-medium text-[var(--ith-navy)] [overflow-wrap:anywhere]">
                    {fund.fundName}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-700">{fund.fundId}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    {[fund.state, fund.country].filter(Boolean).join(', ') || 'Domicile not present in this source row'}
                    {fund.filingDate ? ` · ${ADV_PUBLIC_COPY.reportedInFormAdv} dated ${asOf(fund.filingDate)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <CountNote shown={current.privateFunds.length} total={current.counts.privateFunds} noun="named private funds" />
        </div>

        {current.serviceProviders.length > 0 ? (
          <div className="mt-8">
            <h3 className="font-serif text-xl text-[var(--ith-navy)]">Fund service providers</h3>
            <p className="mt-1 text-sm text-slate-700">
              Only current provider rows with sufficient identity quality are shown. Name-only rows remain internal.
            </p>
            <ul className="mt-3 space-y-2">
              {current.serviceProviders.map((row) => (
                <li key={`${row.role}:${row.providerName}`} className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{row.roleLabel}</p>
                  <p className="mt-1 break-words text-sm font-medium text-[var(--ith-navy)]">{row.providerName}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    {row.relatedCrd ? `CRD ${row.relatedCrd} · ` : ''}
                    {row.filingDate ? `${ADV_PUBLIC_COPY.reportedInFormAdv} dated ${asOf(row.filingDate)}` : ADV_PUBLIC_COPY.reportedInFormAdv}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {current.otherOffices.length > 0 ? (
          <div className="mt-8">
            <h3 className="font-serif text-xl text-[var(--ith-navy)]">Other offices</h3>
            <p className="mt-1 text-sm text-slate-700">
              Branch-numbered offices from current Form ADV filings. Address-only rows remain internal.
            </p>
            <ul className="mt-3 space-y-2">
              {current.otherOffices.map((office) => (
                <li
                  key={`${office.branchNumber}:${office.city}:${office.region}`}
                  className="rounded-xl border border-[var(--ith-border)] bg-white p-4 text-sm"
                >
                  <p>
                    {[office.city, office.region, office.postalCode].filter(Boolean).join(', ') || 'Location as reported'}
                    {office.country && office.country !== 'US' ? ` · ${office.country}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    Branch number {office.branchNumber}
                    {office.filingDate ? ` · ${ADV_PUBLIC_COPY.reportedInFormAdv} dated ${asOf(office.filingDate)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
            <CountNote shown={current.otherOffices.length} total={current.counts.otherOffices} noun="other offices" />
          </div>
        ) : null}

        {current.relyingAdvisers.length > 0 ? (
          <div className="mt-8">
            <h3 className="font-serif text-xl text-[var(--ith-navy)]">Relying advisers</h3>
            <PartyList parties={current.relyingAdvisers} />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">{ADV_PUBLIC_COPY.historicalHeading}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          Historical filings are evidence of what was filed, not a restatement of current facts.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Filings in graph</p>
            <p className="mt-2 font-serif text-2xl text-[var(--ith-navy)]">{historical.filingsTotal.toLocaleString('en-US')}</p>
            <p className="mt-1 text-xs text-slate-700">
              RIA {historical.filingsRia.toLocaleString('en-US')} · ERA {historical.filingsEra.toLocaleString('en-US')}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Latest relational filing</p>
            <p className="mt-2 text-sm">{asOf(historical.latestFilingDate) ?? 'Not identified'}</p>
            <p className="mt-1 text-xs text-slate-700">
              {historical.latestDatasetKind === 'era' ? 'Exempt reporting adviser' : historical.latestDatasetKind === 'ria' ? 'Registered investment adviser' : 'Filing family not identified'}
              {historical.latestFilingTypes.length > 0 ? ` · ${historical.latestFilingTypes.join(', ')}` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--ith-border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">ADV-W filings</p>
            <p className="mt-2 font-serif text-2xl text-[var(--ith-navy)]">{historical.withdrawals.length.toLocaleString('en-US')}</p>
            <p className="mt-1 text-xs text-slate-700">Shown as historical evidence only</p>
          </div>
        </div>
        {historical.recentFilings.length > 0 ? (
          <details className="mt-4 rounded-xl border border-[var(--ith-border)] bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ith-navy)]">
              Recent {ADV_PUBLIC_COPY.secFormAdvFiling.toLowerCase()}s
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {historical.recentFilings.map((row) => (
                <li key={`${row.datasetKind}:${row.filingId}`} className="border-t border-slate-100 pt-2">
                  <span className="font-mono text-xs">{row.filingId}</span>
                  {' · '}
                  {asOf(row.dateSubmitted) ?? 'date not present'}
                  {' · '}
                  {row.datasetKind === 'era' ? 'ERA' : row.datasetKind === 'ria' ? 'RIA' : row.datasetKind}
                  {row.filingTypes.length > 0 ? ` · ${row.filingTypes.join(', ')}` : ''}
                  {row.isCurrent ? ' · current reported filing' : ' · historical filing'}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {historical.withdrawals.length > 0 ? (
          <div className="mt-4">
            <h3 className="font-serif text-xl text-[var(--ith-navy)]">Withdrawal history</h3>
            <p className="mt-1 text-sm text-slate-700">{ADV_PUBLIC_COPY.advwNote}</p>
            <ul className="mt-3 space-y-2">
              {historical.withdrawals.map((row) => (
                <li key={row.filingId} className="rounded-xl border border-[var(--ith-border)] bg-white p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {ADV_PUBLIC_COPY.advwFiling}
                  </p>
                  <p className="mt-1">
                    {row.filingType ? row.filingType.toUpperCase() : 'Filing type not present'}
                    {row.filingDate ? ` · ${asOf(row.filingDate)}` : ''}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-700">{row.filingId}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {snapshot.documents.crs.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">{ADV_PUBLIC_COPY.formCrs} documents</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed">
            Official Form CRS mapping/document metadata. InvestorTrustHub does not extract narrative claims from these files.
          </p>
          <ul className="mt-3 space-y-2">
            {snapshot.documents.crs.map((doc) => (
              <li key={doc.officialDocumentId ?? doc.officialFileName ?? doc.sourceUrl ?? 'crs'} className="rounded-xl border border-[var(--ith-border)] bg-white p-4 text-sm">
                <p>{doc.officialFileName ?? doc.officialDocumentId ?? 'Form CRS mapping'}</p>
                <p className="mt-1 text-xs text-slate-700">
                  {doc.submittedOn ? asOf(doc.submittedOn) : 'Date not present in this mapping'}
                  {doc.officialDocumentId ? ` · ${doc.officialDocumentId}` : ''}
                </p>
                {doc.sourceUrl && /^https:\/\//i.test(doc.sourceUrl) ? (
                  <div className="mt-2">
                    <OfficialRecordLink href={doc.sourceUrl} label="Open official Form CRS source" />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl text-[var(--ith-navy)]">Sources and methodology</h2>
        <div className="mt-3">
          <MethodologyNote>
            <p>{snapshot.sources.lead}</p>
            <p className="mt-2">{snapshot.sources.notIndependentVerification}</p>
            <p className="mt-2">
              Snapshot contract {snapshot.version}. Current relationships and historical filings are stored separately.
              REVIEW_REQUIRED and UNRESOLVED rows are not published.
            </p>
          </MethodologyNote>
        </div>
      </section>
    </div>
  );
}
