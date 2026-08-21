import {
  investorFallbackPng,
  renderInvestorCardOrFallback,
  resolveInvestorFirmCard,
  shareOgHead,
} from '@/og/investor-share-og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    return renderInvestorCardOrFallback(await resolveInvestorFirmCard(slug));
  } catch {
    return investorFallbackPng();
  }
}

export function HEAD() {
  return shareOgHead();
}
