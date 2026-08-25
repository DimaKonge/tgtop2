import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ranking reward budget reservation", () => {
  const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  it("reserves a new reward budget together with the ranking bid", () => {
    expect(source).toContain("function getRankingRewardBudgetAdjustment");
    expect(source).toContain("const totalDebit = spendUnits + reservedRewardBudget - releasedRewardBudget;");
    expect(source).toContain('kind: "reward_campaign_reserve"');
    expect(source).toContain('kind: "reward_campaign_release"');
  });

  it("refunds the full amount if placement fails after debiting", () => {
    expect(source).toContain("bonusBalance: sql`${users.bonusBalance} + ${totalDebit}`");
    expect(source).toContain("amount: totalDebit, kind: \"ranking_refund\"");
  });
});
