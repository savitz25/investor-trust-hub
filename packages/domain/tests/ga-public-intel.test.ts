import { describe, expect, it } from 'vitest';
import {
  GA_PUBLIC_FINGERPRINT,
  GA_PUBLIC_ROUTE,
  GA_PUBLIC_SNAPSHOT,
  assertGeorgiaPublicIntel,
  gaPrincipalOfficeCountFromNationalRoster,
  mayAttachGaEvidenceToProfile,
} from '../src/ga-public-intel';

describe('GA-INV-001 public intel', () => {
  it('freezes Georgia without a second identity spine', () => {
    const snap = assertGeorgiaPublicIntel();
    expect(GA_PUBLIC_ROUTE).toBe('/georgia');
    expect(snap.fingerprint).toBe(GA_PUBLIC_FINGERPRINT);
    expect(gaPrincipalOfficeCountFromNationalRoster()).toBe(364);
    expect(snap.enforcement.exact_profile_attachments).toBe(0);
    expect(snap.complaints.count).toBeNull();
    expect(mayAttachGaEvidenceToProfile('NAME_ONLY')).toBe(false);
    expect(mayAttachGaEvidenceToProfile('EXACT_CRD')).toBe(true);
  });
});
