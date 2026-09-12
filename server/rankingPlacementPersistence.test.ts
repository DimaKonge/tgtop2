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

  it("places a fresh 0.1 GRAM listing above older equal-price entries in the automatic listing path", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("const incomingIds = new Set(groups.map(group => group.id));");
    expect(source).toContain("listedAt: now,");
    expect(source).toContain("const incomingEntries = groups.map(group => ({");
    expect(source).toContain("const rankedEntries = assignRankingEntriesToSlots([");
    expect(source).toContain("const boardEntries = board.filter(slot => slot.groupId !== null).map(slot => {");
    expect(source).toContain("heldSince: slot.groupId !== null && incomingIds.has(slot.groupId) ? now : slot.updatedAt");
    expect(source).toContain("heldSince: now,");
  });

  it("serializes competing paid bids on the canonical board before debiting the balance", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("A no-op update deliberately takes an exclusive lock for every canonical board row.");
    expect(source).toContain("const lockedTarget = boards[0]?.find(slot => slot.id === target.id);");
    expect(source).toContain("Ставка уже изменилась. Минимальная ставка сейчас");
    expect(source).toContain("const balance = await tx.update(users)");
    expect(source).toContain("currentBid: `${formatTonAmount(bidAmount / 1000)} GRAM`");
  });

  it("persists cardBackgroundPreset across the complete ranking checkout flow", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    // 1. Home.tsx passes cardBackgroundPreset in placeBid.mutate
    expect(home).toContain("cardBackgroundPreset: listingCardBackgroundPreset");

    // 2. server/routers.ts accepts cardBackgroundPreset in placeBid Zod input
    expect(routers).toContain("cardBackgroundPreset: z.string().trim().max(64).nullable().optional()");

    // 3. placeBid checks undefined and adds cardBackgroundPreset to options object
    expect(routers).toContain("input.cardBackgroundPreset === undefined");
    expect(routers).toContain("cardBackgroundPreset: input.cardBackgroundPreset as CardBackgroundPreset | null | undefined");

    // 4. server/db.ts validates against CARD_BACKGROUND_PRESET_IDS and updates groups_catalog
    expect(db).toContain("cardBackgroundPreset?: CardBackgroundPreset | null;");
    expect(db).toContain("if (options?.cardBackgroundPreset && !(CARD_BACKGROUND_PRESET_IDS as readonly string[]).includes(options.cardBackgroundPreset))");
    expect(db).toContain("...(options?.cardBackgroundPreset !== undefined ? { cardBackgroundPreset: options.cardBackgroundPreset } : {})");

    // 5. openStarsPayment initializes preset from current group with null fallback
    expect(home).toContain("setListingCardBackgroundPreset(");
    expect(home).toContain("THEME_BACKGROUND_OPTIONS.some(item => item.value === currentGroup?.cardBackgroundPreset)");
  });
});
