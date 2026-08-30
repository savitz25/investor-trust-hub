import { NextResponse } from 'next/server';
import { executeInvestorAsk, publicAskPayload } from '@/lib/ask/execute';
import { DatabaseUnavailableError } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 400);
  const page = Number(url.searchParams.get('page') ?? '1') || 1;
  if (!q) {
    return NextResponse.json(
      { contract: 'investor-ask-v1', error: 'Missing q' },
      { status: 400, headers: { 'X-Robots-Tag': 'noindex, follow' } },
    );
  }
  try {
    const result = await executeInvestorAsk(q, { page });
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
