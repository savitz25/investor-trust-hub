import { NorthCarolinaStateIntelligence } from '@/components/nc-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'North Carolina Secretary of State Securities Division IA/IAR/BD/AG registers, IAPD North Carolina state-registered investment-adviser firms, ERA reporting, federal-covered notice filings, and principal-office overlay. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'North Carolina Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/north-carolina',
    host: await readRequestHost(),
  });
}

export default function NorthCarolinaPage() {
  return <NorthCarolinaStateIntelligence />;
}
