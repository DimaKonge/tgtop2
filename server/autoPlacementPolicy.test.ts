import { describe, expect, it } from "vitest";
import { planVacantRankingAssignments } from "./autoPlacementPolicy";

describe("vacant ranking auto-placement", () => {
  it("uses the highest available positions without moving existing occupants", () => {
    const assignments = planVacantRankingAssignments([
      { id: 1, slotNumber: 1, groupId: 11 },
      { id: 2, slotNumber: 2, groupId: null },
      { id: 3, slotNumber: 3, groupId: null },
    ], [22, 33]);

    expect(assignments).toEqual([{ slotId: 2, groupId: 22 }, { slotId: 3, groupId: 33 }]);
  });

  it("does not create a second placement for a group already on the board", () => {
    expect(planVacantRankingAssignments([
      { id: 1, slotNumber: 1, groupId: 11 },
      { id: 2, slotNumber: 2, groupId: null },
    ], [11, 22])).toEqual([{ slotId: 2, groupId: 22 }]);
  });
});
