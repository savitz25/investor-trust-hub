import { PERSON_KIND_LABELS, SYNTHETIC_PEOPLE, firmSearchHaystack, personSearchHaystack } from '@ith/domain';
import { DirectorySearch } from '@/components/directory-search';
import { PageShell } from '@/components/page-shell';
import { associationsForPerson, firmById } from '@ith/domain';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Investment professionals',
    description:
      'Research registration, firm relationships, and official disclosures. This foundation directory currently shows labeled synthetic fixtures only.',
    path: '/professionals',
    indexable: false,
    host: await readRequestHost(),
  });
}

export default function ProfessionalsPage() {
  const items = SYNTHETIC_PEOPLE.map((person) => {
    const current = associationsForPerson(person.id).find((row) => row.isCurrent);
    const firm = current ? firmById(current.firmId) : undefined;
    return {
      slug: person.slug,
      href: `/professional/${person.slug}`,
      displayName: person.displayName,
      subtitle: person.kinds.map((kind) => PERSON_KIND_LABELS[kind]).join(' · '),
      identifiers: person.identifiers,
      location: firm ? `${firm.displayName}` : undefined,
      haystack: `${personSearchHaystack(person)} ${firm ? firmSearchHaystack(firm) : ''}`,
    };
  });

  return (
    <PageShell
      eyebrow="People"
      title="Research an investment professional"
      lead="This directory is a foundation. It currently lists synthetic development fixtures so the Trust Report interface can be reviewed. It is not a live CRD or IAPD search."
    >
      <DirectorySearch items={items} placeholder="Filter by name or SYN- identifier" />
    </PageShell>
  );
}
