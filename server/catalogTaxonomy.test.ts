import { describe, expect, it } from "vitest";
import { CATALOG_SUBCATEGORIES, isCatalogSubcategory } from "./catalogTaxonomy";

describe("TG TOP catalog taxonomy", () => {
  it("keeps channel and chat topic taxonomies distinct", () => {
    expect(CATALOG_SUBCATEGORIES.Каналы).toContain("Crypto");
    expect(CATALOG_SUBCATEGORIES.Чаты).toContain("Community");
    expect(CATALOG_SUBCATEGORIES.Чаты).not.toContain("Crypto");
  });

  it("validates subcategory values against their community type", () => {
    expect(isCatalogSubcategory("Каналы", "General")).toBe(true);
    expect(isCatalogSubcategory("Чаты", "General")).toBe(true);
    expect(isCatalogSubcategory("Каналы", "Technology")).toBe(true);
    expect(isCatalogSubcategory("Чаты", "Technology")).toBe(false);
  });
});
