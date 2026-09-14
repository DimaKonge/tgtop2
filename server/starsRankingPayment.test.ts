import { describe, expect, it } from "vitest";
import { STARS_PER_MINIMUM_RANKING_BID, getStarsAmountForRankingBid } from "./db";

describe("Telegram Stars ranking payment policy", () => {
  it("charges 10 Stars for the 0.1 TON minimum ranking bid", () => {
    expect(STARS_PER_MINIMUM_RANKING_BID).toBe(10);
    expect(getStarsAmountForRankingBid(100)).toBe(10);
  });

  it("rounds higher bid amounts up to the next whole Star", () => {
    expect(getStarsAmountForRankingBid(101)).toBe(11);
    expect(getStarsAmountForRankingBid(250)).toBe(25);
  });
});
