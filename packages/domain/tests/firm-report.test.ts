import { describe, expect, it } from 'vitest';
import {
  classifyConsumerFirm,
  displayCountry,
  evaluateFirmIndexability,
  firmSlugForCrd,
  formatRaum,
  parseFirmCrdFromSlug,
  parseFirmSearchInput,
} from '../src';

const baseEligible = {
  isSynthetic: false,
  crd: '105958',
  legalName: 'THE VANGUARD GROUP, INC.',
  displayName: 'THE VANGUARD GROUP, INC.',
  classification: 'reported_as_registered' as const,
  hasCurrentObservation: true,
  hasSourceRelease: true,
  evidenceCount: 7,
  hasSnapshot: true,
  region: 'PA',
  city: 'Malvern',
  postalCode: '19355',
  secFileNumber: '801-11953',
  organizationForm: 'Corporation',
  raumAmount: '7426000000',
  website: 'https://example.invalid',
};

describe('firm slugs', () => {
  it('builds a CRD-stable slug', () => {
    expect(firmSlugForCrd('105958')).toBe('sec-crd-105958');
    expect(parseFirmCrdFromSlug('sec-crd-105958')).toBe('105958');
    expect(parseFirmCrdFromSlug('northbridge-ledger-advisors')).toBeNull();
    expect(parseFirmCrdFromSlug('sec-crd-not-a-crd')).toBeNull();
  });
});

describe('consumer classification', () => {
  it('keeps RIA registered copy from sounding like SEC approval', () => {
    const result = classifyConsumerFirm({
      registrationType: 'registered_investment_adviser',
      registrationStatus: 'registered',
      sourceStatusText: 'Approved',
    });
    expect(result?.class).toBe('reported_as_registered');
    expect(result?.headline).toBe('Reported as registered');
    expect(result?.supportingCopy.toLowerCase()).not.toContain('sec approved');
  });

  it('keeps 120-Day Approval distinct from registered', () => {
    const result = classifyConsumerFirm({
      registrationType: 'registered_investment_adviser',
      registrationStatus: 'pending',
      sourceStatusText: '120-Day Approval',
    });
    expect(result?.class).toBe('pending_120_day');
    expect(result?.headline).toBe('Pending / 120-Day Approval');
    expect(result?.registrationStatus).toBe('pending');
  });

  it('never classifies an ERA as a registered investment adviser', () => {
    const result = classifyConsumerFirm({
      registrationType: 'exempt_reporting_adviser',
      registrationStatus: 'reporting',
      sourceStatusText: 'ERA - Active',
    });
    expect(result?.class).toBe('exempt_reporting_adviser');
    expect(result?.headline).toBe('Exempt Reporting Adviser');
    expect(result?.registrationType).toBe('exempt_reporting_adviser');
  });
});

describe('RAUM formatting', () => {
  it('formats millions and billions without marketing labels', () => {
    const millions = formatRaum('742600000');
    expect(millions?.display).toContain('million');
    expect(millions?.exact).toContain('742,600,000.00');
    const billions = formatRaum('3200000000');
    expect(billions?.display).toContain('billion');
  });

  it('returns null for missing RAUM', () => {
    expect(formatRaum(null)).toBeNull();
    expect(formatRaum('')).toBeNull();
  });
});

describe('country display', () => {
  it('does not show ZZ to consumers', () => {
    expect(displayCountry('ZZ').label).toBe('Country not normalized from source record');
    expect(displayCountry('ZZ').usable).toBe(false);
    expect(displayCountry('US').label).toBe('United States');
  });
});

describe('indexability gate', () => {
  it('marks a complete official firm eligible', () => {
    const result = evaluateFirmIndexability(baseEligible);
    expect(result.decision).toBe('eligible');
    expect(result.trustReportEligible).toBe(true);
    expect(result.geoDiscoveryEligible).toBe(true);
  });

  it('rejects synthetic firms', () => {
    const result = evaluateFirmIndexability({ ...baseEligible, isSynthetic: true });
    expect(result.decision).toBe('not_eligible');
    expect(result.reasonCodes).toContain('synthetic');
  });

  it('rejects missing evidence or snapshot', () => {
    expect(evaluateFirmIndexability({ ...baseEligible, evidenceCount: 0 }).reasonCodes).toContain(
      'missing_evidence',
    );
    expect(evaluateFirmIndexability({ ...baseEligible, hasSnapshot: false }).reasonCodes).toContain(
      'missing_snapshot',
    );
  });

  it('allows a Trust Report without a US state but not geo discovery', () => {
    const result = evaluateFirmIndexability({
      ...baseEligible,
      region: null,
      city: 'London',
      postalCode: null,
    });
    expect(result.trustReportEligible).toBe(true);
    expect(result.geoDiscoveryEligible).toBe(false);
    expect(result.reasonCodes).toContain('missing_usable_us_state');
  });

  it('does not treat pending as ineligible', () => {
    const result = evaluateFirmIndexability({
      ...baseEligible,
      classification: 'pending_120_day',
    });
    expect(result.trustReportEligible).toBe(true);
  });
});

describe('search query parsing', () => {
  it('detects exact CRD and SEC file numbers', () => {
    expect(parseFirmSearchInput({ q: '105958' }).exactCrd).toBe('105958');
    expect(parseFirmSearchInput({ q: '801-11953' }).exactSecFile).toBe('801-11953');
    expect(parseFirmSearchInput({ q: 'vanguard' }).exactCrd).toBeNull();
  });

  it('treats SQL-like input as text', () => {
    const parsed = parseFirmSearchInput({ q: "'; drop table firms;--" });
    expect(parsed.q).toContain('drop table');
    expect(parsed.exactCrd).toBeNull();
  });

  it('accepts a state filter and a not-provided bucket', () => {
    expect(parseFirmSearchInput({ state: 'ny' }).state).toBe('NY');
    expect(parseFirmSearchInput({ state: '_none' }).stateNone).toBe(true);
    expect(parseFirmSearchInput({ state: 'ZZ' }).state).toBeNull();
  });
});
