import { safeWebsite } from "@/lib/customer-integration/core";
import type {
  BusinessProfile,
  Replies,
} from "@/lib/customer-integration/public";
export function InvestorCustomerLayer({
  slug,
  enabled,
  profile,
  replies,
}: {
  slug: string;
  enabled: boolean;
  profile: BusinessProfile | null;
  replies: Replies | null;
}) {
  const website = safeWebsite(profile?.fields.website);
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12">
      {profile ? (
        <section className="rounded-2xl border p-5">
          <p className="text-xs font-semibold uppercase">Managed profile</p>
          <h2 className="text-xl font-semibold">
            Business-supplied information
          </h2>
          <p>
            Control verified, not endorsement. Official InvestorTrustHub
            evidence remains unchanged.
          </p>
          {profile.fields.description ? (
            <p>{profile.fields.description}</p>
          ) : null}
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              Visit website
            </a>
          ) : null}
        </section>
      ) : null}
      {replies?.replies.length ? (
        <section className="rounded-2xl border p-5">
          <h2>Business response</h2>
          {replies.replies.map((r) => (
            <p key={r.id}>{r.body}</p>
          ))}
        </section>
      ) : null}
      <aside className="rounded-2xl border p-5">
        <h2>{profile ? "Managed by the business" : "Is this your firm?"}</h2>
        {enabled ? (
          <a
            href={
              profile
                ? "https://www.asktrusthub.com/manage"
                : `/api/claim/handoff/${encodeURIComponent(slug)}`
            }
          >
            {profile ? "Manage on AskTrustHub" : "Claim this profile"}
          </a>
        ) : null}
        <p>
          {enabled
            ? "Manage business-supplied information through AskTrustHub."
            : "Profile management is not currently available."}
        </p>
      </aside>
    </div>
  );
}
