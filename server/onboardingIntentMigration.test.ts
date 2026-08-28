import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("onboarding intent production migration", () => {
  const migration = readFileSync(new URL("../scripts/apply-onboarding-intent-migration.mjs", import.meta.url), "utf8");
  const release = readFileSync(new URL("../scripts/release-vps.sh", import.meta.url), "utf8");

  it("creates only the additive bounded intent table and required indexes", () => {
    expect(migration).toContain('const tableName = "telegram_onboarding_intents"');
    expect(migration).toContain("CREATE TABLE \\`telegram_onboarding_intents\\`");
    expect(migration).toContain("telegram_onboarding_intents_owner_kind_unique");
    expect(migration).toContain("telegram_onboarding_intents_pending_expires_idx");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|INDEX)/i);
    expect(migration).not.toContain("drizzle-kit migrate");
  });

  it("fails closed on a partial or unexpected schema and runs before service activation", () => {
    expect(migration).toContain("is partially present; missing");
    expect(migration).toContain("unexpected enum; refusing unsafe migration");
    expect(migration).toContain("telegram_onboarding_intent_schema=ok");
    expect(release).toContain('node "$STAGE/scripts/apply-onboarding-intent-migration.mjs"');
  });
});
