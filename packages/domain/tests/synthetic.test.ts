import { describe, expect, it } from 'vitest';
import {
  SYNTHETIC_ASSOCIATIONS,
  SYNTHETIC_BRANCHES,
  SYNTHETIC_DISCLOSURES,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_FIRMS,
  SYNTHETIC_PEOPLE,
  SYNTHETIC_REGISTRATIONS,
} from '../src/fixtures';
import {
  SYNTHETIC_DISCLAIMER,
  assertSyntheticDisclaimer,
  requiresSyntheticLabel,
  syntheticLabelOrThrow,
} from '../src/synthetic';
import { isSyntheticIdentifierValue } from '../src/identifiers';
import { firmSchema } from '../src/firms';
import { personSchema } from '../src/people';
import { registrationSchema } from '../src/registrations';

describe('synthetic development safeguards', () => {
  it('requires the exact disclaimer wording', () => {
    expect(() => assertSyntheticDisclaimer(SYNTHETIC_DISCLAIMER)).not.toThrow();
    expect(() => assertSyntheticDisclaimer('fake test data')).toThrow(/exact disclaimer/);
  });

  it('labels every fixture person and firm as synthetic', () => {
    expect(SYNTHETIC_PEOPLE).toHaveLength(5);
    expect(SYNTHETIC_FIRMS).toHaveLength(4);
    for (const person of SYNTHETIC_PEOPLE) {
      const parsed = personSchema.parse(person);
      expect(parsed.isSynthetic).toBe(true);
      expect(requiresSyntheticLabel(parsed)).toBe(true);
      expect(parsed.identifiers.every((id) => isSyntheticIdentifierValue(id.value))).toBe(true);
    }
    for (const firm of SYNTHETIC_FIRMS) {
      const parsed = firmSchema.parse(firm);
      expect(parsed.isSynthetic).toBe(true);
      expect(parsed.identifiers.every((id) => isSyntheticIdentifierValue(id.value))).toBe(true);
    }
  });

  it('marks registrations, associations, branches, disclosures, and evidence synthetic', () => {
    expect(SYNTHETIC_REGISTRATIONS.every((r) => registrationSchema.parse(r).isSynthetic)).toBe(
      true,
    );
    expect(SYNTHETIC_ASSOCIATIONS.every((r) => r.isSynthetic)).toBe(true);
    expect(SYNTHETIC_BRANCHES.every((r) => r.isSynthetic)).toBe(true);
    expect(SYNTHETIC_DISCLOSURES.every((r) => r.isSynthetic)).toBe(true);
    expect(SYNTHETIC_EVIDENCE.every((r) => r.isSynthetic)).toBe(true);
    expect(SYNTHETIC_DISCLOSURES.every((r) => r.summarySourceText.includes('SYNTHETIC'))).toBe(
      true,
    );
  });

  it('refuses to attach the synthetic label to a real record', () => {
    expect(() => syntheticLabelOrThrow({ isSynthetic: false })).toThrow(/non-synthetic/);
    expect(syntheticLabelOrThrow({ isSynthetic: true })).toBe(SYNTHETIC_DISCLAIMER);
  });
});
