import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalog directory administration", () => {
  it("lets every assigned panel user manage countries, cities, and topics while protecting values in use", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const homeSource = ["../client/src/pages/Home.tsx", "../client/src/pages/useHomeController.ts", "../client/src/pages/home-helpers.ts", "../client/src/pages/TopPage.tsx", "../client/src/pages/CatalogPage.tsx", "../client/src/pages/GiveawaysPage.tsx", "../client/src/pages/MinePage.tsx", "../client/src/pages/DetailsPage.tsx", "../client/src/pages/OwnerPage.tsx", "../client/src/pages/AdminPage.tsx", "../client/src/pages/ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n");

    expect(dbSource).toContain("export async function getCatalogTaxonomy()");
    expect(dbSource).toContain("if (!access.canModerate) throw new Error(\"Недостаточно прав для управления справочниками\")");
    expect(dbSource).toContain("Нельзя удалить страну: она используется в размещённом сообществе");
    expect(dbSource).toContain("Нельзя удалить город: он используется в размещённом сообществе");
    expect(dbSource).toContain("Нельзя удалить рубрику: она используется в размещённом сообществе");
    expect(dbSource).toContain('input: { category: "Каналы" | "Чаты" | "Боты"; code: string; label: string }');
    expect(dbSource).toContain('topic.category === "Боты"');
    expect(routerSource).toContain("addCatalogCountry: protectedProcedure");
    expect(routerSource).toContain("addCatalogCity: protectedProcedure");
    expect(routerSource).toContain("addCatalogTopic: protectedProcedure");
    expect(homeSource).toContain("География и рубрики");
    expect(homeSource).toContain("Все пользователи с доступом к админ-панели могут менять эти списки.");
    expect(homeSource).toContain("const managedCountries = catalogTaxonomy?.countries?.length");
    expect(homeSource).toContain('category: "Каналы" | "Чаты" | "Боты"');
    expect(homeSource).toContain('Рубрика ботов');
    expect(homeSource).toContain('setBotCategorySheetOpen(true)');
  });
});
