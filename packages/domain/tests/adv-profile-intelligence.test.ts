import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ADV_FORBIDDEN_PUBLIC_PHRASES,
  ADV_PUBLIC_COPY,
  MODULE_READINESS,
  TRUST_REPORT_SNAPSHOT_VERSION,
  buildTrustReportV2Snapshot,
  findForbiddenAdvPublicCopy,
  item11Copy,
  mayPublishAdvRelationship,
  ownershipBandLabel,
} from '../src/adv-profile-intelligence';

const here = dirname(fileURLToPath(import.meta.url));

function emptyHidden() {
  return { owners: 0, related: 0, funds: 0, serviceProviders: 0 };
}

function snapshot(overrides: Partial<Parameters<typeof buildTrustReportV2Snapshot>[0]> = {}) {
  return buildTrustReportV2Snapshot({
    crd: '18217',
    slug: 'sec-crd-18217',
    wave1: true,
    disclosureIndicator: 'N',
    attributes: [],
    owners: [],
    related: [],
    funds: [],
    providers: [],
    offices: [],
    relying: [],
    filings: [],
    filingsTotal: 0,
    filingsRia: 0,
    filingsEra: 0,
    withdrawals: [],
    crs: [],
    part2aCount: 0,
    hiddenReviewRequired: emptyHidden(),
    ...overrides,
  });
}

describe('mayPublishAdvRelationship', () => {
  it('allows current HIGH_CONFIDENCE owners and hides REVIEW_REQUIRED', () => {
    expect(
      mayPublishAdvRelationship({ confidence: 'HIGH_CONFIDENCE', isCurrent: true, family: 'owner' }),
    ).toBe(true);
    expect(
      mayPublishAdvRelationship({ confidence: 'REVIEW_REQUIRED', isCurrent: true, family: 'owner' }),
    ).toBe(false);
    expect(
      mayPublishAdvRelationship({ confidence: 'UNRESOLVED', isCurrent: true, family: 'owner' }),
    ).toBe(false);
  });

  it('does not publish historical owners as current', () => {
    expect(
      mayPublishAdvRelationship({ confidence: 'HIGH_CONFIDENCE', isCurrent: false, family: 'owner' }),
    ).toBe(false);
    expect(
      mayPublishAdvRelationship({
        confidence: 'CONFIRMED',
        isCurrent: false,
        family: 'advw',
        allowHistorical: true,
      }),
    ).toBe(true);
  });

  it('requires CONFIRMED for related organizations and funds', () => {
    expect(
      mayPublishAdvRelationship({
        confidence: 'HIGH_CONFIDENCE',
        isCurrent: true,
        family: 'related_organization',
      }),
    ).toBe(false);
    expect(
      mayPublishAdvRelationship({ confidence: 'CONFIRMED', isCurrent: true, family: 'related_organization' }),
    ).toBe(true);
    expect(
      mayPublishAdvRelationship({ confidence: 'HIGH_CONFIDENCE', isCurrent: true, family: 'private_fund' }),
    ).toBe(false);
    expect(
      mayPublishAdvRelationship({ confidence: 'CONFIRMED', isCurrent: true, family: 'private_fund' }),
    ).toBe(true);
  });
});

describe('ownership and control snapshot', () => {
  it('shows current direct owners and hides historical plus review-required', () => {
    const result = snapshot({
      owners: [
        {
          schedule: 'A',
          ownerKind: 'PERSON',
          fullLegalName: 'JANE CURRENT',
          ownerId: '1',
          titleOrStatus: null,
          ownershipCode: 'C',
          controlPerson: 'N',
          identityConfidence: 'HIGH_CONFIDENCE',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
          filingId: '100',
          datasetKind: 'ria',
        },
        {
          schedule: 'A',
          ownerKind: 'PERSON',
          fullLegalName: 'HISTORICAL OWNER',
          ownerId: '2',
          titleOrStatus: null,
          ownershipCode: 'F',
          controlPerson: 'N',
          identityConfidence: 'HIGH_CONFIDENCE',
          isCurrent: false,
          dateSubmitted: '2019-01-01',
          filingId: '99',
          datasetKind: 'ria',
        },
        {
          schedule: 'A',
          ownerKind: 'PERSON',
          fullLegalName: 'NAME ONLY',
          ownerId: null,
          titleOrStatus: null,
          ownershipCode: 'A',
          controlPerson: 'N',
          identityConfidence: 'REVIEW_REQUIRED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
          filingId: '100',
          datasetKind: 'ria',
        },
        {
          schedule: 'B',
          ownerKind: 'ORGANIZATION',
          fullLegalName: 'INDIRECT LLC',
          ownerId: '9',
          titleOrStatus: null,
          ownershipCode: 'D',
          controlPerson: 'N',
          identityConfidence: 'HIGH_CONFIDENCE',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
          filingId: '100',
          datasetKind: 'ria',
        },
        {
          schedule: 'A',
          ownerKind: 'PERSON',
          fullLegalName: 'CHIEF COMPLIANCE',
          ownerId: '8',
          titleOrStatus: 'Chief Compliance Officer',
          ownershipCode: null,
          controlPerson: 'Y',
          identityConfidence: 'HIGH_CONFIDENCE',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
          filingId: '100',
          datasetKind: 'ria',
        },
      ],
      hiddenReviewRequired: { owners: 1, related: 0, funds: 0, serviceProviders: 0 },
    });
    expect(result.current.directOwners.map((row) => row.displayName)).toEqual(['JANE CURRENT']);
    expect(result.current.directOwners[0]?.relationshipLabel).toBe(ADV_PUBLIC_COPY.reportedDirectOwner);
    expect(result.current.directOwners[0]?.ownershipBand).toBe(ownershipBandLabel('C'));
    expect(result.current.indirectOwners.map((row) => row.displayName)).toEqual(['INDIRECT LLC']);
    expect(result.current.indirectOwners[0]?.relationshipLabel).toBe(ADV_PUBLIC_COPY.reportedIndirectOwner);
    expect(result.current.executives.map((row) => row.displayName)).toEqual(['CHIEF COMPLIANCE']);
    expect(result.current.executives[0]?.relationshipLabel).toBe(ADV_PUBLIC_COPY.reportedExecutive);
    expect(result.current.directOwners.some((row) => row.displayName === 'HISTORICAL OWNER')).toBe(false);
    expect(result.current.directOwners.some((row) => row.displayName === 'NAME ONLY')).toBe(false);
    expect(JSON.stringify(result)).not.toContain('/person/');
    expect(JSON.stringify(result)).not.toContain('/owner/');
  });
});

