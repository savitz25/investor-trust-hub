export type BusinessProfile = {
  contractVersion: 1 | 2;
  hub: "investor";
  nativeProfileId: string;
  managed: true;
  source: "BUSINESS_SUPPLIED";
  freshness: { label: string };
  fields: Partial<
    Record<
      | "description"
      | "website"
      | "public_phone"
      | "public_email"
      | "contact_context",
      string
    >
  >;
};
export type Replies = {
  contractVersion: 1 | 2;
  hub: "investor";
  nativeProfileId: string;
  replies: Array<{ id: string; body: string; source: "BUSINESS_RESPONSE" }>;
};
const F = new Set([
  "description",
  "website",
  "public_phone",
  "public_email",
  "contact_context",
]);
export function parseProfile(v: unknown, id: string): BusinessProfile | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>,
    f = r.fields as Record<string, unknown> | undefined;
  if (
    ![1, 2].includes(Number(r.contractVersion)) ||
    r.hub !== "investor" ||
    r.nativeProfileId !== id ||
    r.managed !== true ||
    r.source !== "BUSINESS_SUPPLIED" ||
    !f ||
    Array.isArray(f) ||
    Object.keys(f).some((k) => !F.has(k)) ||
    Object.values(f).some((x) => typeof x !== "string" || x.length > 3000) ||
    !r.freshness ||
    typeof r.freshness !== "object"
  )
    return null;
  return r as unknown as BusinessProfile;
}
export function parseReplies(v: unknown, id: string): Replies | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (
    ![1, 2].includes(Number(r.contractVersion)) ||
    r.hub !== "investor" ||
    r.nativeProfileId !== id ||
    !Array.isArray(r.replies) ||
    r.replies.length > 25
  )
    return null;
  for (const x of r.replies) {
    const q = x as Record<string, unknown>;
    if (
      !q ||
      q.source !== "BUSINESS_RESPONSE" ||
      typeof q.body !== "string" ||
      q.body.length > 3000 ||
      /<\/?[a-z][\s\S]*>/i.test(q.body)
    )
      return null;
  }
  return r as unknown as Replies;
}
async function read(path: string, f: typeof fetch) {
  try {
    const o = (
      process.env.ATH_CUSTOMER_ORIGIN || "https://www.asktrusthub.com"
    ).replace(/\/+$/, "");
    const r = await f(o + path, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
      headers: { accept: "application/json" },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
export async function customerLayer(id: string, f: typeof fetch = fetch) {
  const [p, r] = await Promise.all([
    read(`/api/public/profiles/investor/${encodeURIComponent(id)}`, f),
    read(`/api/public/profiles/investor/${encodeURIComponent(id)}/replies`, f),
  ]);
  return { profile: parseProfile(p, id), replies: parseReplies(r, id) };
}
