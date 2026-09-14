import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("telegram user-agent router boundary", () => {
  it("keeps every sensitive endpoint behind the shared database-backed owner gate", () => {
    const source = readFileSync(new URL("./telegramUserAgentRouter.ts", import.meta.url), "utf8");
    expect(source).toContain("requireTelegramUserAgentOwner(access)");
    for (const endpoint of ["status", "requestCode", "confirmCode", "confirmPassword", "disconnect", "bootstrapOwnerDm", "getHistoricalStats", "allowHistoricalStatsTarget", "refreshHistoricalStats"]) {
      expect(source).toContain(`${endpoint}: protectedProcedure`);
    }
  });
});
