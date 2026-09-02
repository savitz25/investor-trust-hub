import { describe, expect, it } from 'vitest';
import {
  NJ_PUBLIC_SNAPSHOT,
  mayAttachNjEvidenceToProfile,
  njPrincipalOfficeCountFromNationalRoster,
} from '../src/nj-public-intel';

describe('NJ public snapshot', () => {
  it('keeps published counts aligned with the generator contract', () => {
    expect(NJ_PUBLIC_SNAPSHOT.enforcement.acquiredDocuments).toBe(48);
    expect(NJ_PUBLIC_SNAPSHOT.exam.questionCount2026).toBe(68);
    expect(NJ_PUBLIC_SNAPSHOT.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(njPrincipalOfficeCountFromNationalRoster()).toBe(NJ_PUBLIC_SNAPSHOT.nationalOverlay.njPrincipalOfficeSecIardFirms);
  });

  it('withholds unsafe profile attribution', () => {
    expect(mayAttachNjEvidenceToProfile('UNSAFE_REJECTED')).toBe(false);
    expect(mayAttachNjEvidenceToProfile('EXACT_CRD_FIRM')).toBe(true);
    expect(NJ_PUBLIC_SNAPSHOT.profileAttachments).toHaveLength(0);
  });
});
