import { notFound } from 'next/navigation';
import { SYNTHETIC_PEOPLE, getPersonBySlug } from '@ith/domain';
import { ProfessionalReport } from '@/components/professional-report';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return SYNTHETIC_PEOPLE.map((person) => ({ slug: person.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) {
    return pageMetadata({ title: 'Professional not found', path: `/professional/${slug}` });
  }
  return pageMetadata({
    title: `${person.displayName} (synthetic)`,
    description: 'Synthetic development Trust Report — not a real person.',
    path: `/professional/${slug}`,
  });
}

export default async function ProfessionalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();
  return <ProfessionalReport person={person} />;
}
