import type { InvestorShareCardModel } from '@/lib/share-card-model';
import { NETWORK_OG_SIZE, renderNetworkShareImage } from './network-share-card';

export const INVESTOR_OG_SIZE = NETWORK_OG_SIZE;
export const INVESTOR_OG_CONTENT_TYPE = 'image/png';
const CONFIG = { hub: 'INVESTOR TRUST HUB', descriptor: 'Independent Investment Research', domain: 'investortrusthub.com', accent: '#0F766E' };

export function renderInvestorShareImage(model: InvestorShareCardModel) {
  return renderNetworkShareImage(CONFIG, model);
}

export function renderInvestorFallbackImage() {
  return renderNetworkShareImage(CONFIG);
}
