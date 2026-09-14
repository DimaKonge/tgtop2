import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("public TOP board reads", () => {
  it("never creates, reorders or auto-places TOP data simply because a visitor opens the page", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const getSlotsBlock = source.slice(source.indexOf("export async function getAuctionSlots"), source.indexOf("export type RankingLotOptions"));

    expect(getSlotsBlock).toContain("await db.select().from(auctionSlots)");
    expect(getSlotsBlock).not.toContain("ensureAuctionBoard(");
    expect(getSlotsBlock).not.toContain("planVacantRankingAssignments(");
    expect(getSlotsBlock).not.toContain("await db.transaction(");
    expect(getSlotsBlock).not.toContain(".update(auctionSlots)");
    expect(getSlotsBlock).toContain("isOccupied: false, group: null");
  });
});
