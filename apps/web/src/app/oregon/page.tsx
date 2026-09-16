import { OregonStateIntelligence } from '@/components/or-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with an Oregon principal office, IAPD Oregon state-registered investment-adviser firms, Oregon state ERA reporting firms, and federal-covered notice filings. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Oregon Investment Adviser Intelligence',
    description: DESCRIPTION,
    path: '/oregon',
    host: await readRequestHost(),
  });
}

export default function OregonPage() {
  return <OregonStateIntelligence />;
}
