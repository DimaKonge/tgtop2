import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canEnterTopRanking } from "./rankingListingPolicy";

describe("TOP ranking listing consistency", () => {
  it("accepts owner communities ready for initial or continued listing but not review-held or terminal states", () => {
    expect(canEnterTopRanking("pending")).toBe(true);
    expect(canEnterTopRanking("listed")).toBe(true);
    expect(canEnterTopRanking("review")).toBe(false);
    expect(canEnterTopRanking("blocked")).toBe(false);
    expect(canEnterTopRanking("sold")).toBe(false);
  });

  it("moves a successful ranking placement into the listed lifecycle and announces only new listings", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("if (!canEnterTopRanking(group.status))");
    expect(source).toContain('status: "listed",');
    expect(source).toContain("listedAt: now,");
    expect(source).toContain("const targetGroupsForAnnouncement = groupsNeedingListing;");
  });
});
