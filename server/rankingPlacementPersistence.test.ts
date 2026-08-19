import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ranking placement persistence", () => {
  it("updates a higher bid in the same cell without resetting its occupancy time", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("const bidChanged = slot.bidAmount !== (source?.bidAmount ?? 0);");
    expect(source).toContain("updatedAt: groupChanged ? now : slot.updatedAt");
  });

  it("allows the owner to re-list their own slot at the 0.1 GRAM floor without treating it as an outbid", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("const targetIsHeldByAnotherGroup = target.groupId !== null && target.groupId !== groupId;");
    expect(source).toContain("targetIsHeldByAnotherGroup ? target.bidAmount : 0");
    expect(source).toContain("? getMinimumRankingBidMilliTon(target.bidAmount, true, slotFloor)");
    expect(source).toContain(": slotFloor;");
  });

  it("persists a chosen public or anonymous profile mode inside the paid ranking placement", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("visibility?: { anonymousListing: boolean; showOwnerContact: boolean }");
    expect(source).toContain("await tx.update(groupsCatalog).set({");
    expect(source).toContain("anonymousListing: visibility.anonymousListing");
    expect(source).toContain("showOwnerContact: visibility.showOwnerContact");
  });
});