describe('private funds and providers', () => {
  it('shows current named 805- funds and hides historical, name-only, and aggregate-only rows', () => {
    const result = snapshot({
      funds: [
        {
          fundName: 'ALPHA FUND LP',
          fundId: '805-1',
          state: 'DE',
          country: 'US',
          productId: 'p1',
          identityConfidence: 'CONFIRMED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
        },
        {
          fundName: 'OLD FUND',
          fundId: '805-2',
          state: 'DE',
          country: 'US',
          productId: 'p2',
          identityConfidence: 'CONFIRMED',
          isCurrent: false,
          dateSubmitted: '2018-01-01',
        },
        {
          fundName: 'NAME ONLY FUND',
          fundId: '',
          state: null,
          country: null,
          productId: null,
          identityConfidence: 'REVIEW_REQUIRED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
        },
      ],
      attributes: [
        {
          fieldName: 'private_fund_count_7b1',
          reportedYn: null,
          numericValue: '12',
          textValue: null,
          presenceStatus: 'REPORTED_YES',
          asOfDate: '2026-08-03',
        },
      ],
    });
    expect(result.current.privateFunds.map((row) => row.fundId)).toEqual(['805-1']);
    expect(result.current.privateFunds.some((row) => row.fundName === 'OLD FUND')).toBe(false);
    expect(result.current.privateFunds.some((row) => row.fundName === 'NAME ONLY FUND')).toBe(false);
    expect(result.privateFundAggregates.count7b1).toBe('12');
    expect(JSON.stringify(result.current.privateFunds)).not.toContain('/fund/');
  });

  it('hides name-only providers and labels confirmed prime brokers', () => {
    const result = snapshot({
      providers: [
        {
          role: 'prime_broker',
          providerName: 'PRIME CO',
          providerCrd: '123',
          identityConfidence: 'CONFIRMED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
        },
        {
          role: 'auditor',
          providerName: 'NAME ONLY LLP',
          providerCrd: null,
          identityConfidence: 'REVIEW_REQUIRED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
        },
      ],
    });
    expect(result.current.serviceProviders).toHaveLength(1);
    expect(result.current.serviceProviders[0]?.roleLabel).toBe('Prime broker reported for a private fund');
    expect(result.current.serviceProviders.some((row) => row.providerName === 'NAME ONLY LLP')).toBe(false);
  });
});

