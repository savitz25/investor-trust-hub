import { describe, expect, it } from 'vitest';
import {
  evidenceIdempotencyKey,
  evidenceRecordSchema,
  notFoundDoesNotMeanNoneExists,
  statusImpliesEndorsement,
} from '../src/evidence';
import { EVIDENCE_STATUSES, EVIDENCE_STATUS_COPY } from '../src/status';

describe('evidence and provenance models', () => {
  it('parses a complete evidence record', () => {
    const record = evidenceRecordSchema.parse({
      id: '00000000-0000-4000-aa00-000000000001',
      sourceAuthorityId: 'sec',
      sourceSystemId: 'iapd',
      sourceDatasetId: 'form_adv',
      sourceRecordIdentifier: '801-12345',
      retrievedAt: '2026-08-01T12:00:00.000Z',
      rawValue: { status: 'Approved' },
      normalizedValue: { status: 'registered' },
      transformVersion: 'adv-v1',
      evidenceStatus: 'verified_from_official_source',
      isCurrent: true,
      isSynthetic: false,
    });
    expect(record.sourceSystemId).toBe('iapd');
  });

  it('builds a stable idempotency key', () => {
    const a = evidenceIdempotencyKey({
      sourceSystemId: 'iapd',
      sourceDatasetId: 'form_adv',
      sourceRecordIdentifier: '801-1',
      fieldName: 'status',
      sourceReleaseId: 'rel-1',
    });
    const b = evidenceIdempotencyKey({
      sourceSystemId: 'iapd',
      sourceDatasetId: 'form_adv',
      sourceRecordIdentifier: '801-1',
      fieldName: 'status',
      sourceReleaseId: 'rel-1',
    });
    expect(a).toBe(b);
  });

  it('treats not_found as incomplete research, not a clean record', () => {
    expect(notFoundDoesNotMeanNoneExists('not_found')).toBe(true);
    expect(EVIDENCE_STATUS_COPY.not_found.explanation.toLowerCase()).toContain(
      'does not mean no record exists',
    );
    expect(EVIDENCE_STATUS_COPY.not_found.explanation.toLowerCase()).toContain(
      'does not mean a clean history',
    );
  });

  it('never treats an evidence status as endorsement', () => {
    for (const status of EVIDENCE_STATUSES) {
      expect(statusImpliesEndorsement(status)).toBe(false);
    }
  });
});
