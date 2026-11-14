import { PageShell } from '@/components/page-shell';
import { pageMetadata } from '@/lib/seo';
import { readRequestHost } from '@/lib/request-host';

export async function generateMetadata() {
  return pageMetadata({
    title: 'Privacy',
    path: '/privacy',
    host: await readRequestHost(),
  });
}

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
        <h2 className="text-base font-semibold text-foreground">Analytics and cookies</h2>
        <p>
          We use PostHog for product analytics. It collects pages viewed, clicks, and device and
          browser info. No email addresses and no search text are sent. You can opt out with the
          browser Do Not Track setting, or by blocking cookies.
        </p>
      </div>
    </PageShell>
  );
}
