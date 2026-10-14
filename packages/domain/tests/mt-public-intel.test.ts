import { describe, expect, it } from "vitest";
import { MT_INVESTOR_INTEL as intel } from "../src/mt-public-intel";

describe("Montana InvestorTrustHub publication snapshot", () => {
  it("keeps current IAPD firm and person grains separate", () => {
    expect(intel.sourceDate).toBe("2026-10-14");
    expect(intel.stateIa).toMatchObject({
      rows: 102,
      distinctFirmCrd: 102,
      approvedFirmCrd: 101,
    });
    expect(intel.notice).toMatchObject({
      rows: 1270,
      distinctFiledFirmCrd: 1270,
    });
    expect(intel.era).toMatchObject({ rows: 15, activeFirmCrd: 15 });
    expect(intel.iar).toMatchObject({
      registrationRows: 2884,
      distinctApprovedPersonCrd: 2857,
    });
    expect(intel).not.toHaveProperty("combinedTotal");
  });

  it("keeps unavailable row populations explicit", () => {
    expect(intel.limits.brokerDealerRows).toBe("NOT_ACQUIRED");
    expect(intel.limits.brokerDealerAgents).toBe("NOT_ACQUIRED");
    expect(intel.limits.orders).toBe("NOT_ACQUIRED");
    expect(intel.limits.existingCanonicalMatches).toBe("NOT_RECONCILED");
  });
});
