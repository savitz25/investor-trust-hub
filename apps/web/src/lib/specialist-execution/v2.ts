import 'server-only';

import {
  COMPENSATION_METHOD_LABELS,
  INVESTOR_SPECIALIST_CAPABILITY,
  SPECIALIST_EXECUTION_CONTRACT,
  SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
  SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
  SPECIALIST_EXECUTION_TIMEOUT_MS,
  SPECIALIST_EXECUTION_VERSION,
  V1_SOURCE,
  interpretInvestorAskQuery,
  resolvePrincipalOfficeGeography,
  specialistExecutionRequestSchema,
  structuredRequestToParsed,
  type SpecialistExecutionRequest,
  type SpecialistResultState,
} from '@ith/domain';
import {
  executeParsedInvestorAsk,
  type InvestorAskResult,
} from '@/lib/ask/execute';

const PUBLIC_ORIGIN = 'https://www.investortrusthub.com';
const SOURCE_VERIFY_ORIGIN = 'https://adviserinfo.sec.gov/firm/summary';

export class SpecialistTimeoutError extends Error {
  constructor() {
    super('Specialist execution exceeded the bounded execution window.');
    this.name = 'SpecialistTimeoutError';
  }
}

export type SpecialistExecutionEnvelope = {
  contract: typeof SPECIALIST_EXECUTION_CONTRACT;
  contractVersion: typeof SPECIALIST_EXECUTION_VERSION;
  schemaFingerprint: typeof SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT;
  contractFingerprint: typeof SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT;
  queryInterpretation: Array<{ label: string; value: string }>;
  appliedFilters: Record<string, unknown>;
  resultState: SpecialistResultState;
  errorCode?: string;
  message?: string;
  rows: Array<Record<string, unknown>>;
  total: number;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  availableRefinements: Array<Record<string, unknown>>;
  provenance: Record<string, unknown>;
  limitations: string[];
  destinations: Array<Record<string, unknown>>;
  diagnostics: Record<string, unknown>;
};

const BASE_LIMITATIONS = [
  'RIA and ERA remain separate source-native firm classes.',
  'Principal office is not client geography or service territory.',
  'RAUM is filer-reported Form ADV Item 5F(2)(c), not performance, returns, safety, or quality.',
  'Form ADV Item 5.E compensation methods are not the exact fee a consumer will pay.',
  'SEC registration is not approval or endorsement.',
  'Individual investment-adviser representatives are not published by this contract.',
  'A public Trust Report is a publication gate, not a recommendation.',
  'No TrustHub score, paid ordering, ratings ordering, or recommendation ranking is used.',
];

function baseEnvelope(state: SpecialistResultState): SpecialistExecutionEnvelope {
  return {
    contract: SPECIALIST_EXECUTION_CONTRACT,
    contractVersion: SPECIALIST_EXECUTION_VERSION,
    schemaFingerprint: SPECIALIST_EXECUTION_SCHEMA_FINGERPRINT,
    contractFingerprint: SPECIALIST_EXECUTION_CONTRACT_FINGERPRINT,
    queryInterpretation: [],
    appliedFilters: {},
    resultState: state,
    rows: [],
    total: 0,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
    availableRefinements: [],
    provenance: {
      sourceFamily: 'SEC / IARD Form ADV',
      dataset: V1_SOURCE.dataset,
      officialAsOf: V1_SOURCE.publishedAt,
      retrievedAt: V1_SOURCE.retrievedAt,
      publicationSemantics: INVESTOR_SPECIALIST_CAPABILITY.publicationSemantics,
    },
    limitations: BASE_LIMITATIONS,
    destinations: [],
    diagnostics: { engineContract: 'investor-ask-v1' },
  };
}

export function specialistErrorEnvelope(
  state: Extract<SpecialistResultState, 'INVALID_QUERY' | 'UNSUPPORTED_CAPABILITY' | 'PUBLICATION_RESTRICTED' | 'BACKEND_UNAVAILABLE' | 'TIMEOUT'>,
  errorCode: string,
  message: string,
  interpretation: Array<{ label: string; value: string }> = [],
): SpecialistExecutionEnvelope {
  return { ...baseEnvelope(state), errorCode, message, queryInterpretation: interpretation };
}

