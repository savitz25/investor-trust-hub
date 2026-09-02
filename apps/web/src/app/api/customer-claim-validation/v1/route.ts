import { NextResponse } from 'next/server';
import { DatabaseUnavailableError } from '@/lib/db';
import { claimValidationError, validateInvestorFirmClaim } from '@/lib/customer-claim-validation/v1';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

function statusFor(state: string): number {
  if (state === 'INVALID_QUERY') return 400;
  if (state === 'PUBLICATION_RESTRICTED') return 422;
  if (state === 'BACKEND_UNAVAILABLE') return 503;
  return 200;
}

export async function POST(request: Request) {
  try {
    const payload = await validateInvestorFirmClaim(await request.json());
    return NextResponse.json(payload, { status: statusFor(payload.resultState), headers: HEADERS });
  } catch (error) {
    if (error instanceof SyntaxError) {
      const payload = claimValidationError('INVALID_QUERY', 'invalid_json', 'Request body must be valid JSON.');
      return NextResponse.json(payload, { status: 400, headers: HEADERS });
    }
    if (error instanceof DatabaseUnavailableError) {
      const payload = claimValidationError('BACKEND_UNAVAILABLE', 'research_backend_unavailable', 'Investor firm validation is temporarily unavailable.');
      return NextResponse.json(payload, { status: 503, headers: HEADERS });
    }
    throw error;
  }
}
