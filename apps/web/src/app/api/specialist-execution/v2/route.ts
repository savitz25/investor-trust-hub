import { NextResponse } from 'next/server';
import { DatabaseUnavailableError } from '@/lib/db';
import {
  executeSpecialistV2,
  specialistErrorEnvelope,
  SpecialistTimeoutError,
} from '@/lib/specialist-execution/v2';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  'X-Robots-Tag': 'noindex, follow',
};

function statusFor(state: string): number {
  if (state === 'INVALID_QUERY') return 400;
  if (state === 'UNSUPPORTED_CAPABILITY' || state === 'PUBLICATION_RESTRICTED') return 422;
  if (state === 'BACKEND_UNAVAILABLE') return 503;
  if (state === 'TIMEOUT') return 504;
  return 200;
}

async function respond(input: unknown) {
  try {
    const payload = await executeSpecialistV2(input);
    return NextResponse.json(payload, { status: statusFor(payload.resultState), headers: HEADERS });
  } catch (error) {
    if (error instanceof SpecialistTimeoutError) {
      const payload = specialistErrorEnvelope('TIMEOUT', 'specialist_execution_timeout', 'Investor research timed out before a source-safe result was available.');
      return NextResponse.json(payload, { status: 504, headers: HEADERS });
    }
    if (error instanceof DatabaseUnavailableError) {
      const payload = specialistErrorEnvelope('BACKEND_UNAVAILABLE', 'research_backend_unavailable', 'The InvestorTrustHub research database is temporarily unavailable.');
      return NextResponse.json(payload, { status: 503, headers: HEADERS });
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (q) {
    return respond({ q, page: Number(url.searchParams.get('page') ?? '1'), limit: Number(url.searchParams.get('limit') ?? '20') });
  }
  const methods = url.searchParams.get('compensationMethods')?.split(',').map((value) => value.trim()).filter(Boolean);
  return respond({
    contract: url.searchParams.get('contract') || undefined,
    queryType: url.searchParams.get('queryType') || undefined,
    entityClass: url.searchParams.get('entityClass') || undefined,
    requestedEntityClass: url.searchParams.get('requestedEntityClass') || undefined,
    identifier: url.searchParams.get('crd') ? { type: 'CRD', value: url.searchParams.get('crd') } : undefined,
    identityName: url.searchParams.get('identityName') || undefined,
    geography:
      url.searchParams.has('stateCode') || url.searchParams.has('stateName') || url.searchParams.has('city') || url.searchParams.has('zip')
        ? {
            stateCode: url.searchParams.get('stateCode') || undefined,
            stateName: url.searchParams.get('stateName') || undefined,
            city: url.searchParams.get('city') || undefined,
            zip: url.searchParams.get('zip') || undefined,
            intent: 'PRINCIPAL_OFFICE',
          }
        : undefined,
    filters:
      url.searchParams.has('minimumRaum') || url.searchParams.has('maximumRaum') || methods?.length
        ? {
            minimumRaum: url.searchParams.has('minimumRaum') ? Number(url.searchParams.get('minimumRaum')) : undefined,
            maximumRaum: url.searchParams.has('maximumRaum') ? Number(url.searchParams.get('maximumRaum')) : undefined,
            compensationMethods: methods,
          }
        : undefined,
    page: Number(url.searchParams.get('page') ?? '1'),
    limit: Number(url.searchParams.get('limit') ?? '20'),
  });
}

export async function POST(request: Request) {
  try {
    return respond(await request.json());
  } catch {
    const payload = specialistErrorEnvelope('INVALID_QUERY', 'invalid_json', 'Request body must be valid JSON.');
    return NextResponse.json(payload, { status: 400, headers: HEADERS });
  }
}
