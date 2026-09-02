import { NewJerseyStateIntelligence } from '@/components/nj-state-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import '../home-intel.css';
import './new-jersey-intel.css';

const DESCRIPTION =
  'Official New Jersey Bureau of Securities documents, annual investment-adviser examination themes, issuer and exemption filing frameworks, and SEC/IARD overlay. Partial historical coverage. InvestorTrustHub organizes evidence and does not rank advisers.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'New Jersey Investment Adviser & Securities Intelligence',
    description: DESCRIPTION,
    path: '/new-jersey',
    host: await readRequestHost(),
  });
}

export default function NewJerseyPage() {
  return <NewJerseyStateIntelligence />;
}
