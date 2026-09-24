import { GeorgiaStateIntelligence } from '@/components/ga-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Georgia Securities Division research: IARD and IAPD identity, BrokerCheck, the public securities-order index, and what was not acquired. Not a ranking or a combined adviser census.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Georgia Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/georgia',
    host: await readRequestHost(),
  });
}

export default function GeorgiaPage() {
  return <GeorgiaStateIntelligence />;
}
