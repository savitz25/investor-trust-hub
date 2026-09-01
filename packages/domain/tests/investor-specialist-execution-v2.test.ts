import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SPECIALIST_EXECUTION_CAPABILITY_DESCRIPTOR,
  SPECIALIST_EXECUTION_CONTRACT,
  SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  SPECIALIST_EXECUTION_SCHEMA_DESCRIPTOR,
  SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  SPECIALIST_EXECUTION_VERSION,
  resolvePrincipalOfficeGeography,
  specialistExecutionRequestSchema,
  structuredRequestToParsed,
} from '../src/investor-specialist-execution-v2';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

describe('INV-CAP-001 contract', () => {
  it('locks the contract and deterministic fingerprints', () => {
    expect(SPECIALIST_EXECUTION_CONTRACT).toBe('trusthub-specialist-execution-v2');
    expect(SPECIALIST_EXECUTION_VERSION).toBe('2.0.0');
    expect(SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT).toBe(sha(SPECIALIST_EXECUTION_SCHEMA_DESCRIPTOR));
    expect(SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT).toBe(sha(SPECIALIST_EXECUTION_CAPABILITY_DESCRIPTOR));
  });

  it('keeps RIA, ERA, and explicit combined research distinct', () => {
    for (const entityClass of ['ria', 'era', 'ria_and_era'] as const) {
      const request = specialistExecutionRequestSchema.parse({ queryType: 'cohort', entityClass });
      const parsed = structuredRequestToParsed(request);
      expect(parsed.query.firmType).toBe(entityClass === 'ria_and_era' ? 'all' : entityClass);
    }
  });

  it('turns state geography into principal-office geography only', () => {
    const geography = resolvePrincipalOfficeGeography({ stateName: 'New Jersey', intent: 'PRINCIPAL_OFFICE' });
    expect(geography).toMatchObject({ type: 'principal_office_state', value: 'NJ' });
    expect(geography?.meaning).toContain('Not client geography or service territory');
  });

  it('supports every state through normalized two-letter codes', () => {
    for (const code of ['NJ', 'TX', 'FL', 'CA', 'NY']) {
      expect(resolvePrincipalOfficeGeography({ stateCode: code, intent: 'PRINCIPAL_OFFICE' })?.value).toBe(code);
    }
  });

  it('applies source-native RAUM bounds without performance semantics', () => {
    const request = specialistExecutionRequestSchema.parse({
      queryType: 'cohort', entityClass: 'ria',
      filters: { minimumRaum: 1_000_000_000, maximumRaum: 10_000_000_000 },
    });
    const parsed = structuredRequestToParsed(request);
    expect(parsed.query.raum).toEqual({ min: 1_000_000_000, maxExclusive: 10_000_000_000 });
    expect(parsed.interpretation.map((line) => line.value).join(' ')).toMatch(/not performance/i);
  });

  it('rejects reversed RAUM bounds', () => {
    expect(specialistExecutionRequestSchema.safeParse({
      queryType: 'cohort', filters: { minimumRaum: 10, maximumRaum: 1 },
    }).success).toBe(false);
  });

  it('uses only accepted Item 5.E compensation keys', () => {
    const request = specialistExecutionRequestSchema.parse({
      queryType: 'cohort', entityClass: 'ria', filters: { compensationMethods: ['percentage_of_assets', 'fixed_fees'] },
    });
    const parsed = structuredRequestToParsed(request);
    expect(parsed.query.compensationMethods).toEqual(['percentage_of_assets', 'fixed_fees']);
    expect(parsed.interpretation.map((line) => line.value).join(' ')).toMatch(/not an exact consumer fee/i);
    expect(specialistExecutionRequestSchema.safeParse({
      queryType: 'cohort', filters: { compensationMethods: ['marketing_claim'] },
    }).success).toBe(false);
  });

  it('requires labeled exact CRD and rejects malformed values', () => {
    const request = specialistExecutionRequestSchema.parse({ queryType: 'identifier', identifier: { type: 'CRD', value: '166089' } });
    expect(structuredRequestToParsed(request).query.identifier).toEqual({ type: 'crd', value: '166089' });
    expect(specialistExecutionRequestSchema.safeParse({ queryType: 'identifier', identifier: { type: 'CRD', value: 'ABC' } }).success).toBe(false);
    expect(specialistExecutionRequestSchema.safeParse({ queryType: 'identifier' }).success).toBe(false);
  });

  it('keeps name identity separate from cohorts', () => {
    const request = specialistExecutionRequestSchema.parse({ queryType: 'identity', identityName: 'Example Advisory' });
    const parsed = structuredRequestToParsed(request);
    expect(parsed.query.nameQuery).toBe('Example Advisory');
    expect(parsed.query.mode).toBe('entity');
    expect(specialistExecutionRequestSchema.safeParse({ queryType: 'identity' }).success).toBe(false);
  });

  it('bounds server pagination and rejects ambiguous input shapes', () => {
    expect(specialistExecutionRequestSchema.parse({ queryType: 'cohort', page: 200, limit: 20 }).limit).toBe(20);
    expect(specialistExecutionRequestSchema.safeParse({ queryType: 'cohort', limit: 21 }).success).toBe(false);
    expect(specialistExecutionRequestSchema.safeParse({ q: 'RIA firms in Florida', queryType: 'cohort' }).success).toBe(false);
  });
});
