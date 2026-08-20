import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("unified ranking board", () => {
  it("uses the All board as the only source of bids and filters categories only for display", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(source).toContain('const boardCategory = "Все";');
    expect(source).toContain('const requestedCategory = category === "Каналы" || category === "Чаты" ? category : "Все";');
    expect(source).toContain('if (requestedCategory !== "Все") groupConditions.push(eq(groupsCatalog.category, requestedCategory));');
    expect(source).toContain('const visibleEntries = slots.filter(slot => slot.groupId !== null && groupMap.has(slot.groupId));');
    expect(source).toContain('const rankingCategories = ["Все"] as const;');
  });
});
