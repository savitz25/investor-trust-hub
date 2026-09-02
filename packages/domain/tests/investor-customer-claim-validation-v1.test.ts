import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  INVESTOR_CLAIM_VALIDATION_CAPABILITY_DESCRIPTOR,
  INVESTOR_CLAIM_VALIDATION_CONTRACT,
  INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT,
  INVESTOR_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR,
  INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT,
  INVESTOR_CLAIM_VALIDATION_VERSION,
  investorClaimValidationRequestSchema,
} from '../src/investor-customer-claim-validation-v1';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const valid = {
  contract: INVESTOR_CLAIM_VALIDATION_CONTRACT,
  entityType: 'firm',
  nativeProfileId: '4e536ddd-b8cb-456b-a4e6-a79373dc9a4c',
  firmCrd: '312385',
  canonicalProfileUrl: 'https://www.investortrusthub.com/firm/sec-crd-312385',
} as const;

describe('INV-CUST-CAP-001 validation contract', () => {
  it('locks the versioned contract and deterministic fingerprints', () => {
    expect(INVESTOR_CLAIM_VALIDATION_CONTRACT).toBe('investor-customer-claim-validation-v1');
    expect(INVESTOR_CLAIM_VALIDATION_VERSION).toBe('1.0.0');
    expect(INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT).toBe(sha(INVESTOR_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR));
    expect(INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT).toBe(sha(INVESTOR_CLAIM_VALIDATION_CAPABILITY_DESCRIPTOR));
  });

  it('requires exact native UUID, firm CRD, and canonical destination inputs', () => {
    expect(investorClaimValidationRequestSchema.safeParse(valid).success).toBe(true);
    expect(investorClaimValidationRequestSchema.safeParse({ ...valid, nativeProfileId: 'sec-crd-312385' }).success).toBe(false);
    expect(investorClaimValidationRequestSchema.safeParse({ ...valid, firmCrd: 'firm name' }).success).toBe(false);
    expect(investorClaimValidationRequestSchema.safeParse({ ...valid, canonicalProfileUrl: '/firm/sec-crd-312385' }).success).toBe(false);
  });

  it('does not accept name, geography, RAUM, or status as substitute identity', () => {
    for (const extra of [
      { identityName: 'Ahara Advisors' },
      { geography: { stateCode: 'NJ' } },
      { raum: 1_000_000_000 },
      { firmClass: 'ria' },
    ]) expect(investorClaimValidationRequestSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
  });

  it('keeps representatives explicit so the executor can reject them as restricted', () => {
    expect(investorClaimValidationRequestSchema.parse({ ...valid, entityType: 'representative' }).entityType).toBe('representative');
  });
});
