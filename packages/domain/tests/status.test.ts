import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_STATUS_COPY,
  EVIDENCE_STATUSES,
  REGISTRATION_STATUS_COPY,
  isEvidenceStatus,
} from '../src/status';

describe('status terminology', () => {
  it('covers the required research states', () => {
    expect(EVIDENCE_STATUSES).toEqual([
      'verified_from_official_source',
      'reported_by_source',
      'not_found',
      'unavailable',
      'not_yet_researched',
      'conflicting_sources',
    ]);
  });

  it('does not use generic endorsement wording in labels', () => {
    for (const status of EVIDENCE_STATUSES) {
      const copy = EVIDENCE_STATUS_COPY[status];
      expect(copy.label.toLowerCase()).not.toContain('recommended');
      expect(copy.label.toLowerCase()).not.toContain('approved');
      expect(copy.label.toLowerCase()).not.toMatch(/\bsafe\b/);
      expect(copy.label.toLowerCase()).not.toContain('best');
    }
    expect(REGISTRATION_STATUS_COPY.registered.label).toBe('Reported as registered');
    expect(REGISTRATION_STATUS_COPY.reporting.label).toContain('exempt reporting adviser');
    expect(REGISTRATION_STATUS_COPY.registered.explanation.toLowerCase()).toContain(
      'not sec approval',
    );
  });

  it('narrows unknown strings safely', () => {
    expect(isEvidenceStatus('not_found')).toBe(true);
    expect(isEvidenceStatus('verified')).toBe(false);
  });
});
