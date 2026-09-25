import { NevadaStateIntelligence } from '@/components/nv-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Nevada Securities Division research: IAPD Nevada state investment-adviser firms, ERA reporting, federal notice filings and the principal-office overlay, each on its own source date. Securities Division orders were not acquired. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Nevada Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/nevada',
    host: await readRequestHost(),
  });
}

export default function NevadaPage() {
  return <NevadaStateIntelligence />;
}
