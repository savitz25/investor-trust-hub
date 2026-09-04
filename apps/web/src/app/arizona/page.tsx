import { ArizonaStateIntelligence } from '@/components/az-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with an Arizona principal office, Arizona Corporation Commission Securities Division verification paths, and Arizona securities filing context. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Arizona Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/arizona',
    host: await readRequestHost(),
  });
}

export default function ArizonaPage() {
  return <ArizonaStateIntelligence />;
}
