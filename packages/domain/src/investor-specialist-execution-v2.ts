import { z } from 'zod';
import { COMPENSATION_METHOD_LABELS } from './adv-profile-intelligence';
import {
  type CompensationMethodKey,
  type InvestorFirmType,
  type InvestorResearchQuery,
  type ParsedInvestorAsk,
} from './investor-ask';

export const SPECIALIST_EXECUTION_CONTRACT = 'trusthub-specialist-execution-v2' as const;
export const SPECIALIST_EXECUTION_VERSION = '2.0.0' as const;
export const SPECIALIST_EXECUTION_MAX_LIMIT = 20;
export const SPECIALIST_EXECUTION_TIMEOUT_MS = 12_000;

export const SPECIALIST_EXECUTION_SCHEMA_DESCRIPTOR =
  'investor-v2|request:q?,queryType,entityClass,identifier,identityName,geography,filters,page,limit,requestedEvidence|response:contract,contractVersion,schemaFingerprint,contractFingerprint,queryInterpretation,appliedFilters,resultState,rows,total,pagination,availableRefinements,provenance,limitations,destinations,diagnostics' as const;
export const SPECIALIST_EXECUTION_CAPABILITY_DESCRIPTOR =
  'investor|firm:ria,era,ria_and_era|identifier:CRD|geography:PRINCIPAL_OFFICE:state,city,zip|filters:raum,item5e|publication:existing-indexable-destination-only|ranking:none|person:restricted' as const;

// SHA-256 of the immutable descriptors above. check:inv-cap-001 recomputes them.
export const SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT = 'a92b72c4a30de1021ecf25d26decb852b52394f741ac26919b89d14a234ab384';
export const SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT = '13c6d3a8e573b65490d50c88534bfcf604dfdeaed64fc0522ff7ef9c4b2b7efa';

export const specialistEntityClassSchema = z.enum(['ria', 'era', 'ria_and_era']);
export const specialistCompensationMethodSchema = z.enum(
  Object.keys(COMPENSATION_METHOD_LABELS) as [CompensationMethodKey, ...CompensationMethodKey[]],
);

const geographySchema = z
  .object({
    stateCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).optional(),
    stateName: z.string().trim().min(2).max(40).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    zip: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/).optional(),
    intent: z.literal('PRINCIPAL_OFFICE'),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.stateCode && !value.stateName && !value.city && !value.zip) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Geography requires state, city, or ZIP.' });
    }
  });

const filtersSchema = z
  .object({
    minimumRaum: z.number().finite().nonnegative().optional(),
    maximumRaum: z.number().finite().positive().optional(),
    compensationMethods: z.array(specialistCompensationMethodSchema).max(7).optional(),
    registrationType: z.array(z.enum(['registered', 'pending', 'reporting', 'current_roster'])).max(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.minimumRaum !== undefined && value.maximumRaum !== undefined && value.minimumRaum >= value.maximumRaum) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'minimumRaum must be less than maximumRaum.' });
    }
  });

export const specialistExecutionRequestSchema = z
  .object({
    contract: z.literal(SPECIALIST_EXECUTION_CONTRACT).optional(),
    q: z.string().trim().min(1).max(400).optional(),
    queryType: z.enum(['cohort', 'identifier', 'identity', 'evidence']).optional(),
    entityClass: specialistEntityClassSchema.optional(),
    requestedEntityClass: z.enum(['firm', 'individual_representative']).optional(),
    identifier: z.object({ type: z.literal('CRD'), value: z.string().trim().regex(/^\d{1,10}$/) }).strict().optional(),
    identityName: z.string().trim().min(2).max(120).optional(),
    geography: geographySchema.optional(),
    filters: filtersSchema.optional(),
    page: z.number().int().min(1).max(200).default(1),
    limit: z.number().int().min(1).max(SPECIALIST_EXECUTION_MAX_LIMIT).default(SPECIALIST_EXECUTION_MAX_LIMIT),
    requestedEvidence: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.q && !value.queryType) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide q or queryType.' });
    if (value.q && value.queryType) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide q or a structured query, not both.' });
    if (value.queryType === 'identifier' && !value.identifier) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['identifier'], message: 'Identifier query requires a labeled CRD.' });
    }
    if (value.queryType === 'identity' && !value.identityName) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['identityName'], message: 'Identity query requires identityName.' });
    }
    if (value.queryType === 'cohort' && value.identifier) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['identifier'], message: 'Cohort query cannot include an identifier.' });
    }
  });

