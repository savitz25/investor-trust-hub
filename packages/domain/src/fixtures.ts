import { SYNTHETIC_DISCLAIMER } from './synthetic';
import type { Person } from './people';
import type { Firm, Branch } from './firms';
import type { DisclosureEvent, PersonFirmAssociation, Registration } from './registrations';
import type { EvidenceRecord } from './evidence';

/**
 * Canonical synthetic development fixtures.
 *
 * EVERY record is fictional. Names, identifiers, and events are invented.
 * Official-looking numbers use the SYN- prefix.
 */

export const SYNTHETIC_AS_OF = '2026-08-01T12:00:00.000Z';

export const SYNTHETIC_FIRMS: Firm[] = [
  {
    id: '00000000-0000-4000-b000-000000000001',
    slug: 'northbridge-ledger-advisors',
    legalName: 'Northbridge Ledger Advisors LLC',
    displayName: 'Northbridge Ledger Advisors',
    dbaNames: ['Northbridge Ledger'],
    kinds: ['registered_investment_adviser'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-F1001', issuingAuthorityId: 'sec', isPrimary: true },
      { type: 'sec_file_number', value: 'SYN-801-1001', issuingAuthorityId: 'sec' },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-b000-000000000002',
    slug: 'cedar-pine-wealth',
    legalName: 'Cedar & Pine Wealth Management, Inc.',
    displayName: 'Cedar & Pine Wealth',
    dbaNames: [],
    kinds: ['dual_ria_broker_dealer'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-F1002', issuingAuthorityId: 'finra', isPrimary: true },
      { type: 'sec_file_number', value: 'SYN-801-1002', issuingAuthorityId: 'sec' },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-b000-000000000003',
    slug: 'riverstone-capital-markets',
    legalName: 'Riverstone Capital Markets LLC',
    displayName: 'Riverstone Capital Markets',
    dbaNames: ['Riverstone'],
    kinds: ['broker_dealer'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-F1003', issuingAuthorityId: 'finra', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-b000-000000000004',
    slug: 'harborline-futures-advisory',
    legalName: 'Harborline Futures Advisory LP',
    displayName: 'Harborline Futures Advisory',
    dbaNames: [],
    kinds: ['commodity_trading_adviser'],
    identifiers: [
      { type: 'nfa_id', value: 'SYN-NFA-F1004', issuingAuthorityId: 'nfa', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
];

export const SYNTHETIC_BRANCHES: Branch[] = [
  {
    id: '00000000-0000-4000-c000-000000000001',
    firmId: '00000000-0000-4000-b000-000000000001',
    name: 'Portland research office',
    addressLine1: '100 Imaginary Ledger Way',
    city: 'Portland',
    region: 'OR',
    postalCode: '97201',
    country: 'US',
    isMainOffice: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-c000-000000000002',
    firmId: '00000000-0000-4000-b000-000000000002',
    name: 'Main office',
    addressLine1: '50 Fictional Cedar Plaza',
    city: 'Madison',
    region: 'WI',
    postalCode: '53703',
    country: 'US',
    isMainOffice: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-c000-000000000003',
    firmId: '00000000-0000-4000-b000-000000000003',
    name: 'Chicago branch',
    addressLine1: '1 Synthetic Exchange Row',
    city: 'Chicago',
    region: 'IL',
    postalCode: '60601',
    country: 'US',
    isMainOffice: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-c000-000000000004',
    firmId: '00000000-0000-4000-b000-000000000004',
    name: 'Harbor office',
    addressLine1: '9 Example Wharf',
    city: 'Boston',
    region: 'MA',
    postalCode: '02110',
    country: 'US',
    isMainOffice: true,
    isSynthetic: true,
  },
];

export const SYNTHETIC_PEOPLE: Person[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    slug: 'jordan-p-elmwood',
    displayName: 'Jordan P. Elmwood',
    givenName: 'Jordan',
    familyName: 'Elmwood',
    middleName: 'P',
    kinds: ['investment_adviser_representative'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-P2001', issuingAuthorityId: 'sec', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    slug: 'samira-n-brookfield',
    displayName: 'Samira N. Brookfield',
    givenName: 'Samira',
    familyName: 'Brookfield',
    middleName: 'N',
    kinds: ['dual_registrant'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-P2002', issuingAuthorityId: 'finra', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    slug: 'casey-quill',
    displayName: 'Casey Quill',
    givenName: 'Casey',
    familyName: 'Quill',
    kinds: ['broker'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-P2003', issuingAuthorityId: 'finra', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    slug: 'rowan-k-harbor',
    displayName: 'Rowan K. Harbor',
    givenName: 'Rowan',
    familyName: 'Harbor',
    middleName: 'K',
    kinds: ['commodity_associated_person'],
    identifiers: [
      { type: 'nfa_id', value: 'SYN-NFA-P2004', issuingAuthorityId: 'nfa', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    slug: 'morgan-ellsworth',
    displayName: 'Morgan Ellsworth',
    givenName: 'Morgan',
    familyName: 'Ellsworth',
    kinds: ['investment_adviser_representative'],
    identifiers: [
      { type: 'crd', value: 'SYN-CRD-P2005', issuingAuthorityId: 'sec', isPrimary: true },
    ],
    isSynthetic: true,
    currentAsOf: SYNTHETIC_AS_OF,
  },
];

export const SYNTHETIC_REGISTRATIONS: Registration[] = [
  {
    id: '00000000-0000-4000-d000-000000000001',
    subjectKind: 'person',
    personId: '00000000-0000-4000-a000-000000000001',
    firmId: '00000000-0000-4000-b000-000000000001',
    regulatorAuthorityId: 'sec',
    registrationType: 'investment_adviser_representative',
    status: 'registered',
    commencedOn: '2019-03-01',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000002',
    subjectKind: 'person',
    personId: '00000000-0000-4000-a000-000000000002',
    firmId: '00000000-0000-4000-b000-000000000002',
    regulatorAuthorityId: 'finra',
    registrationType: 'broker',
    status: 'registered',
    commencedOn: '2016-07-12',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000003',
    subjectKind: 'person',
    personId: '00000000-0000-4000-a000-000000000002',
    firmId: '00000000-0000-4000-b000-000000000002',
    regulatorAuthorityId: 'sec',
    registrationType: 'investment_adviser_representative',
    status: 'registered',
    commencedOn: '2018-01-08',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000004',
    subjectKind: 'person',
    personId: '00000000-0000-4000-a000-000000000003',
    firmId: '00000000-0000-4000-b000-000000000003',
    regulatorAuthorityId: 'finra',
    registrationType: 'broker',
    status: 'terminated',
    commencedOn: '2014-05-20',
    endedOn: '2022-11-30',
    isCurrent: false,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000005',
    subjectKind: 'person',
    personId: '00000000-0000-4000-a000-000000000004',
    firmId: '00000000-0000-4000-b000-000000000004',
    regulatorAuthorityId: 'nfa',
    registrationType: 'associated_person',
    status: 'registered',
    commencedOn: '2021-09-15',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000006',
    subjectKind: 'firm',
    firmId: '00000000-0000-4000-b000-000000000001',
    regulatorAuthorityId: 'sec',
    registrationType: 'registered_investment_adviser',
    status: 'registered',
    commencedOn: '2012-04-01',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000007',
    subjectKind: 'firm',
    firmId: '00000000-0000-4000-b000-000000000002',
    regulatorAuthorityId: 'sec',
    registrationType: 'registered_investment_adviser',
    status: 'registered',
    commencedOn: '2008-06-01',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-d000-000000000008',
    subjectKind: 'firm',
    firmId: '00000000-0000-4000-b000-000000000003',
    regulatorAuthorityId: 'finra',
    registrationType: 'broker_dealer',
    status: 'registered',
    commencedOn: '2005-02-14',
    isCurrent: true,
    isSynthetic: true,
  },
];

export const SYNTHETIC_ASSOCIATIONS: PersonFirmAssociation[] = [
  {
    id: '00000000-0000-4000-e000-000000000001',
    personId: '00000000-0000-4000-a000-000000000001',
    firmId: '00000000-0000-4000-b000-000000000001',
    branchId: '00000000-0000-4000-c000-000000000001',
    role: 'Investment adviser representative',
    startedOn: '2019-03-01',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-e000-000000000002',
    personId: '00000000-0000-4000-a000-000000000002',
    firmId: '00000000-0000-4000-b000-000000000002',
    branchId: '00000000-0000-4000-c000-000000000002',
    role: 'Dual registrant',
    startedOn: '2016-07-12',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-e000-000000000003',
    personId: '00000000-0000-4000-a000-000000000003',
    firmId: '00000000-0000-4000-b000-000000000003',
    role: 'Registered representative',
    startedOn: '2014-05-20',
    endedOn: '2022-11-30',
    isCurrent: false,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-e000-000000000004',
    personId: '00000000-0000-4000-a000-000000000004',
    firmId: '00000000-0000-4000-b000-000000000004',
    role: 'Associated person',
    startedOn: '2021-09-15',
    isCurrent: true,
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-e000-000000000005',
    personId: '00000000-0000-4000-a000-000000000005',
    firmId: '00000000-0000-4000-b000-000000000001',
    role: 'Investment adviser representative',
    startedOn: '2024-01-10',
    isCurrent: true,
    isSynthetic: true,
  },
];

export const SYNTHETIC_DISCLOSURES: DisclosureEvent[] = [
  {
    id: '00000000-0000-4000-f000-000000000001',
    personId: '00000000-0000-4000-a000-000000000003',
    firmId: '00000000-0000-4000-b000-000000000003',
    eventKind: 'customer_complaint',
    reportedStatus: 'Closed — as reported by the synthetic source record',
    occurredOn: '2020-04-11',
    reportedOn: '2020-05-02',
    summarySourceText:
      'SYNTHETIC SOURCE TEXT: A fictional customer complaint was reported and later closed. This is not a real regulatory event.',
    sourceSystemId: 'synthetic_dev',
    sourceRecordIdentifier: 'SYN-DISC-3001',
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-f000-000000000002',
    personId: '00000000-0000-4000-a000-000000000002',
    eventKind: 'regulatory',
    reportedStatus: 'Resolved — as reported by the synthetic source record',
    occurredOn: '2017-09-01',
    reportedOn: '2017-10-18',
    summarySourceText:
      'SYNTHETIC SOURCE TEXT: A fictional late-filing notice was reported as resolved. This is not a real regulatory action.',
    sourceSystemId: 'synthetic_dev',
    sourceRecordIdentifier: 'SYN-DISC-3002',
    isSynthetic: true,
  },
  {
    id: '00000000-0000-4000-f000-000000000003',
    firmId: '00000000-0000-4000-b000-000000000003',
    eventKind: 'regulatory',
    reportedStatus: 'Historical — as reported by the synthetic source record',
    occurredOn: '2011-02-22',
    reportedOn: '2011-03-15',
    summarySourceText:
      'SYNTHETIC SOURCE TEXT: A fictional books-and-records examination finding. This is not a real firm action.',
    sourceSystemId: 'synthetic_dev',
    sourceRecordIdentifier: 'SYN-DISC-3003',
    isSynthetic: true,
  },
];

export const SYNTHETIC_EVIDENCE: EvidenceRecord[] = [
  {
    id: '00000000-0000-4000-aa00-000000000001',
    sourceAuthorityId: 'synthetic',
    sourceSystemId: 'synthetic_dev',
    sourceDatasetId: 'synthetic_fixtures',
    sourceDocumentName: 'Task 001 synthetic development fixtures',
    sourceRecordIdentifier: 'SYN-CRD-P2001',
    retrievedAt: SYNTHETIC_AS_OF,
    rawValue: { displayName: 'Jordan P. Elmwood' },
    normalizedValue: { displayName: 'Jordan P. Elmwood' },
    transformVersion: 'task-001-foundation',
    subjectKind: 'person',
    subjectId: '00000000-0000-4000-a000-000000000001',
    fieldName: 'display_name',
    evidenceStatus: 'reported_by_source',
    isCurrent: true,
    isSynthetic: true,
  },
];

export function getPersonBySlug(slug: string): Person | undefined {
  return SYNTHETIC_PEOPLE.find((p) => p.slug === slug);
}

export function getFirmBySlug(slug: string): Firm | undefined {
  return SYNTHETIC_FIRMS.find((f) => f.slug === slug);
}

export function registrationsForPerson(personId: string): Registration[] {
  return SYNTHETIC_REGISTRATIONS.filter((r) => r.personId === personId);
}

export function registrationsForFirm(firmId: string): Registration[] {
  return SYNTHETIC_REGISTRATIONS.filter((r) => r.firmId === firmId && r.subjectKind === 'firm');
}

export function associationsForPerson(personId: string): PersonFirmAssociation[] {
  return SYNTHETIC_ASSOCIATIONS.filter((a) => a.personId === personId);
}

export function associationsForFirm(firmId: string): PersonFirmAssociation[] {
  return SYNTHETIC_ASSOCIATIONS.filter((a) => a.firmId === firmId);
}

export function disclosuresForPerson(personId: string): DisclosureEvent[] {
  return SYNTHETIC_DISCLOSURES.filter((d) => d.personId === personId);
}

export function disclosuresForFirm(firmId: string): DisclosureEvent[] {
  return SYNTHETIC_DISCLOSURES.filter((d) => d.firmId === firmId && !d.personId);
}

export function branchesForFirm(firmId: string): Branch[] {
  return SYNTHETIC_BRANCHES.filter((b) => b.firmId === firmId);
}

export function firmById(firmId: string): Firm | undefined {
  return SYNTHETIC_FIRMS.find((f) => f.id === firmId);
}

export function personById(personId: string): Person | undefined {
  return SYNTHETIC_PEOPLE.find((p) => p.id === personId);
}

export const SYNTHETIC_FIXTURE_DISCLAIMER = SYNTHETIC_DISCLAIMER;
