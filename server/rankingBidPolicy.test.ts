import { describe, expect, it } from "vitest";
import { getMinimumRankingBidMilliTon, getRankingFloorMilliTon, isQualifyingRankingBid, RANKING_BID_STEP_MILLITON, sortRankingEntriesByBid, VACANT_RANKING_MINIMUM_MILLITON } from "./rankingBidPolicy";

describe("TG TOP paid ranking policy", () => {
  it("requires a 0.1 GRAM minimum bid for every vacant placement", () => {
    expect(VACANT_RANKING_MINIMUM_MILLITON).toBe(100);
    expect(getMinimumRankingBidMilliTon(0, false)).toBe(100);
    expect(isQualifyingRankingBid(99, 0, false)).toBe(false);
    expect(isQualifyingRankingBid(100, 0, false)).toBe(true);
  });

  it("requires a 0.1 GRAM higher bid for an occupied placement", () => {
    expect(RANKING_BID_STEP_MILLITON).toBe(100);
    expect(getMinimumRankingBidMilliTon(200, true)).toBe(300);
    expect(isQualifyingRankingBid(200, 200, true)).toBe(false);
    expect(isQualifyingRankingBid(300, 200, true)).toBe(true);
    expect(isQualifyingRankingBid(250, 200, true)).toBe(false);
  });

  it("keeps the 0.1 GRAM minimum when a seeded occupied slot has no recorded bid yet", () => {
    expect(getMinimumRankingBidMilliTon(0, true)).toBe(100);
    expect(isQualifyingRankingBid(99, 0, true)).toBe(false);
    expect(isQualifyingRankingBid(100, 0, true)).toBe(true);
  });

  it("defines descending minimum floors for lead, secondary, and compact cells", () => {
    expect(getRankingFloorMilliTon(1)).toBe(300);
    expect(getRankingFloorMilliTon(2)).toBe(200);
    expect(getRankingFloorMilliTon(3)).toBe(200);
    expect(getRankingFloorMilliTon(4)).toBe(100);
  });

  it("orders higher bids first and preserves earlier occupancy for equal bids", () => {
    const ranked = sortRankingEntriesByBid([
      { groupId: 1, bidAmount: 100, heldSince: new Date("2026-08-19T10:00:00Z") },
      { groupId: 2, bidAmount: 300, heldSince: new Date("2026-08-19T10:03:00Z") },
      { groupId: 3, bidAmount: 100, heldSince: new Date("2026-08-19T10:02:00Z") },
    ]);
    expect(ranked.map(entry => entry.groupId)).toEqual([2, 1, 3]);
  });
});
