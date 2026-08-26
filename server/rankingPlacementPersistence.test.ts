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
    expect(source).toContain("export type RankingLotOptions = {");
    expect(source).toContain("await tx.update(groupsCatalog).set({");
    expect(source).toContain("anonymousListing: options.anonymousListing");
    expect(source).toContain("showOwnerContact: options.showOwnerContact");
    expect(source).toContain("managerPublic: options.managerPublic");
  });

  it("serializes competing paid bids on the canonical board before debiting the balance", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("A no-op update deliberately takes an exclusive lock for every canonical board row.");
    expect(source).toContain("const lockedTarget = boards[0]?.find(slot => slot.id === target.id);");
    expect(source).toContain("Ставка уже изменилась. Минимальная ставка сейчас");
    expect(source).toContain("const balance = await tx.update(users)");
    expect(source).toContain("currentBid: `${formatTonAmount(bidAmount / 1000)} GRAM`");
  });
});
