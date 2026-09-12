import { IllinoisStateIntelligence } from '@/components/il-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with an Illinois principal office, IAPD Illinois state-registered investment-adviser firms, Illinois state ERA reporting firms, and federal-covered notice filings. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Illinois Investment Adviser Intelligence',
    description: DESCRIPTION,
    path: '/illinois',
    host: await readRequestHost(),
  });
}

export default function IllinoisPage() {
  return <IllinoisStateIntelligence />;
}
