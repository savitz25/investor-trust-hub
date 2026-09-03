import { renderInvestorFallbackImage } from '@/og/investor-share-card';

export const runtime = 'edge';
export const alt = 'Investor Trust Hub — Independent Investment Research';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() { return renderInvestorFallbackImage(); }
