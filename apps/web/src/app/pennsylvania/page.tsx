import { PennsylvaniaStateIntelligence } from '@/components/pa-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a Pennsylvania principal office, IAPD Pennsylvania state-registered investment-adviser firms, Pennsylvania state ERA reporting firms, and federal-covered notice filings. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Pennsylvania Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/pennsylvania',
    host: await readRequestHost(),
  });
}

export default function PennsylvaniaPage() {
  return <PennsylvaniaStateIntelligence />;
}
