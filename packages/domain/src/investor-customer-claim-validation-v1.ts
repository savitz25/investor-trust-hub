import { z } from 'zod';

export const INVESTOR_CLAIM_VALIDATION_CONTRACT = 'investor-customer-claim-validation-v1' as const;
export const INVESTOR_CLAIM_VALIDATION_VERSION = '1.0.0' as const;
export const INVESTOR_CLAIM_VALIDATION_SCHEMA_DESCRIPTOR =
  'investor-claim-validation-v1|request:entityType,nativeProfileId,firmCrd,canonicalProfileUrl|response:contract,contractVersion,schemaFingerprint,contractFingerprint,hub,entityType,resultState,nativeProfileId,firmCrd,displayName,publicationState,current,canonicalProfileUrl,regulatoryStatus,limitations' as const;
export const INVESTOR_CLAIM_VALIDATION_CAPABILITY_DESCRIPTOR =
  'investor|entity:firm-only|identity:firms.id+organization-crd+canonical-profile|publication:search_documents.indexable+current-profile-gate|representative:restricted|name-fuzzy:none|writes:none' as const;
export const INVESTOR_CLAIM_VALIDATION_SCHEMA_FINGERPRINT =
  '51d41f55eb6ff85f1ecf85e8feb0742647e6d50c730ad37859cd9918625018f3' as const;
export const INVESTOR_CLAIM_VALIDATION_CONTRACT_FINGERPRINT =
  '80cc14c9d9756972d87aaf3a51ac2336888a9dc77048d3d3c298343b25086032' as const;

export const investorClaimValidationRequestSchema = z
  .object({
    contract: z.literal(INVESTOR_CLAIM_VALIDATION_CONTRACT),
    entityType: z.enum(['firm', 'representative']),
    nativeProfileId: z.string().uuid(),
    firmCrd: z.string().trim().regex(/^\d{1,10}$/),
    canonicalProfileUrl: z.string().url(),
  })
  .strict();

export type InvestorClaimValidationRequest = z.infer<typeof investorClaimValidationRequestSchema>;
export type InvestorClaimValidationResultState =
  | 'EXACT_IDENTITY'
  | 'NO_CONFIDENT_MATCH'
  | 'PUBLICATION_RESTRICTED'
  | 'INVALID_QUERY'
  | 'BACKEND_UNAVAILABLE';