function appliedFilters(request: SpecialistExecutionRequest, result: InvestorAskResult): Record<string, unknown> {
  const q = result.parsed.query;
  return {
    entityClass: q.firmType === 'all' ? 'ria_and_era' : q.firmType ?? null,
    identifier: q.identifier ? { type: 'CRD', value: q.identifier.value } : null,
    identityName: q.nameQuery ?? null,
    geography: q.geography
      ? { grain: q.geography.type, value: q.geography.value, intent: 'PRINCIPAL_OFFICE', meaning: q.geography.meaning }
      : null,
    raum: q.raum ?? null,
    compensationMethods: q.compensationMethods ?? [],
    registrationType: q.status ?? null,
    page: result.pagination.page,
    limit: request.limit,
  };
}

function resultState(result: InvestorAskResult): SpecialistResultState {
  const q = result.parsed.query;
  if (q.mode === 'fail_closed') return 'UNSUPPORTED_CAPABILITY';
  if (q.mode === 'identifier') return result.pagination.total === 1 ? 'EXACT_IDENTITY' : 'NO_CONFIDENT_MATCH';
  if (q.nameQuery) {
    if (result.pagination.total === 0) return 'NO_CONFIDENT_MATCH';
    return result.pagination.total === 1 ? 'EXACT_IDENTITY' : 'AMBIGUOUS_IDENTITIES';
  }
  if (result.results.length === 0) return 'ZERO_MATCHING_ROWS';
  return 'SUPPORTED_RESULTS';
}

function refinements(result: InvestorAskResult): Array<Record<string, unknown>> {
  const q = result.parsed.query;
  return [
    { id: 'firmClass', label: 'Firm class', values: ['ria', 'era', 'ria_and_era'] },
    { id: 'principalOfficeState', label: 'Principal-office state', meaning: 'Not client geography or service territory.' },
    ...(q.firmType !== 'era'
      ? [
          { id: 'raum', label: 'Filer-reported RAUM range', meaning: 'Form ADV Item 5F(2)(c); not performance.' },
          {
            id: 'compensationMethods',
            label: 'Reported compensation methods',
            values: Object.entries(COMPENSATION_METHOD_LABELS).map(([id, label]) => ({ id, label })),
            meaning: 'Form ADV Item 5.E methods; not an exact consumer fee.',
          },
        ]
      : []),
    { id: 'identifier', label: 'Exact firm CRD', values: ['CRD'] },
  ];
}

