import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("catalog directory administration", () => {
  it("lets every assigned panel user manage countries, cities, and topics while protecting values in use", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(dbSource).toContain("export async function getCatalogTaxonomy()");
    expect(dbSource).toContain("if (!access.canModerate) throw new Error(\"Недостаточно прав для управления справочниками\")");
    expect(dbSource).toContain("Нельзя удалить страну: она используется в размещённом сообществе");
    expect(dbSource).toContain("Нельзя удалить город: он используется в размещённом сообществе");
    expect(dbSource).toContain("Нельзя удалить рубрику: она используется в размещённом сообществе");
    expect(routerSource).toContain("addCatalogCountry: protectedProcedure");
    expect(routerSource).toContain("addCatalogCity: protectedProcedure");
    expect(routerSource).toContain("addCatalogTopic: protectedProcedure");
    expect(homeSource).toContain("География и рубрики");
    expect(homeSource).toContain("Все пользователи с доступом к админ-панели могут менять эти списки.");
    expect(homeSource).toContain("const managedCountries = catalogTaxonomy?.countries?.length");
  });
});
