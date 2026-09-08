import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("withdrawal recipient autofill", () => {
  it("uses only the current safe TonConnect address and never a stored address from another session", () => {
    const homeSource = ["../client/src/pages/Home.tsx", "../client/src/pages/useHomeController.ts", "../client/src/pages/home-helpers.ts", "../client/src/pages/TopPage.tsx", "../client/src/pages/CatalogPage.tsx", "../client/src/pages/GiveawaysPage.tsx", "../client/src/pages/MinePage.tsx", "../client/src/pages/DetailsPage.tsx", "../client/src/pages/OwnerPage.tsx", "../client/src/pages/AdminPage.tsx", "../client/src/pages/ProfilePage.tsx"].map(__p => readFileSync(new URL(__p, import.meta.url), "utf8")).join("\n")
      + "\n" + readFileSync(new URL("../client/src/hooks/useTonWallet.ts", import.meta.url), "utf8");

    expect(homeSource).toContain('const tonWithdrawalDefaultRecipient = safeWalletAddress ?? "";');
    expect(homeSource).toContain('setTonWithdrawalAddress(safeWalletAddress ?? "");');
    expect(homeSource).toContain('current || tonWithdrawalDefaultRecipient');
    expect(homeSource).not.toContain("tonWithdrawalDefaultRecipientQuery");
    expect(homeSource).not.toContain('tonWithdrawalDefaultRecipient || walletAddress');
  });
});
