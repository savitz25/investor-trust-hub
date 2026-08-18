import { z } from 'zod';
import { EVIDENCE_STATUSES, type EvidenceStatus } from './status';
import { SUBJECT_KINDS } from './registrations';

export const evidenceRecordSchema = z.object({
  id: z.string().uuid(),
  ingestionRunId: z.string().uuid().optional(),
  sourceAuthorityId: z.string().min(1),
  sourceSystemId: z.string().min(1),
  sourceDatasetId: z.string().min(1),
  sourceReleaseId: z.string().uuid().optional(),
  sourceUrl: z.string().url().optional(),
  sourceDocumentName: z.string().max(300).optional(),
  sourceRecordIdentifier: z.string().min(1),
  sourceEffectiveDate: z.string().date().optional(),
  retrievedAt: z.string().datetime(),
  rawValue: z.unknown(),
  normalizedValue: z.unknown(),
  transformVersion: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  matchMethodology: z.string().max(200).optional(),
  subjectKind: z.enum(SUBJECT_KINDS).optional(),
  subjectId: z.string().uuid().optional(),
  fieldName: z.string().max(120).optional(),
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  isCurrent: z.boolean().default(true),
  isSynthetic: z.boolean().default(false),
});

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export function evidenceIdempotencyKey(input: {
  sourceSystemId: string;
  sourceDatasetId: string;
  sourceRecordIdentifier: string;
  fieldName?: string;
  sourceReleaseId?: string;
}): string {
  return [
    input.sourceSystemId,
    input.sourceDatasetId,
    input.sourceRecordIdentifier,
    input.fieldName ?? '_record',
    input.sourceReleaseId ?? '_unversioned',
  ].join('::');
}

/**
 * "Not found" is a research result about checked sources, never a claim
 * that nothing exists and never a claim of a clean record.
 */
export function notFoundDoesNotMeanNoneExists(status: EvidenceStatus): boolean {
  return status === 'not_found';
}

export function statusImpliesEndorsement(status: EvidenceStatus): boolean {
  void status;
  return false;
}
