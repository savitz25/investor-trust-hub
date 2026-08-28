import { buildInvestorHomeIntelV1 } from '@ith/domain';
import { InvestorHomeIntelligence } from '@/components/home-intel';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';
import { resolveShareOrigin } from '@/lib/share-hub';
import './home-intel.css';

const HOME_DESCRIPTION =
  'Independent SEC/IARD and Form ADV research for investment adviser firms. Understand RIA and ERA registration, reported regulatory assets, and compensation methods. We organize the evidence. You decide.';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Investment adviser intelligence',
    description: HOME_DESCRIPTION,
    path: '/',
    host: await readRequestHost(),
  });
}

export default async function HomePage() {
  const intel = await buildInvestorHomeIntelV1();
  const origin = resolveShareOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${origin}/#webpage`,
        url: `${origin}/`,
        name: 'Investment adviser intelligence · InvestorTrustHub',
        description: HOME_DESCRIPTION,
        isPartOf: { '@id': `${origin}/#website` },
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: 'InvestorTrustHub',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/firms?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <InvestorHomeIntelligence intel={intel} />
    </>
  );
}
