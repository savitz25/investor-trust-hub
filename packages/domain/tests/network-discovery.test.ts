import { describe, expect, it } from 'vitest';
import {
  buildCanonicalFirmProfileUrl,
  buildInvestorNetworkId,
  evaluateDiscoveryEligibility,
  investmentProductQueryMatchesFirm,
  mapEntityType,
  mapFirmToDiscovery,
  matchesEntityType,
  matchesPhysicalCity,
  matchesPhysicalState,
  rejectDuplicateCrds,
  selectPilotCohort,
  UNSUPPORTED_INVESTMENT_PRODUCT_QUERIES,
  validateCanonicalFirmUrl,
} from '../src/network-discovery';
import { contentFingerprint } from '../src/network-discovery-fingerprint';

describe('ASK-SEARCH-INVESTOR-001 network discovery', () => {
  it('builds CRD network ids', () => {
    expect(buildInvestorNetworkId('105958')).toBe('investor:crd-105958');
    expect(buildInvestorNetworkId(' 0105958 ')).toBe('investor:crd-0105958');
  });

  it('rejects duplicate CRDs', () => {
    const a = mapFirmToDiscovery({
      crd: '100',
      legalName: 'A',
      displayName: 'A',
      consumerClass: 'reported_as_registered',
      region: 'FL',
      city: 'Miami',
    });
    const b = mapFirmToDiscovery({
      crd: '100',
      legalName: 'B',
      displayName: 'B',
      consumerClass: 'reported_as_registered',
      region: 'NY',
      city: 'NYC',
    });
    expect(rejectDuplicateCrds([a, b]).ok).toBe(false);
  });

  it('preserves RIA ≠ ERA', () => {
    expect(mapEntityType('reported_as_registered')).toBe('ria');
    expect(mapEntityType('pending_120_day')).toBe('ria');
    expect(mapEntityType('exempt_reporting_adviser')).toBe('era');
    const era = mapFirmToDiscovery({
      crd: '106676',
      legalName: 'ERA Firm',
      displayName: 'ERA Firm',
      consumerClass: 'exempt_reporting_adviser',
      region: 'NY',
      city: 'New York',
    });
    expect(era.entity_type).toBe('era');
    expect(era.categories).toContain('era');
    expect(era.categories).not.toContain('ria');
    expect(matchesEntityType(era, 'ria')).toBe(false);
    expect(matchesEntityType(era, 'era')).toBe(true);
  });

  it('separates physical city from state-only', () => {
    const boca = mapFirmToDiscovery({
      crd: '1',
      legalName: 'Boca Firm',
      displayName: 'Boca Firm',
      consumerClass: 'reported_as_registered',
      region: 'FL',
      city: 'Boca Raton',
      postalCode: '33432',
    });
    const orlando = mapFirmToDiscovery({
      crd: '2',
      legalName: 'Orlando Firm',
      displayName: 'Orlando Firm',
      consumerClass: 'reported_as_registered',
      region: 'FL',
      city: 'Orlando',
    });
    expect(matchesPhysicalCity(boca, 'boca raton', 'FL')).toBe(true);
    expect(matchesPhysicalCity(orlando, 'boca raton', 'FL')).toBe(false);
    expect(matchesPhysicalState(orlando, 'FL')).toBe(true);
  });

  it('validates canonical Investor HTTPS profile URLs', () => {
    expect(validateCanonicalFirmUrl(buildCanonicalFirmProfileUrl('105958')).ok).toBe(true);
    expect(validateCanonicalFirmUrl('http://www.investortrusthub.com/firm/sec-crd-1').ok).toBe(false);
    expect(validateCanonicalFirmUrl('https://www.movetrusthub.com/firm/sec-crd-1').ok).toBe(false);
    expect(
      validateCanonicalFirmUrl('https://www.investortrusthub.com/firm/sec-crd-1?x=1').ok
    ).toBe(false);
    expect(validateCanonicalFirmUrl('https://foo.vercel.app/firm/sec-crd-1').ok).toBe(false);
  });

  it('fail-closes investment product queries', () => {
    for (const q of UNSUPPORTED_INVESTMENT_PRODUCT_QUERIES) {
      expect(investmentProductQueryMatchesFirm(q)).toEqual([]);
    }
  });

  it('selects deterministic query-independent cohort', () => {
    const rows = [30, 10, 20].map((crd) =>
      mapFirmToDiscovery({
        crd: String(crd),
        legalName: `Firm ${crd}`,
        displayName: `Firm ${crd}`,
        consumerClass: 'reported_as_registered',
        region: 'TX',
        city: 'Austin',
      })
    );
    const pilot = selectPilotCohort(rows, 2);
    expect(pilot.map((e) => e.network_entity_id)).toEqual([
      'investor:crd-10',
      'investor:crd-20',
    ]);
  });

  it('fingerprints stably excluding updated_at', () => {
    const e = mapFirmToDiscovery(
      {
        crd: '99',
        legalName: 'X',
        displayName: 'X',
        consumerClass: 'reported_as_registered',
        region: 'NJ',
        city: 'Newark',
      },
      { updatedAt: '2026-01-01T00:00:00.000Z' }
    );
    const e2 = { ...e, updated_at: '2026-08-01T00:00:00.000Z' };
    expect(contentFingerprint([e])).toBe(contentFingerprint([e2]));
  });

  it('requires usable US state for discovery eligibility', () => {
    const missingState = evaluateDiscoveryEligibility({
      crd: '55',
      legalName: 'No State',
      displayName: 'No State',
      consumerClass: 'reported_as_registered',
      region: null,
      city: 'Somewhere',
      currentlyIndexable: true,
      trustReportEligible: true,
    });
    expect(missingState.ok).toBe(false);
    if (!missingState.ok) {
      expect(missingState.reasons).toContain('missing_usable_us_state');
    }
  });

  it('does not use RAUM/premium fields on entities', () => {
    const e = mapFirmToDiscovery({
      crd: '77',
      legalName: 'Y',
      displayName: 'Y',
      consumerClass: 'reported_as_registered',
      region: 'CA',
      city: 'Los Angeles',
    });
    expect(e).not.toHaveProperty('raum');
    expect(e).not.toHaveProperty('premium');
    expect(e).not.toHaveProperty('trust_score');
    expect(e).not.toHaveProperty('review_count');
  });
});
