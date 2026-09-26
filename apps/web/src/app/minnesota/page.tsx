import { MinnesotaStateIntelligence } from '@/components/mn-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Minnesota Department of Commerce Securities Unit research: IAPD Minnesota state investment-adviser firms, ERA reporting, federal notice filings, the principal-office overlay, and CARDS securities actions, each on its own source date. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Minnesota Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/minnesota',
    host: await readRequestHost(),
  });
}

export default function MinnesotaPage() {
  return <MinnesotaStateIntelligence />;
}
