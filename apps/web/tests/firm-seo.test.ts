import { describe, expect, it } from 'vitest';
import { isSiteIndexingEnabled, shouldNoIndex } from '@ith/config';
import { evaluateFirmIndexability, firmSlugForCrd, parseFirmCrdFromSlug } from '@ith/domain';
import { pageMayBeIndexed, pageMetadata } from '../src/lib/seo';

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

  it('requires site launch, approved host, and firm content gates', () => {
    expect(isSiteIndexingEnabled({ SITE_INDEXING_ENABLED: undefined })).toBe(false);
    const previousEnabled = process.env.SITE_INDEXING_ENABLED;
    const previousHosts = process.env.INDEXABLE_HOSTS;
    delete process.env.SITE_INDEXING_ENABLED;
    delete process.env.INDEXABLE_HOSTS;
    expect(pageMayBeIndexed('/firm/sec-crd-105958', true, 'www.example.test')).toBe(false);
    process.env.SITE_INDEXING_ENABLED = 'true';
    expect(pageMayBeIndexed('/firm/sec-crd-105958', true, 'www.example.test')).toBe(false);
    process.env.INDEXABLE_HOSTS = 'www.example.test';
    expect(pageMayBeIndexed('/firm/sec-crd-105958', true)).toBe(true);
    expect(pageMayBeIndexed('/firm/sec-crd-105958', true, 'www.example.test')).toBe(true);
    expect(pageMayBeIndexed('/firm/sec-crd-105958', false, 'www.example.test')).toBe(false);
    expect(pageMayBeIndexed('/firm/sec-crd-105958', true, 'investor-trust-hub-web.vercel.app')).toBe(false);
    process.env.SITE_INDEXING_ENABLED = previousEnabled;
    process.env.INDEXABLE_HOSTS = previousHosts;
  });

  it('emits one absolute document title including the firm name and site name', () => {
    const metadata = pageMetadata({
      title: 'Example Advisers — SEC/IARD Firm Research',
      path: '/firm/sec-crd-1',
      indexable: false,
    });
    expect(metadata.title).toEqual({
      absolute: 'Example Advisers — SEC/IARD Firm Research · InvestorTrustHub',
    });
    expect(JSON.stringify(metadata).toLowerCase()).not.toContain('trusted advisor');
    expect(JSON.stringify(metadata).toLowerCase()).not.toContain('recommended firm');
  });
});
