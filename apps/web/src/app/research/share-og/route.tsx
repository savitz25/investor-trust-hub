import { investorFallbackPng, investorResearchCard, shareOgHead } from '@/og/investor-share-og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return investorResearchCard();
  } catch {
    return investorFallbackPng();
  }
}

export function HEAD() {
  return shareOgHead();
}
