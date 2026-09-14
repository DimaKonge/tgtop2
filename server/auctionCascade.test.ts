import { describe, expect, it } from "vitest";
import { cascadeRankedOccupants } from "./auctionCascade";

describe("TG TOP cascading rank placement", () => {
  it("moves the former first-place group to second place after an outbid", () => {
    const result = cascadeRankedOccupants([
      { slotNumber: 1, occupant: "alpha" },
      { slotNumber: 2, occupant: "beta" },
      { slotNumber: 3, occupant: "gamma" },
    ], 1, "delta");

    expect(result.map(slot => slot.occupant)).toEqual(["delta", "alpha", "beta"]);
  });

  it("moves an existing lower-ranked group up without duplicating it", () => {
    const result = cascadeRankedOccupants([
      { slotNumber: 1, occupant: "alpha" },
      { slotNumber: 2, occupant: "beta" },
      { slotNumber: 3, occupant: "gamma" },
      { slotNumber: 4, occupant: "delta" },
    ], 1, "gamma");

    expect(result.map(slot => slot.occupant)).toEqual(["gamma", "alpha", "beta", "delta"]);
  });
});
