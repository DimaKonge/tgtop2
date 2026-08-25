import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified ranking board", () => {
  it("uses the All board as the only source of bids and filters categories only for display", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(source).toContain('const boardCategory = "Все";');
    expect(source).toContain('const requestedCategory = category === "Каналы" || category === "Чаты" ? category : "Все";');
    expect(source).toContain('if (requestedCategory !== "Все") groupConditions.push(eq(groupsCatalog.category, requestedCategory));');
    expect(source).toContain('if (country && country !== "Все" && country !== "Global") groupConditions.push(eq(groupsCatalog.country, country));');
    expect(source).toContain('if (requestedSubcategory !== "Все") groupConditions.push(eq(groupsCatalog.subcategory, requestedSubcategory));');
    expect(source).toContain('if (city && city !== "Все") groupConditions.push(eq(groupsCatalog.city, city));');
    expect(source).toContain('const isOccupied = slot.groupId !== null;');
    expect(source).toContain('const RANKING_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;');
    expect(source).toContain('return slots.map(slot => {');
    expect(source).not.toContain('slotNumber: index + 1');
    expect(source).toContain('const rankingCategories = ["Все"] as const;');
  });
});
