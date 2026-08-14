import { describe, expect, it } from "vitest";
import { getMinimumRankingBidMilliTon, isQualifyingRankingBid, VACANT_RANKING_MINIMUM_MILLITON } from "./rankingBidPolicy";

describe("TG TOP paid ranking policy", () => {
  it("requires a 0.1 TON minimum bid for every vacant placement", () => {
    expect(VACANT_RANKING_MINIMUM_MILLITON).toBe(100);
    expect(getMinimumRankingBidMilliTon(0, false)).toBe(100);
    expect(isQualifyingRankingBid(99, 0, false)).toBe(false);
    expect(isQualifyingRankingBid(100, 0, false)).toBe(true);
  });

  it("requires a strictly higher bid for an occupied placement", () => {
    expect(getMinimumRankingBidMilliTon(250, true)).toBe(251);
    expect(isQualifyingRankingBid(250, 250, true)).toBe(false);
    expect(isQualifyingRankingBid(251, 250, true)).toBe(true);
  });

  it("keeps the 0.1 TON minimum when a seeded occupied slot has no recorded bid yet", () => {
    expect(getMinimumRankingBidMilliTon(0, true)).toBe(100);
    expect(isQualifyingRankingBid(99, 0, true)).toBe(false);
    expect(isQualifyingRankingBid(100, 0, true)).toBe(true);
  });
});
