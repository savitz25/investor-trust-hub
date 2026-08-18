import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy"
      lead="Task 001 does not collect accounts or financial documents. Future personal data will be treated as sensitive."
    >
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed">
        <p>
          We will not request brokerage or bank credentials. Uploaded statements, if introduced,
          will be stored with least-privilege access and will not be logged in application
          output.
        </p>
        <p>
          Server credentials stay on the server. Public environment variables never include
          service-role keys or database URLs.
        </p>
      </div>
    </PageShell>
  );
}
