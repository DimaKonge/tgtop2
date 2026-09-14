import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("community onboarding intent router", () => {
  const source = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

  it("derives owner identity from authenticated Telegram context and accepts only bounded kinds", () => {
    const start = source.indexOf("createCommunityOnboardingIntent: protectedProcedure");
    const end = source.indexOf("getSlots: publicProcedure", start);
    const procedure = source.slice(start, end);

    expect(procedure).toContain('z.enum(["group", "channel"])');
    expect(procedure).toContain("getTelegramIdFromOpenId(ctx.user.openId)");
    expect(procedure).not.toContain("ownerTelegramId: z.");
    expect(procedure).toContain("createTelegramOnboardingIntent");
    expect(procedure).toContain('intent.status === "rate_limited"');
  });
});
