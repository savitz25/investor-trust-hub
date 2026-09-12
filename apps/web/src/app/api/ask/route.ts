import { NextResponse } from 'next/server';
import { executeInvestorAsk, publicAskPayload } from '@/lib/ask/execute';
import { DatabaseUnavailableError } from '@/lib/db';
import { readInvestorRequest, InvalidInvestorRequest } from '@/lib/ask/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  let input;
  try { input = readInvestorRequest(url.searchParams); } catch(error) {
    if(error instanceof InvalidInvestorRequest)return NextResponse.json({contract:'investor-ask-v1',terminalState:'INVALID_INPUT',error:error.message},{status:400,headers:{'X-Robots-Tag':'noindex, follow'}});
    throw error;
  }
  const q = input.raw;
  if (!q) {
    return NextResponse.json(
      { contract: 'investor-ask-v1', error: 'Missing q' },
      { status: 400, headers: { 'X-Robots-Tag': 'noindex, follow' } },
    );
  }
  try {
    const result = await executeInvestorAsk(q, input.overrides);
    return NextResponse.json(publicAskPayload(result), {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-Robots-Tag': 'noindex, follow',
      },
    });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { contract: 'investor-ask-v1', error: 'Research database temporarily unavailable' },
        { status: 503, headers: { 'X-Robots-Tag': 'noindex, follow' } },
      );
    }
    throw error;
  }
}
