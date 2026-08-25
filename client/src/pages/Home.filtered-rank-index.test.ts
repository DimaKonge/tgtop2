import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("filtered ranking detail index", () => {
  it("passes the compact position from the active board to community details", () => {
    const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

    expect(source).toContain("const displayPosition = boardScope ? rankedGroups.findIndex(group => group.id === id) + 1 : 0;");
    expect(source).toContain("...(displayPosition > 0 ? { displayPosition } : {})");
    expect(source).toContain("const detailDisplayedSlotNumber = detailBoardScope?.displayPosition ?? selectedSlot?.slotNumber");
    expect(source).toContain("selectedSlot ? `#${detailDisplayedSlotNumber}` : `Прогноз #${detailDisplayedSlotNumber}`");
  });
});
