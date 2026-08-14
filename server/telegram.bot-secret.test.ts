import { describe, expect, it } from "vitest";

describe("Telegram bot secret", () => {
  const liveIt = process.env.RUN_LIVE_TELEGRAM_TESTS === "true" ? it : it.skip;

  liveIt("authenticates with Telegram getMe without exposing the token", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token, "TELEGRAM_BOT_TOKEN must be configured").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const payload = (await response.json()) as {
      ok?: boolean;
      result?: { username?: string };
      description?: string;
    };

    expect(response.ok, payload.description ?? "Telegram API request failed").toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.result?.username?.toLowerCase()).toBe("tgtop_robot");
  }, 15_000);
});

export {};
