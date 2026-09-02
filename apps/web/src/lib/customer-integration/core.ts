import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getClaimableInvestorFirm } from "../customer-claim-validation/v1";

export function claimEnabled(
  id: string,
  env: Record<string, string | undefined> = process.env,
) {
  if ((env.ATH_HANDOFF_SECRET || "").length < 32) return false;
  const m = (env.ATH_CLAIM_CTA_MODE || "off").toLowerCase();
  if (m === "all") return true;
  if (m !== "canary") return false;
  return new Set(
    (env.ATH_CLAIM_CANARY_PROFILE_IDS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  ).has(id.toLowerCase());
}
export async function claimProfile(slug: string) {
  return getClaimableInvestorFirm(slug);
}
export function mintInvestorHandoff(
  secret: string,
  p: NonNullable<Awaited<ReturnType<typeof getClaimableInvestorFirm>>>,
  now = new Date(),
) {
  if (secret.length < 32) throw new Error("ATH_HANDOFF_SECRET unavailable");
  const iat = Math.floor(now.getTime() / 1000),
    url = new URL(p.canonicalProfileUrl!);
  const payload = {
    v: 2 as const,
    aud: "asktrusthub" as const,
    hub_id: "investor" as const,
    native_profile_id: p.nativeProfileId!,
    slug: url.pathname.split("/").filter(Boolean).at(-1)!,
    external_key: p.firmCrd!,
    source_system: "sec_iard" as const,
    home_state: null,
    identifier_namespace: "CRD" as const,
    entity_class: "firm" as const,
    canonical_profile_url: p.canonicalProfileUrl!,
    display_name: p.displayName!,
    iat,
    exp: iat + 900,
    nonce: randomBytes(24).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url"),
    sig = createHmac("sha256", secret).update(body).digest("base64url");
  return { token: `${body}.${sig}`, payload };
}
export function safeWebsite(v?: string | null) {
  if (!v?.trim()) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
export function handoffRedirect(token: string) {
  const o = (
    process.env.ATH_CUSTOMER_ORIGIN || "https://www.asktrusthub.com"
  ).replace(/\/+$/, "");
  const u = new URL("/claim/continue", o);
  u.searchParams.set("handoff", token);
  return new Response(null, {
    status: 302,
    headers: {
      Location: u.toString(),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
