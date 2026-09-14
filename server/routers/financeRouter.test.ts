import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

  it("passes a hash to the Finance topic only from confirmed reconciliation paths", () => {
    const routerSource = readFileSync(new URL("./financeRouter.ts", import.meta.url), "utf8");
    const workerSource = readFileSync(new URL("../tonPayoutWorker.ts", import.meta.url), "utf8");

    expect(routerSource).toContain('event: "deposit_confirmed"');
    expect(routerSource).toContain("transactionHash: result.transactionHash");
    expect(workerSource).toContain('event: "withdrawal_confirmed"');
    expect(workerSource).toContain("transactionHash: withdrawal.transactionHash");
    expect(workerSource).not.toMatch(/event: "withdrawal_sent"[\s\S]{0,360}transactionHash:/);
  });
});
