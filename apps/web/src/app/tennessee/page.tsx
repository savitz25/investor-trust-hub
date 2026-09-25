import { TennesseeStateIntelligence } from '@/components/tn-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'Tennessee Securities Division research: IAPD Tennessee state-registered adviser firms, ERA reporting, federal notice filings, principal-office overlay, and the Consent Order and Cease and Desist Order archives. Not a ranking.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Tennessee Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/tennessee',
    host: await readRequestHost(),
  });
}

export default function TennesseePage() {
  return <TennesseeStateIntelligence />;
}
