import { OhioStateIntelligence } from '@/components/oh-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Ohio Division of Securities investment-adviser licensing, IAPD Ohio state-registered firms, ERA reporting, federal-covered notice filings, and principal-office overlay. NOH is not a final order. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Ohio Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/ohio',
    host: await readRequestHost(),
  });
}

export default function OhioPage() {
  return <OhioStateIntelligence />;
}
