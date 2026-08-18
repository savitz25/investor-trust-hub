import { notFound } from 'next/navigation';
import { SYNTHETIC_FIRMS, getFirmBySlug } from '@ith/domain';
import { FirmReport } from '@/components/firm-report';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return SYNTHETIC_FIRMS.map((firm) => ({ slug: firm.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const firm = getFirmBySlug(slug);
  if (!firm) {
    return pageMetadata({ title: 'Firm not found', path: `/firm/${slug}` });
  }
  return pageMetadata({
    title: `${firm.displayName} (synthetic)`,
    description: 'Synthetic development Trust Report — not a real firm.',
    path: `/firm/${slug}`,
  });
}

export default async function FirmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const firm = getFirmBySlug(slug);
  if (!firm) notFound();
  return <FirmReport firm={firm} />;
}
