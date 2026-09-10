import { VirginiaStateIntelligence } from '@/components/va-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a Virginia principal office, IAPD Virginia state-registered investment-adviser firms, federal-covered notice filings, 2025 SCC SRF activity aggregates, and SCC regulatory-activity observations. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Virginia Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/virginia',
    host: await readRequestHost(),
  });
}

export default function VirginiaPage() {
  return <VirginiaStateIntelligence />;
}
