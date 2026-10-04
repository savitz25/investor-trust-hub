import { ComingSoon } from '@ith/ui';
import { PageShell } from '@/components/page-shell';
import { SavedFirms } from '@/components/my-investor/saved-firms';
import {
  MY_TRUSTHUB_ACCOUNT_ENTRY_HREF,
  MY_TRUSTHUB_ACCOUNT_LABEL,
  ONE_ACCOUNT_COPY,
  investorMyTrustHubAccountEntryEnabled,
} from '@/lib/my-investor/account-presentation';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'My Investor',
  path: '/my-investor-trust-hub',
});

export default function MyHubPage() {
  const accountEntry = investorMyTrustHubAccountEntryEnabled();
  return (
    <PageShell
      eyebrow="Specialist workspace"
      title="My Investor"
      lead="Your investor research on this device. Saved firms stay in this browser. InvestorTrustHub does not request brokerage credentials."
    >
      <section aria-labelledby="saved-firms">
        <h2 id="saved-firms" className="font-serif text-2xl text-[var(--ith-navy)]">Saved firms</h2>
        <p className="mt-2 text-sm text-slate-700">
          Saved firms are research only. Saving does not create a Watch and does not contact a firm.
        </p>
        <div className="mt-4">
          <SavedFirms />
        </div>
      </section>

      {accountEntry ? (
        <section aria-labelledby="one-account" className="mt-10 rounded-2xl border border-[var(--ith-border)] bg-white p-5">
          <h2 id="one-account" className="font-serif text-xl text-[var(--ith-navy)]">One account: {MY_TRUSTHUB_ACCOUNT_LABEL}</h2>
          <p className="mt-2 text-sm leading-relaxed">{ONE_ACCOUNT_COPY}</p>
          <a href={MY_TRUSTHUB_ACCOUNT_ENTRY_HREF} className="th-btn-secondary mt-4">
            Open {MY_TRUSTHUB_ACCOUNT_LABEL}
          </a>
        </section>
      ) : null}

      <div className="mt-10">
        <ComingSoon title="Not available yet">
          <ul className="list-disc space-y-1 pl-5">
            <li>Saved professionals</li>
            <li>Saved portfolio snapshots</li>
            <li>Saved retirement assumptions and scenarios</li>
            <li>Uploaded documents with future upload-security controls</li>
            <li>Comparison lists and regulatory-change monitoring</li>
          </ul>
        </ComingSoon>
      </div>
    </PageShell>
  );
}
