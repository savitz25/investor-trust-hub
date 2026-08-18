import { FIRM_KIND_LABELS, SYNTHETIC_BRANCHES, SYNTHETIC_FIRMS, firmSearchHaystack } from '@ith/domain';
import { DirectorySearch } from '@/components/directory-search';
import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Investment firms',
  description:
    'Research firm registration, locations, and regulatory evidence. This foundation directory currently shows labeled synthetic fixtures only.',
  path: '/firms',
});

export default function FirmsPage() {
  const items = SYNTHETIC_FIRMS.map((firm) => {
    const branch = SYNTHETIC_BRANCHES.find((row) => row.firmId === firm.id);
    return {
      slug: firm.slug,
      href: `/firm/${firm.slug}`,
      displayName: firm.displayName,
      subtitle: firm.kinds.map((kind) => FIRM_KIND_LABELS[kind]).join(' · '),
      identifiers: firm.identifiers,
      location: branch ? `${branch.city}, ${branch.region} ${branch.postalCode}` : undefined,
      haystack: `${firmSearchHaystack(firm)} ${branch?.city ?? ''} ${branch?.region ?? ''} ${branch?.postalCode ?? ''}`,
    };
  });

  return (
    <PageShell
      eyebrow="Firms"
      title="Research an investment firm"
      lead="Understand how we will present registration, locations, and source evidence. These four firms are fictional development fixtures, not a live adviser or broker-dealer directory."
    >
      <DirectorySearch items={items} placeholder="Filter by firm name, city, or SYN- identifier" />
    </PageShell>
  );
}
