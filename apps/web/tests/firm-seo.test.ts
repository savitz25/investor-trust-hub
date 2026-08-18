import { describe, expect, it } from 'vitest';
import { shouldNoIndex } from '@ith/config';
import { evaluateFirmIndexability, firmSlugForCrd, parseFirmCrdFromSlug } from '@ith/domain';

describe('firm SEO contracts', () => {
  it('keeps synthetic firm routes noindex by prefix', () => {
    expect(shouldNoIndex('/firm/northbridge-ledger-advisors')).toBe(true);
    expect(shouldNoIndex('/professional/jordan-p-elmwood')).toBe(true);
  });

  it('uses CRD-stable canonical slugs', () => {
    expect(firmSlugForCrd('105958')).toBe('sec-crd-105958');
    expect(parseFirmCrdFromSlug('sec-crd-105958')).toBe('105958');
  });

  it('does not treat indexability as a quality ranking', () => {
    const result = evaluateFirmIndexability({
      isSynthetic: false,
      crd: '1',
      legalName: 'Example',
      displayName: 'Example',
      classification: 'reported_as_registered',
      hasCurrentObservation: true,
      hasSourceRelease: true,
      evidenceCount: 1,
      hasSnapshot: true,
      region: 'NY',
      city: 'New York',
      postalCode: '10001',
      secFileNumber: '801-1',
      organizationForm: 'Corporation',
      raumAmount: '1',
      website: null,
    });
    expect(result.trustReportEligible).toBe(true);
    expect(JSON.stringify(result).toLowerCase()).not.toContain('trusted');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('recommended');
  });
});
