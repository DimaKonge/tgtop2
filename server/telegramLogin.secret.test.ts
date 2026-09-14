import { describe, expect, it } from "vitest";
import { validateTelegramLoginClient } from "./telegramLogin";

describe("Telegram Login credentials", () => {
  const liveIt = process.env.RUN_LIVE_TELEGRAM_LOGIN_TESTS === "true" ? it : it.skip;

  liveIt("are accepted by Telegram without exposing the client secret", async () => {
    const result = await validateTelegramLoginClient();
    expect(result.acceptedClientCredentials, `Telegram rejected the client credentials: ${result.error ?? result.status}`).toBe(true);
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(500);
  }, 15_000);
});
