import { TexasStateIntelligence } from '@/components/tx-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import '../new-jersey/new-jersey-intel.css';

const DESCRIPTION =
  'SEC/IARD firms with a Texas principal office, Texas State Securities Board verification paths, and Texas securities filing context. Principal office is not state registration. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Texas Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/texas',
    host: await readRequestHost(),
  });
}

export default function TexasPage() {
  return <TexasStateIntelligence />;
}
