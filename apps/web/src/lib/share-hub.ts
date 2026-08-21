/**
 * SHARE-002 — InvestorTrustHub social-share identity (repo-local).
 * Production canonical + default card must never drift to localhost,
 * a Vercel preview host, or another TrustHub domain.
 */

export const SHARE_HUB = {
  id: 'investor',
  brand: 'InvestorTrustHub',
  host: 'www.investortrusthub.com',
  apexHost: 'investortrusthub.com',
  origin: 'https://www.investortrusthub.com',
  ogImagePath: '/opengraph-image.png',
  ogWidth: 1200,
  ogHeight: 630,
  ogAlt: 'InvestorTrustHub — independent investor research from the Ask Trust Hub Network',
  twitterCard: 'summary_large_image',
  networkLabel: 'ASK TRUST HUB NETWORK',
} as const;

export const FOREIGN_TRUSTHUB_HOSTS = [
  'www.asktrusthub.com',
  'asktrusthub.com',
  'www.movetrusthub.com',
  'movetrusthub.com',
  'www.insurancetrusthub.com',
  'insurancetrusthub.com',
  'www.lendertrusthub.com',
  'lendertrusthub.com',
  'www.contractortrusthub.com',
  'contractortrusthub.com',
  'www.seniortrusthub.com',
  'seniortrusthub.com',
] as const;

export function isForbiddenShareHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  return (FOREIGN_TRUSTHUB_HOSTS as readonly string[]).includes(host);
}

export function resolveShareOrigin(): string {
  return SHARE_HUB.origin;
}

export function shareOgImageAbsoluteUrl(origin: string = SHARE_HUB.origin): string {
  return `${origin.replace(/\/$/, '')}${SHARE_HUB.ogImagePath}`;
}
