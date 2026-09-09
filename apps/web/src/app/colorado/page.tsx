import { ColoradoStateIntelligence } from '@/components/co-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a Colorado principal office, IAPD Colorado state-registered investment-adviser firms, federal-covered notice filings, and Colorado Division of Securities verification paths. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Colorado Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/colorado',
    host: await readRequestHost(),
  });
}

export default function ColoradoPage() {
  return <ColoradoStateIntelligence />;
}
