import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXABLE_PATHS, STATE_DISCOVERY_ROUTES } from "@ith/config";

const page = readFileSync("apps/web/src/app/south-dakota/page.tsx", "utf8");

describe("South Dakota securities publication", () => {
  it("keeps regulator populations separate and does not invent a roster", () => {
    expect(page).toContain("NOT_ACQUIRED");
    expect(page).toContain("does not mean zero registrants");
    expect(page).toContain("SDCL 47-31B-406");
    expect(page).toContain("ARSD 20:08:07");
    expect(page).toContain("37-5B");
    expect(page).toContain("No name-only adverse joins");
    expect(page).not.toMatch(/aggregateRating|ratingValue|Trust Score|\b\d{2,}\s+(advisers|firms|agents)\b/i);
  });

  it("publishes one statewide indexable route", () => {
    expect(page).toContain('path: "/south-dakota"');
    expect(INDEXABLE_PATHS).toContain("/south-dakota");
    expect(INDEXABLE_PATHS.some((path) => /\/south-dakota\/.+/.test(path))).toBe(false);
    expect(STATE_DISCOVERY_ROUTES).toContainEqual({
      href: "/south-dakota",
      label: "South Dakota",
    });
  });
});
