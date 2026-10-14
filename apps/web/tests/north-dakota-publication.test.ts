import { describe, expect, it } from "vitest";
import { INDEXABLE_PATHS, STATE_DISCOVERY_ROUTES } from "@ith/config";
import census from "../../../data/north-dakota-inv-001/iapd-north-dakota-summary.json";

describe("North Dakota IAPD publication evidence", () => {
  it("uses regulator jurisdiction and keeps adviser firm/person populations separate", () => {
    expect(census.jurisdiction).toBe("ND");
    expect(census.sourceDate).toBe("2026-10-14");
    expect(census.stateFeed.filter).toBe("StateRgstn/Rgltr/@Cd=ND");
    expect(census.stateFeed.approvedDistinctFirmCrd).toBe(44);
    expect(census.stateFeed.registrationRows).toBe(
      census.stateFeed.approvedDistinctFirmCrd,
    );
    expect(census.secFeed.filter).toBe("NoticeFiled/States/@RgltrCd=ND");
    expect(census.secFeed.filedDistinctFirmCrd).toBe(920);
    expect(census.era.filter).toBe("ERA/Rgltr/@Cd=ND");
    expect(census.era.activeDistinctFirmCrd).toBe(3);
    expect(census.iarFeed.personRowsWithCurrentRegistration).toBe(1916);
    expect(census.iarFeed.distinctPersonCrdWithApprovedRegistration).toBe(1888);
    expect(
      census.iarFeed.distinctPersonCrdWithApprovedRegistration,
    ).toBeLessThanOrEqual(census.iarFeed.statusRows.APPROVED);
  });

  it("preserves pending IAR statuses and exact intersections without summing classes", () => {
    expect(census.iarFeed.statusRows.APP_PEND_IARCE).toBeGreaterThan(0);
    expect(
      census.exactFirmCrdIntersections.approvedStateIaAndFiledNotice,
    ).toBeGreaterThanOrEqual(0);
    expect(census.secFeed.filedDistinctFirmCrd).toBe(census.secFeed.noticeRows);
  });

  it("publishes a state route that is discoverable and indexable", () => {
    expect(INDEXABLE_PATHS).toContain("/north-dakota");
    expect(STATE_DISCOVERY_ROUTES).toContainEqual({
      href: "/north-dakota",
      label: "North Dakota",
    });
  });
});
