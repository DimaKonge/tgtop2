import { describe, expect, it } from "vitest";
import { isGiveawayOpen, isValidGiveawayEnd, MIN_GIVEAWAY_DURATION_MS } from "./giveawayPolicy";

describe("giveaway policy", () => {
  const now = new Date("2026-08-19T08:00:00Z");

  it("requires an owner to set an end time at least five minutes in the future", () => {
    expect(isValidGiveawayEnd(new Date(now.getTime() + MIN_GIVEAWAY_DURATION_MS), now)).toBe(true);
    expect(isValidGiveawayEnd(new Date(now.getTime() + MIN_GIVEAWAY_DURATION_MS - 1), now)).toBe(false);
  });

  it("allows participation only while a giveaway is open and unexpired", () => {
    expect(isGiveawayOpen("open", new Date(now.getTime() + 1), now)).toBe(true);
    expect(isGiveawayOpen("closed", new Date(now.getTime() + 1), now)).toBe(false);
    expect(isGiveawayOpen("open", new Date(now.getTime() - 1), now)).toBe(false);
  });
});
