/**
 * Evidence and research status vocabulary.
 *
 * These labels are product language, not endorsement language.
 * Never map "verified" to "recommended", "safe", or "best".
 * Never map "not found" to "none exists" or "clean record".
 */

export const EVIDENCE_STATUSES = [
  'verified_from_official_source',
  'reported_by_source',
  'not_found',
  'unavailable',
  'not_yet_researched',
  'conflicting_sources',
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  'registered',
  'pending',
  'terminated',
  'withdrawn',
  'restricted',
  'unknown',
  'not_yet_researched',
] as const;

export type RegistrationStatusValue = (typeof REGISTRATION_STATUSES)[number];

export interface StatusCopy {
  label: string;
  shortLabel: string;
  explanation: string;
  /** Visual tone — never "success = endorsed". */
  tone: 'official' | 'reported' | 'caution' | 'neutral' | 'conflict';
}

export const EVIDENCE_STATUS_COPY: Record<EvidenceStatus, StatusCopy> = {
  verified_from_official_source: {
    label: 'Verified from official source',
    shortLabel: 'Official source',
    explanation:
      'This fact is traced to an official source record we retrieved. Verification means the source said this — not that we endorse the person, firm, or product.',
    tone: 'official',
  },
  reported_by_source: {
    label: 'Reported by source',
    shortLabel: 'Reported',
    explanation:
      'A source reports this value. We have not independently confirmed it beyond the cited record.',
    tone: 'reported',
  },
  not_found: {
    label: 'Not found in checked sources',
    shortLabel: 'Not found',
    explanation:
      'We did not find this fact in the sources we checked. That does not mean no record exists elsewhere, and it does not mean a clean history.',
    tone: 'caution',
  },
  unavailable: {
    label: 'Unavailable',
    shortLabel: 'Unavailable',
    explanation:
      'The source or field is not available to this research system right now (restricted feed, missing file, or permitted-use limit).',
    tone: 'neutral',
  },
  not_yet_researched: {
    label: 'Not yet researched',
    shortLabel: 'Not yet researched',
    explanation:
      'InvestorTrustHub has not researched this item yet. Absence of a page or field is not a finding.',
    tone: 'neutral',
  },
  conflicting_sources: {
    label: 'Sources conflict',
    shortLabel: 'Conflict',
    explanation:
      'Identified sources report different values. We show the conflict rather than silently picking a winner.',
    tone: 'conflict',
  },
};

export const REGISTRATION_STATUS_COPY: Record<RegistrationStatusValue, StatusCopy> = {
  registered: {
    label: 'Reported as registered',
    shortLabel: 'Registered',
    explanation:
      'The cited source reports this registration as current. Re-check the official source before relying on it.',
    tone: 'official',
  },
  pending: {
    label: 'Reported as pending',
    shortLabel: 'Pending',
    explanation: 'The cited source reports a pending registration status.',
    tone: 'reported',
  },
  terminated: {
    label: 'Reported as terminated',
    shortLabel: 'Terminated',
    explanation: 'The cited source reports this registration as terminated.',
    tone: 'caution',
  },
  withdrawn: {
    label: 'Reported as withdrawn',
    shortLabel: 'Withdrawn',
    explanation: 'The cited source reports this registration as withdrawn.',
    tone: 'caution',
  },
  restricted: {
    label: 'Reported as restricted',
    shortLabel: 'Restricted',
    explanation: 'The cited source reports a restriction. Read the underlying record.',
    tone: 'conflict',
  },
  unknown: {
    label: 'Status unknown',
    shortLabel: 'Unknown',
    explanation: 'The source record does not give a status we can normalize.',
    tone: 'neutral',
  },
  not_yet_researched: {
    label: 'Not yet researched',
    shortLabel: 'Not yet researched',
    explanation: 'Registration status has not been researched in this system yet.',
    tone: 'neutral',
  },
};

export function isEvidenceStatus(value: string): value is EvidenceStatus {
  return (EVIDENCE_STATUSES as readonly string[]).includes(value);
}

export function isRegistrationStatus(value: string): value is RegistrationStatusValue {
  return (REGISTRATION_STATUSES as readonly string[]).includes(value);
}
