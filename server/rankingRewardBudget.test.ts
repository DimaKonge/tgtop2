import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ranking reward budget reservation", () => {
  const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  it("reserves a new reward budget together with the ranking bid", () => {
    expect(source).toContain("function getRankingRewardBudgetAdjustment");
    expect(source).toContain("const totalDebit = creditDebit.spendUnits + creditDebit.reservedRewardBudget - creditDebit.releasedRewardBudget;");
    expect(source).toContain('kind: "reward_campaign_reserve"');
    expect(source).toContain('kind: "reward_campaign_release"');
  });

  it("debits the budget only inside the locked placement transaction", () => {
    expect(source).toContain("type RankingCreditDebit");
    expect(source).toContain("if (creditDebit) {");
    expect(source).toContain("const balance = await tx.update(users)");
    expect(source).toContain("return await placeBid(slotId, bidAmount, currentBidStr, leaderUsername, leaderUserId, groupId, options, {");
    expect(source).not.toContain("amount: totalDebit, kind: \"ranking_refund\"");
  });
});
