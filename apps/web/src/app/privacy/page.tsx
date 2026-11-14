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
          We use PostHog for product analytics when a project key is present. Events can include
          pages viewed, clicks on links, buttons, and forms, device and browser info, and an
          anonymous id stored in local storage and a cookie. Email addresses, search text, sign-in
          fields, and sensitive URL parameters are removed before an event is sent. The event asks
          PostHog not to add a location from the network address. PostHog can still receive that
          address with the request, and whether it is stored is a PostHog project setting that this
          site does not change. This site does not set how long events are kept. Retention follows
          the PostHog project settings. Do Not Track, Global Privacy Control, or blocking cookies
          turns analytics off in this browser. A cookie banner is not shown.
        </p>
      </div>
    </PageShell>
  );
}