function normalizeResult(request: SpecialistExecutionRequest, result: InvestorAskResult): SpecialistExecutionEnvelope {
  const rows = result.results.map((row) => {
    const destinations = [
      ...(row.href ? [{ type: 'PUBLIC_PROFILE', url: `${PUBLIC_ORIGIN}${row.href}` }] : []),
      { type: 'SEC_IARD_SOURCE_VERIFICATION', url: `${SOURCE_VERIFY_ORIGIN}/${encodeURIComponent(row.crd)}` },
    ];
    return {
      firmName: row.displayName,
      legalName: row.legalName,
      crd: row.crd,
      firmClass: row.firmType,
      registrationStatus: row.statusLabel,
      principalOffice: row.principalOffice,
      raum: row.raum ? { amount: row.raum.amount, display: row.raum.display, sourceField: 'Form ADV Item 5F(2)(c)' } : null,
      compensationMethods: row.compensation,
      filingDate: row.filingDate,
      sourceAsOf: row.officialAsOf,
      publicationState: row.currentlyIndexable ? 'PUBLIC_PROFILE_AVAILABLE' : 'RESEARCH_ROW_ONLY',
      canonicalProfileUrl: row.href ? `${PUBLIC_ORIGIN}${row.href}` : null,
      whyMatched: row.whyMatched,
      destinations,
    };
  });
  const state = resultState(result);
  const page = result.pagination.page;
  const limit = result.pagination.pageSize;
  const total = result.pagination.total;
  return {
    ...baseEnvelope(state),
    queryInterpretation: result.parsed.interpretation,
    appliedFilters: appliedFilters(request, result),
    resultState: state,
    errorCode: state === 'UNSUPPORTED_CAPABILITY' ? 'unsupported_investor_research_capability' : undefined,
    message:
      state === 'UNSUPPORTED_CAPABILITY'
        ? result.parsed.query.failReason
        : state === 'ZERO_MATCHING_ROWS'
          ? total > 0
            ? 'The requested page is outside the matching result range. Use the returned total and pagination metadata.'
            : 'No current RIA/ERA roster firms match the selected principal-office and source-native filing filters.'
          : state === 'NO_CONFIDENT_MATCH'
            ? 'No exact current firm identity matched the supplied source identifier or name evidence.'
            : state === 'AMBIGUOUS_IDENTITIES'
              ? 'Multiple current firm identities match this name. Refine the name or use a labeled CRD.'
              : undefined,
    rows,
    total,
    pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0, hasMore: result.pagination.hasMore },
    availableRefinements: refinements(result),
    provenance: {
      ...result.provenance,
      queryGrain: 'Current SEC/IARD firm roster; organization CRD identity',
      publicationSemantics: INVESTOR_SPECIALIST_CAPABILITY.publicationSemantics,
    },
    limitations: [...new Set([...result.limitations, ...BASE_LIMITATIONS])],
    destinations: [
      { type: 'COHORT_RESEARCH', url: `${PUBLIC_ORIGIN}/ask`, public: true },
      { type: 'SEC_IARD_SOURCE_VERIFICATION', url: V1_SOURCE.iapdHome, public: true },
    ],
    diagnostics: {
      engineContract: result.contract,
      elapsedMs: result.elapsedMs,
      rowsReturned: rows.length,
      publicProfileDestinations: rows.filter((row) => row.canonicalProfileUrl !== null).length,
      ordering: result.parsed.query.sort ?? 'name_then_crd',
      generatedAt: new Date().toISOString(),
    },
  };
}

function unsupportedRequest(request: SpecialistExecutionRequest): SpecialistExecutionEnvelope | null {
  const personLanguage = request.q && /\b(individual|person|representative|iar)\b/i.test(request.q);
  if (request.requestedEntityClass === 'individual_representative' || personLanguage) {
    return specialistErrorEnvelope(
      'PUBLICATION_RESTRICTED',
      'individual_representative_not_public',
      'InvestorTrustHub does not publish individual investment-adviser representative rows through this contract. Research a firm by CRD or firm cohort instead.',
      [{ label: 'Entity class', value: 'Individual representative — publication restricted' }],
    );
  }
  if (request.entityClass === 'era' && (request.filters?.minimumRaum !== undefined || request.filters?.maximumRaum !== undefined || request.filters?.compensationMethods?.length)) {
    return specialistErrorEnvelope(
      'UNSUPPORTED_CAPABILITY',
      'era_filter_not_source_supported',
      'ERA filers do not report the RIA RAUM and Item 5.E fields used by these filters.',
    );
  }
  if (request.geography && !resolvePrincipalOfficeGeography(request.geography)) {
    return specialistErrorEnvelope('INVALID_QUERY', 'invalid_principal_office_geography', 'The supplied state is not a recognized U.S. principal-office geography.');
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new SpecialistTimeoutError()), SPECIALIST_EXECUTION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeSpecialistV2(input: unknown): Promise<SpecialistExecutionEnvelope> {
  const parsedRequest = specialistExecutionRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return specialistErrorEnvelope(
      'INVALID_QUERY',
      'invalid_specialist_request',
      parsedRequest.error.issues.map((issue) => issue.message).join(' '),
    );
  }
  const request = parsedRequest.data;
  const unsupported = unsupportedRequest(request);
  if (unsupported) return unsupported;
  const result = request.q
    ? await withTimeout(executeParsedInvestorAsk(interpretInvestorAskQuery(request.q, { page: request.page }), request.limit))
    : await withTimeout(executeParsedInvestorAsk(structuredRequestToParsed(request), request.limit));
  return normalizeResult(request, result);
}
