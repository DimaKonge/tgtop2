import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("filtered ranking detail index", () => {
  it("passes the compact position from the active board to community details", () => {
    const source = ["./Home.tsx", "./useHomeController.ts", "./home-helpers.ts", "./TopPage.tsx", "./CatalogPage.tsx", "./GiveawaysPage.tsx", "./MinePage.tsx", "./DetailsPage.tsx", "./OwnerPage.tsx", "./AdminPage.tsx", "./ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");

    expect(source).toContain("const displayPosition = boardScope ? rankedGroups.findIndex(group => group.id === id) + 1 : 0;");
    expect(source).toContain("...(displayPosition > 0 ? { displayPosition } : {})");
    expect(source).toContain("const detailDisplayedSlotNumber = detailBoardScope?.displayPosition ?? selectedSlot?.slotNumber");
    expect(source).toContain("selectedSlot ? `#${detailDisplayedSlotNumber}` : `Прогноз #${detailDisplayedSlotNumber}`");
  });

  it("fills a free category TOP slot from the matching catalog list before showing an empty cell", () => {
    const source = ["./Home.tsx", "./useHomeController.ts", "./home-helpers.ts", "./TopPage.tsx", "./CatalogPage.tsx", "./GiveawaysPage.tsx", "./MinePage.tsx", "./DetailsPage.tsx", "./OwnerPage.tsx", "./AdminPage.tsx", "./ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");

    expect(source).toContain("const fallbackRankedGroups = useMemo");
    expect(source).toContain("return visibleGroups.filter(group => !rankedIds.has(group.id));");
    expect(source).toContain("const fallbackGroup = fallbackRankedGroups[fallbackIndex];");
    expect(source).toContain("group: fallbackGroup");
  });
});
