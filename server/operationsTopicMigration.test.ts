import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("operations topic production migration", () => {
  const source = readFileSync(new URL("../scripts/apply-operations-topic-migrations.mjs", import.meta.url), "utf8");

  it("applies only idempotent additive schema required by the topic-routing MVP", () => {
    expect(source).toContain('hasTable("mini_app_launch_events")');
    expect(source).toContain('hasTable("telegram_support_messages")');
    expect(source).toContain('telegram_operation_log_destinations');
    expect(source).toContain('hasTable("telegram_operations_owner_bindings")');
    expect(source).toContain("telegram_operations_owner_chat_unique");
    expect(source).toContain("messageThreadId");
    expect(source).toContain("operations_topic_schema=ok");
  });

  it("fails closed on partial or unexpected production schema instead of replaying legacy migrations", () => {
    expect(source).toContain("is partially present; missing");
    expect(source).toContain("unexpected enum; refusing unsafe migration");
    expect(source).not.toContain("drizzle-kit migrate");
  });
});
