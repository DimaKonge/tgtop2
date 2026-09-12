import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ranking card background and referral production migration", () => {
  const migration = readFileSync(new URL("../scripts/apply-ranking-card-and-referral-migration.mjs", import.meta.url), "utf8");
  const release = readFileSync(new URL("../scripts/release-vps.sh", import.meta.url), "utf8");

  it("safely adds cardBackgroundPreset column and referral tables idempotently", () => {
    expect(migration).toContain("ALTER TABLE `groups_catalog` ADD COLUMN `cardBackgroundPreset` varchar(64)");
    expect(migration).toContain("bonus_credit_audits");
    expect(migration).toContain("referral_bonus_grants");
    expect(migration).toContain("referral_reward_configs");
    expect(migration).toContain("ranking_card_and_referral_migration=ok");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)/i);
    expect(migration).not.toContain("drizzle-kit migrate");
  });

  it("is registered in the release runbook before service restart", () => {
    expect(release).toContain('node "$STAGE/scripts/apply-ranking-card-and-referral-migration.mjs"');
  });
});
