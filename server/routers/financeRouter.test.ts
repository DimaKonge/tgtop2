import { describe, expect, it } from "vitest";
import { financeProcedures, financeRouter } from "./financeRouter";

describe("finance router extraction", () => {
  it("keeps every account, deposit, withdrawal and manual-review procedure in the extracted router", () => {
    expect(Object.keys(financeRouter._def.procedures).sort()).toEqual([
      "createTonDeposit",
      "createTonWithdrawal",
      "getAccount",
      "getAccountActivity",
      "getTonDeposits",
      "getTonWithdrawalDefaultRecipient",
      "getTonWithdrawals",
      "getTonWithdrawalsForManualReview",
      "markTonDepositSubmitted",
      "quoteTonWithdrawal",
      "reconcileTonWithdrawal",
      "reviewTonWithdrawal",
      "verifyTonDeposit",
    ]);
    expect(financeProcedures).toHaveProperty("reviewTonWithdrawal");
  });
});
