import { NewYorkStateIntelligence } from '@/components/ny-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a New York principal office, IAPD New York state-registered investment-adviser firms, New York state ERA reporting firms, and federal-covered notice filings. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'New York Investment Adviser Intelligence',
    description: DESCRIPTION,
    path: '/new-york',
    host: await readRequestHost(),
  });
}

export default function NewYorkPage() {
  return <NewYorkStateIntelligence />;
}
