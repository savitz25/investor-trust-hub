import { createHmac } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/customer-claim-validation/v1", () => ({
  getClaimableInvestorFirm: vi.fn(),
}));
import {
  claimEnabled,
  claimRolloutActive,
  handoffRedirect,
  mintInvestorHandoff,
  safeWebsite,
} from "../src/lib/customer-integration/core";
import {
  customerLayer,
  parseProfile,
  parseReplies,
} from "../src/lib/customer-integration/public";
const ID = "048f5130-ec2e-49f5-b064-a7012d195ebf",
  S = "test-secret-that-is-at-least-32-characters",
  P = {
    resultState: "EXACT_IDENTITY",
    nativeProfileId: ID,
    firmCrd: "312385",
    canonicalProfileUrl: "https://www.investortrusthub.com/firm/sec-crd-312385",
    displayName: "AHARA ADVISORS",
  } as const;
describe("ATH-CUST-NET-002B", () => {
  it("mints exact signed firm handoff", () => {
    const m = mintInvestorHandoff(S, P, new Date("2026-09-02"));
    expect(m.payload.entity_class).toBe("firm");
    expect(m.payload.external_key).toBe("312385");
    expect(m.payload.exp - m.payload.iat).toBe(900);
    const [b, s] = m.token.split(".");
    expect(createHmac("sha256", S).update(b!).digest("base64url")).toBe(s);
  });
  it("gates exact canary", () => {
    expect(claimRolloutActive({})).toBe(false);
    expect(
      claimRolloutActive({
        ATH_HANDOFF_SECRET: S,
        ATH_CLAIM_CTA_MODE: "canary",
      }),
    ).toBe(true);
    expect(claimEnabled(ID, { ATH_HANDOFF_SECRET: S })).toBe(false);
    expect(
      claimEnabled(ID, {
        ATH_HANDOFF_SECRET: S,
        ATH_CLAIM_CTA_MODE: "canary",
        ATH_CLAIM_CANARY_PROFILE_IDS: ID,
      }),
    ).toBe(true);
    expect(
      claimEnabled("e81db223-d101-4003-a361-37c1277171f3", {
        ATH_HANDOFF_SECRET: S,
        ATH_CLAIM_CTA_MODE: "canary",
        ATH_CLAIM_CANARY_PROFILE_IDS: ID,
      }),
    ).toBe(false);
  });
  it("rejects unsafe URLs", () => {
    expect(safeWebsite("https://example.com")).toBe("https://example.com/");
    for (const x of [
      "javascript:x",
      "JaVaScRiPt:x",
      "data:x",
      "vbscript:x",
      "//evil.test",
      "relative",
      "",
    ])
      expect(safeWebsite(x)).toBe(null);
  });
  it("uses private redirect", () => {
    const r = handoffRedirect("signed.token");
    expect(r.status).toBe(302);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
  });
  it("parses only exact DTOs", () => {
    const d = {
      contractVersion: 2,
      hub: "investor",
      nativeProfileId: ID,
      managed: true,
      source: "BUSINESS_SUPPLIED",
      freshness: { label: "Current" },
      fields: { description: "x" },
    };
    expect(parseProfile(d, ID)).not.toBeNull();
    expect(parseProfile({ ...d, hub: "senior" }, ID)).toBeNull();
    const r = {
      contractVersion: 2,
      hub: "investor",
      nativeProfileId: ID,
      replies: [{ id: "r", body: "Approved", source: "BUSINESS_RESPONSE" }],
    };
    expect(parseReplies(r, ID)).not.toBeNull();
    expect(
      parseReplies(
        { ...r, replies: [{ ...r.replies[0], body: "<b>x</b>" }] },
        ID,
      ),
    ).toBeNull();
  });
  it("fails closed on Ask outage", async () => {
    const f = (async () => {
      throw Error();
    }) as typeof fetch;
    expect(await customerLayer(ID, f)).toEqual({
      profile: null,
      replies: null,
    });
  });
});