describe('item 11, custody, compensation, ADV-W, related orgs', () => {
  it('does not call Item 11 Y misconduct or Item 11 N a clean record', () => {
    expect(item11Copy('Y').copy).toBe(ADV_PUBLIC_COPY.item11Yes);
    expect(item11Copy('N').copy).toBe(ADV_PUBLIC_COPY.item11No);
    expect(item11Copy('Y').copy.toLowerCase()).not.toContain('misconduct');
    expect(item11Copy('N').copy.toLowerCase()).not.toContain('clean');
    expect(item11Copy('N').copy.toLowerCase()).not.toContain('no disciplinary history');
  });

  it('keeps custody, compensation, related-person, and ADV-W copy source-faithful', () => {
    const result = snapshot({
      disclosureIndicator: 'Y',
      attributes: [
        {
          fieldName: 'custody_cash',
          reportedYn: 'Y',
          numericValue: null,
          textValue: null,
          presenceStatus: 'REPORTED_YES',
          asOfDate: '2026-08-03',
        },
        {
          fieldName: '5E(1)',
          reportedYn: 'Y',
          numericValue: null,
          textValue: null,
          presenceStatus: 'REPORTED_YES',
          asOfDate: '2026-08-03',
        },
        {
          fieldName: '5A',
          reportedYn: null,
          numericValue: '120',
          textValue: null,
          presenceStatus: 'REPORTED_YES',
          asOfDate: '2026-08-03',
        },
        {
          fieldName: 'affiliation_broker_dealer',
          reportedYn: 'Y',
          numericValue: null,
          textValue: null,
          presenceStatus: 'REPORTED_YES',
          asOfDate: '2026-08-03',
        },
      ],
      related: [
        {
          legalName: 'AFFILIATE LLC',
          relatedCrd: '9',
          relatedFirmSlug: 'sec-crd-9',
          identityConfidence: 'CONFIRMED',
          isCurrent: true,
          dateSubmitted: '2026-07-31',
          filingId: '1',
          datasetKind: 'ria',
        },
      ],
      withdrawals: [{ filingId: 'W1', filingType: 'PARTIAL', filingDate: '2015-03-01' }],
      filings: [
        {
          filingId: '1',
          datasetKind: 'ria',
          dateSubmitted: '2026-07-31',
          filingTypes: ['Annual'],
          formVersion: '10/2021',
          isCurrent: true,
        },
      ],
      filingsTotal: 40,
      filingsRia: 40,
      filingsEra: 0,
    });
    expect(result.custody.cash).toBe('Yes as reported');
    expect(JSON.stringify(result.custody).toLowerCase()).not.toContain('risk');
    expect(result.scale.employeeCount).toBe('120');
    expect(result.compensation.methods).toEqual(['Percentage of assets under management']);
    expect(JSON.stringify(result.compensation).toLowerCase()).not.toContain('fee-only');
    expect(result.affiliationTypes).toEqual(['Broker-dealer']);
    expect(JSON.stringify(result.affiliationTypes).toLowerCase()).not.toContain('conflict');
    expect(result.current.relatedOrganizations[0]?.relationshipLabel).toBe(
      ADV_PUBLIC_COPY.relatedOrganization,
    );
    expect(result.historical.withdrawals[0]?.filingType).toBe('PARTIAL');
    expect(ADV_PUBLIC_COPY.advwNote.toLowerCase()).toContain('withdrawal filing');
    expect(ADV_PUBLIC_COPY.advwNote.toLowerCase()).not.toContain('misconduct');
    expect(result.version).toBe(TRUST_REPORT_SNAPSHOT_VERSION);
    expect(JSON.stringify(result)).not.toContain('/historical');
  });

  it('keeps a current firm current when an older ADV-W exists', () => {
    const result = snapshot({
      withdrawals: [{ filingId: 'W1', filingType: 'FULL', filingDate: '2012-01-01' }],
      filings: [
        {
          filingId: '2',
          datasetKind: 'ria',
          dateSubmitted: '2026-07-31',
          filingTypes: ['Annual'],
          formVersion: null,
          isCurrent: true,
        },
      ],
      filingsTotal: 5,
      filingsRia: 5,
      filingsEra: 0,
    });
    expect(result.historical.withdrawals).toHaveLength(1);
    expect(result.historical.recentFilings[0]?.isCurrent).toBe(true);
  });
});

describe('copy contract and routes', () => {
  it('keeps 002C public copy free of forbidden phrases', () => {
    const corpus = [
      ...Object.values(ADV_PUBLIC_COPY),
      ...Object.values(MODULE_READINESS),
      JSON.stringify(snapshot({ disclosureIndicator: 'Y' })),
    ].join('\n');
    expect(findForbiddenAdvPublicCopy(corpus)).toEqual([]);
    expect(findForbiddenAdvPublicCopy('This is not a misconduct finding')).toEqual([]);
    expect(findForbiddenAdvPublicCopy('This was misconduct')).toContain('misconduct');
    expect(ADV_FORBIDDEN_PUBLIC_PHRASES.length).toBeGreaterThan(8);
  });

  it('does not add people, fund, or historical-firm app routes', () => {
    const appDir = join(here, '../../../apps/web/src/app');
    expect(readFileSync(join(appDir, 'robots.ts'), 'utf8')).toContain("'/professional/'");
    expect(readFileSync(join(appDir, 'robots.ts'), 'utf8')).toContain("'/fund/'");
    expect(readFileSync(join(appDir, 'sitemap.ts'), 'utf8')).toContain('/firm/${slug}');
    expect(readFileSync(join(appDir, 'sitemap.ts'), 'utf8')).not.toContain('/fund/');
    expect(readFileSync(join(appDir, 'sitemap.ts'), 'utf8')).not.toContain('/person/');
  });
});
