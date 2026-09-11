import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
const context = readFileSync(resolve(root, "server/_core/context.ts"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

describe("beta referral bonus contracts", () => {
  it("stores one grant per verified invitee and keeps the default lifetime cap at two", () => {
    expect(schema).toContain('export const referralBonusGrants = mysqlTable("referral_bonus_grants"');
    expect(schema).toContain('uniqueIndex("referral_bonus_grants_invitee_unique").on(table.inviteeOpenId)');
    expect(schema).toContain('rewardAmount: int("rewardAmount").default(100)');
    expect(schema).toContain('lifetimeLimit: int("lifetimeLimit").default(2)');
    expect(db).toContain("const DEFAULT_REFERRAL_LIFETIME_LIMIT = 2;");
    expect(db).toContain("if (grants.length >= config.lifetimeLimit)");
  });

  it("credits only the inviter after the authenticated Mini App context is verified", () => {
    expect(db).toContain('kind: "reward_invite_referral"');
    expect(db).toContain("bonusBalance: sql`${users.bonusBalance} + ${config.rewardAmount}`");
    expect(context).toContain("await claimBetaReferralReward(openId);");
    expect(context).toContain("validateTelegramInitDataWithTokens");
    expect(db).toContain('if (!inviter || inviter.openId === inviteeOpenId)');
  });

  it("exposes admin-only configuration and audited manual username credits", () => {
    expect(schema).toContain('export const bonusCreditAudits = mysqlTable("bonus_credit_audits"');
    expect(db).toContain("getReferralAdminOverview");
    expect(db).toContain("updateReferralRewardConfig");
    expect(db).toContain("creditBonusByTelegramUsername");
    expect(db).toContain("Недостаточно прав для ручного начисления бонуса");
    expect(db).toContain("await tx.insert(bonusCreditAudits)");
    expect(router).toContain("getReferralAdminOverview");
    expect(router).toContain("updateReferralRewardConfig");
    expect(router).toContain("creditBonusByTelegramUsername");
  });

  it("renders the agreed progress and inviter-only copy in both languages", () => {
    expect(home).toContain('value={referral?.progressLabel ?? `0/${referral?.lifetimeLimit ?? 2}`}');
    expect(home).toContain("Приглашённый пользователь бонус не получает.");
    expect(home).toContain("The invited user receives no referral bonus.");
    expect(home).toContain("Начислить вручную по username");
  });
});
