import { WashingtonStateIntelligence } from '@/components/wa-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a Washington principal office, Washington DFI verification paths, and Washington securities filing context. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Washington Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/washington',
    host: await readRequestHost(),
  });
}

export default function WashingtonPage() {
  return <WashingtonStateIntelligence />;
}
