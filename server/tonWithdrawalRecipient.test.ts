import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("withdrawal recipient autofill", () => {
  it("uses only the current safe TonConnect address and never a stored address from another session", () => {
    const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

    expect(homeSource).toContain('const tonWithdrawalDefaultRecipient = safeWalletAddress ?? "";');
    expect(homeSource).toContain('setTonWithdrawalAddress(safeWalletAddress ?? "");');
    expect(homeSource).toContain('current || tonWithdrawalDefaultRecipient');
    expect(homeSource).not.toContain("tonWithdrawalDefaultRecipientQuery");
    expect(homeSource).not.toContain('tonWithdrawalDefaultRecipient || walletAddress');
  });
});
