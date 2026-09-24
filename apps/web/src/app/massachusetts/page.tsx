import { MassachusettsStateIntelligence } from '@/components/ma-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Massachusetts Securities Division research: IAPD Massachusetts state-registered adviser firms, ERA reporting, federal notice filings, principal-office overlay, and the public enforcement archive since 2012. A complaint is not a finding. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Massachusetts Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/massachusetts',
    host: await readRequestHost(),
  });
}

export default function MassachusettsPage() {
  return <MassachusettsStateIntelligence />;
}
