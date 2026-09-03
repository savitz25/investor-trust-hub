import { CaliforniaStateIntelligence } from '@/components/ca-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a California principal office, DFPI state-adviser verification paths, and California securities filing context. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'California Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/california',
    host: await readRequestHost(),
  });
}

export default function CaliforniaPage() {
  return <CaliforniaStateIntelligence />;
}
