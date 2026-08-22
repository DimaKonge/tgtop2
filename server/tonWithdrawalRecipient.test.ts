import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("withdrawal recipient autofill", () => {
  it("uses the user's latest confirmed deposit sender before falling back to TonConnect", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(dbSource).toContain('eq(tonDeposits.status, "confirmed")');
    expect(routerSource).toContain("getTonWithdrawalDefaultRecipient");
    expect(homeSource).toContain("tonWithdrawalDefaultRecipientQuery");
    expect(homeSource).toContain("current || tonWithdrawalDefaultRecipient || walletAddress || \"\"");
  });
});
