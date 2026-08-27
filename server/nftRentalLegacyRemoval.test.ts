import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("NFT rental requires the protected deal flow", () => {
  it("does not expose a direct endpoint or database mutation that marks an NFT rented", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

    expect(dbSource).not.toContain("export async function rentNft(");
    expect(routerSource).not.toContain("rentNft: protectedProcedure");
    expect(routerSource).toContain("createNftRentalDeal: protectedProcedure");
    expect(dbSource).toContain("Creates an idempotent rental intent. It never debits a balance and never assigns a Telegram username.");
  });
});