export type SpecialistExecutionRequest = z.infer<typeof specialistExecutionRequestSchema>;
export type SpecialistResultState =
  | 'SUPPORTED_RESULTS' | 'ZERO_MATCHING_ROWS' | 'UNSUPPORTED_CAPABILITY' | 'PUBLICATION_RESTRICTED'
  | 'INVALID_QUERY' | 'BACKEND_UNAVAILABLE' | 'TIMEOUT' | 'NO_CONFIDENT_MATCH'
  | 'AMBIGUOUS_IDENTITIES' | 'EXACT_IDENTITY';

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};
const STATE_CODES = Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]));

export function resolvePrincipalOfficeGeography(geography: SpecialistExecutionRequest['geography']): InvestorResearchQuery['geography'] | undefined {
  if (!geography) return undefined;
  if (geography.zip) return { type: 'zip', value: geography.zip.slice(0, 5), meaning: `Principal-office ZIP ${geography.zip.slice(0, 5)} on the SEC/IARD roster. Not client geography or service territory.` };
  if (geography.city) return { type: 'principal_office_city', value: geography.city, meaning: `Principal-office city ${geography.city} on the SEC/IARD roster. Not client geography or service territory.` };
  const code = geography.stateCode ?? (geography.stateName ? STATE_CODES[geography.stateName.toLowerCase()] : undefined);
  if (!code || !STATE_NAMES[code]) return undefined;
  return { type: 'principal_office_state', value: code, meaning: `Principal office in ${STATE_NAMES[code]} (SEC/IARD main-office region). Not client geography or service territory.` };
}

function mapFirmType(entityClass: SpecialistExecutionRequest['entityClass']): InvestorFirmType {
  if (entityClass === 'ria_and_era' || !entityClass) return 'all';
  return entityClass;
}

export function structuredRequestToParsed(request: SpecialistExecutionRequest): ParsedInvestorAsk {
  const geography = resolvePrincipalOfficeGeography(request.geography);
  const query: InvestorResearchQuery = {
    mode: request.queryType === 'identifier' ? 'identifier' : 'entity', page: request.page,
    firmType: mapFirmType(request.entityClass), geography,
    identifier: request.identifier ? { type: 'crd', value: request.identifier.value } : undefined,
    nameQuery: request.identityName,
    raum: request.filters?.minimumRaum !== undefined || request.filters?.maximumRaum !== undefined
      ? { min: request.filters.minimumRaum, maxExclusive: request.filters.maximumRaum } : undefined,
    compensationMethods: request.filters?.compensationMethods, compensationMatch: 'all',
    status: request.filters?.registrationType?.[0], evidenceFamilies: request.requestedEvidence,
    sort: request.queryType === 'identifier' ? 'crd' : 'name',
  };
  const interpretation = [
    { label: 'Mode', value: request.queryType ?? 'cohort' },
    { label: 'Firm class', value: request.entityClass ?? 'RIA and ERA, kept distinct' },
    ...(geography ? [{ label: 'Geography', value: geography.meaning }] : []),
    ...(request.identifier ? [{ label: 'Identifier', value: `Labeled firm CRD ${request.identifier.value}` }] : []),
    ...(request.identityName ? [{ label: 'Firm name', value: request.identityName }] : []),
    ...(request.filters?.minimumRaum !== undefined || request.filters?.maximumRaum !== undefined
      ? [{ label: 'RAUM', value: 'Filer-reported Form ADV Item 5F(2)(c); not performance.' }] : []),
    ...(request.filters?.compensationMethods?.length
      ? [{ label: 'Compensation', value: 'Source-native Form ADV Item 5.E methods; not an exact consumer fee.' }] : []),
  ];
  return { raw: '[structured specialist request]', query, interpretation };
}

export const INVESTOR_SPECIALIST_CAPABILITY = {
  contract: SPECIALIST_EXECUTION_CONTRACT, contractVersion: SPECIALIST_EXECUTION_VERSION,
  schemaFingerprint: SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  contractFingerprint: SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  hub: 'InvestorTrustHub', entityClasses: ['ria', 'era', 'ria_and_era'], identifiers: ['CRD'],
  geography: { supported: ['state', 'city', 'zip'], meaning: 'PRINCIPAL_OFFICE' },
  publicationSemantics: 'Research rows may lack a public profile. Destinations are returned only for already-indexable profiles.',
  limitations: ['No individual representatives', 'No performance ranking', 'Principal office is not service territory'],
} as const;
